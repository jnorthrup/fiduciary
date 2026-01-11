import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
import { query } from './db';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || '' });

export async function generateStrategy(entity: any, accounts: any[], journals: any[], jurisdictions: string[]) {
    // 1. Fetch Provenance Context from DB
    const jurisdictionsParams = jurisdictions.map(() => '?').join(',');
    const citations = await query(`
    SELECT DISTINCT c.* FROM citations c
    JOIN jurisdictions j ON c.id = j.citation_id
    WHERE j.jurisdiction_name IN (${jurisdictionsParams})
  `, jurisdictions);

    const provenanceContextResults = [];
    for (const c of citations) {
        const effects = await query('SELECT * FROM rule_effects WHERE citation_id = ?', [c.id]);
        provenanceContextResults.push(`[${c.id}] ${c.code}: ${c.title}\n  Summary: ${c.summary}\n  Effects: ${effects.map((e: any) => `${e.operation}(${e.constraint_type})`).join(', ')}`);
    }
    const provenanceContext = provenanceContextResults.join('\n\n');

    // 2. Build Prompt
    const prompt = `You are an elite Fiduciary Tax Strategist for the Trust Ledger System.
        
=== LEGAL PROVENANCE CONTEXT ===
The following legal citations are applicable to this entity's jurisdictions (${jurisdictions.join(', ')}).
You MUST cite from these when providing strategies:

${provenanceContext}

=== ENTITY CONTEXT ===
Entity: ${entity.name} (${entity.type}, Role: ${entity.role})
Trust SubType: ${entity.trustSubType || 'N/A'}
Accounts: ${JSON.stringify(accounts.map(a => ({ name: a.name, balance: a.balance, type: a.type })))}
Recent Journals: ${JSON.stringify(journals.slice(0, 10).map(j => ({ memo: j.memo, date: j.date })))}

=== INSTRUCTIONS ===
Provide 3-4 concrete, highly specific tax optimization strategies for the current fiscal year.
Focus on Distributable Net Income (DNI) allocation, asset valuation adjustments, Section 643(g) elections if applicable, and expense acceleration/deferral.

CRITICAL: Each strategy MUST include a "legalBasis" array containing citation IDs from the provenance context above (e.g., ["USC_31_3325", "CFR_26_1_671"]).
Only cite laws that are directly relevant to the strategy.

Return ONLY a JSON array of objects with the following keys:
title, impact, actionStep, reasoning, priority ('High'|'Medium'|'Low'), legalBasis (array of citation IDs).`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Adjusted to a verified model name or use user's gemini-3-pro-preview
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        impact: { type: Type.STRING },
                        actionStep: { type: Type.STRING },
                        reasoning: { type: Type.STRING },
                        priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                        legalBasis: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "impact", "actionStep", "reasoning", "priority", "legalBasis"]
                }
            }
        }
    });

    if (!response.text) {
        throw new Error('AI response did not contain text');
    }

    return JSON.parse(response.text);
}
