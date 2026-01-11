# MSRB EMMA Market Data API (v1.0.0)

Access to Municipal Securities Rulemaking Board data regarding municipal bonds, continuing disclosures, and trade data.

```yaml
openapi: 3.1.0
info:
  title: MSRB EMMA Market Data
  description: Real-time and historical municipal security data.
  version: 1.0.0
servers:
  - url: https://api.msrb.org/emma/v1
    description: Production

paths:
  /securities/search:
    get:
      summary: Search Securities
      operationId: searchSecurities
      parameters:
        - name: q
          in: query
          required: true
          description: CUSIP-9, Issuer Name, or State
          schema:
            type: string
      responses:
        '200':
          description: List of securities
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SecurityDetail'

  /securities/{cusip}/official-statement:
    get:
      summary: Get Official Statement
      description: Returns the PDF URL for the primary offering document.
      parameters:
        - name: cusip
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Document link
          content:
            application/json:
              schema:
                type: object
                properties:
                  url: { type: string, format: uri }
                  filingDate: { type: string, format: date }

components:
  schemas:
    SecurityDetail:
      type: object
      properties:
        cusip:
          type: string
          description: 9-character CUSIP identifier
        issuerName:
          type: string
        issueDescription:
          type: string
        datedDate:
          type: string
          format: date
        maturityDate:
          type: string
          format: date
        interestRate:
          type: number
        principalAmount:
          type: number
        initialOfferingPrice:
          type: number
        status:
          type: string
          enum: ["Active", "Matured", "Called", "Pre-Refunded"]
```
