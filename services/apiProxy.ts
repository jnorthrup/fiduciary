
import { GoogleGenAI, Type } from "@google/genai";

/**
 * The API Proxy acts as a middleware between the Frontend calls and the "Real World".
 * Since we don't have a Node backend with specific scrapers, we use Gemini 3 
 * with Google Search as the "Universal Adapter" to fulfill the OpenAPI Contract.
 */
export class ApiProxy {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Executes a simulated HTTP Request that is fulfilled by the AI Agent
   * strictly adhering to the provided OpenAPI definition.
   */
  async request(
    spec: any, 
    path: string, 
    method: 'get' | 'post', 
    params: Record<string, any>
  ): Promise<any> {
    
    // 1. Extract the Schema for the expected response
    const endpointDef = spec.paths[path]?.[method];
    if (!endpointDef) throw new Error(`404: Endpoint ${method.toUpperCase()} ${path} not found in spec.`);

    const successSchema = endpointDef.responses["200"]?.content?.["application/json"]?.schema;
    if (!successSchema) throw new Error("500: Invalid OpenAPI Spec definition for 200 OK.");

    // 2. Construct the "Backend Logic" Prompt
    const prompt = `
      ACT AS A REST API SERVER.
      
      API SPECIFICATION:
      ${JSON.stringify(endpointDef)}

      REQUEST:
      ${method.toUpperCase()} ${path}
      Params: ${JSON.stringify(params)}

      INSTRUCTIONS:
      1. You are the backend implementation for this API.
      2. Use the 'googleSearch' tool to find the REAL-WORLD data requested. Do not hallucinate.
      3. If the user asks for a specific address or company, find the actual records.
      4. RETURN ONLY JSON matching the 'schema' defined in the 200 response of the API Spec.
      5. Strictly adhere to property names and types.
      6. CRITICAL: Limit any arrays in the response to a maximum of 5 items. This is to prevent JSON truncation and ensuring a valid response.
    `;

    // 3. Convert OpenAPI Schema to Gemini Type Schema (recursive mapping)
    // Note: For this demo, we assume the schemas in openApiDefinitions.ts are compatible 
    // or we map them dynamically. For simplicity/robustness, we pass the raw schema 
    // structure to Gemini via the system prompt and ask for JSON, then parse it. 
    // However, using responseSchema is safer for structure.
    
    const geminiSchema = this.mapOpenApiToGemini(successSchema);

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Use Pro for complex reasoning/search
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: geminiSchema
        }
      });

      const rawText = response.text;
      if (!rawText) throw new Error("500: Empty response from API backend.");
      
      return JSON.parse(rawText);

    } catch (e: any) {
      console.error("API Proxy Error:", e);
      throw new Error(`502: Bad Gateway - ${e.message}`);
    }
  }

  // Helper to map standard OpenAPI types to GoogleGenAI types
  private mapOpenApiToGemini(schema: any): any {
    if (schema.type === 'array') {
      return {
        type: Type.ARRAY,
        items: this.mapOpenApiToGemini(schema.items)
      };
    } else if (schema.type === 'object') {
      const properties: any = {};
      for (const key in schema.properties) {
        properties[key] = this.mapOpenApiToGemini(schema.properties[key]);
      }
      return {
        type: Type.OBJECT,
        properties,
        required: schema.required
      };
    } else {
      // Primitives
      switch (schema.type) {
        case 'string': return { type: Type.STRING };
        case 'number': return { type: Type.NUMBER };
        case 'integer': return { type: Type.INTEGER };
        case 'boolean': return { type: Type.BOOLEAN };
        default: return { type: Type.STRING };
      }
    }
  }
}

export const api = new ApiProxy();
