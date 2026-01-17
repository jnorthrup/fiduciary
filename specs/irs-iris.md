# IRS IRIS API (v1.3.0)

The Information Returns Intake System (IRIS) Application to Application (A2A) specifications for bulk filing of 1099 series forms.

```yaml
openapi: 3.1.0
info:
  title: IRS IRIS A2A
  description: Secure ingestion channel for Information Returns (1099, W-2, etc).
  version: 1.3.0
security:
  - TccAuth: []
  - BearerAuth: []

paths:
  /submissions:
    post:
      summary: Ingest Batch
      description: Upload a JSON or XML payload containing multiple information returns.
      operationId: submitBatch
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubmissionRequest'
      responses:
        '202':
          description: Accepted for Processing
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SubmissionReceipt'
        '400':
          description: Schema Validation Error
        '401':
          description: Invalid TCC or Certificates

  /submissions/{receiptId}/status:
    get:
      summary: Get Processing Status
      parameters:
        - name: receiptId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Current status of the batch
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchStatus'

  /tin-validation:
    post:
      summary: Interactive TIN Matching
      description: Real-time check of Name/TIN combinations.
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TinMatchRequest'
      responses:
        '200':
          description: Match Results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TinMatchResponse'

components:
  securitySchemes:
    TccAuth:
      type: apiKey
      in: header
      name: X-IRS-TCC
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    SubmissionRequest:
      type: object
      required: [transmitterId, softwareId, formType, filer]
      properties:
        transmitterId:
          type: string
          description: TCC assigned to the transmitter
        softwareId:
          type: string
        formType:
          type: string
          enum: ["1099-NEC", "1099-MISC", "1099-INT", "1099-DIV", "W-2"]
        filer:
          type: object
          properties:
            ein: { type: string }
            name: { type: string }
        payees:
          type: array
          items:
            $ref: '#/components/schemas/PayeeRecord'

    PayeeRecord:
      type: object
      properties:
        tin: { type: string }
        name: { type: string }
        address: { type: object }
        amounts:
          type: object
          additionalProperties:
            type: number

    SubmissionReceipt:
      type: object
      properties:
        receiptId: { type: string, format: uuid }
        status: { type: string, enum: ["Received", "Processing"] }
        timestamp: { type: string, format: date-time }

    BatchStatus:
      type: object
      properties:
        receiptId: { type: string }
        status: { type: string, enum: ["Accepted", "AcceptedWithErrors", "Rejected"] }
        errorCount: { type: integer }
        errors:
          type: array
          items:
            type: object
            properties:
              code: { type: string }
              message: { type: string }
              recordRef: { type: string }

    TinMatchRequest:
      type: object
      properties:
        tin: { type: string }
        name: { type: string }
        
    TinMatchResponse:
      type: object
      properties:
        code: 
          type: integer
          description: 0 = Match, 1 = Mismatch, 2 = Invalid Request
        match: { type: boolean }
```
