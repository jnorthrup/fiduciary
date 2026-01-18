# SEC EDGAR Data Access API (v4.0.0)

Provides programmatic access to the Electronic Data Gathering, Analysis, and Retrieval system.

```yaml
openapi: 3.1.0
info:
  title: SEC EDGAR Data Access
  description: JSON-formatted access to company filings, XBRL data, and full-text search.
  version: 4.0.0
  termsOfService: https://www.sec.gov/privacy
servers:
  - url: https://data.sec.gov
    description: Public Data API

paths:
  /v4/filings/query:
    get:
      summary: Search Filings
      operationId: queryFilings
      parameters:
        - name: q
          in: query
          required: true
          description: Lucene query string (supports CIK, Ticker, Company Name, CUSIP)
          schema:
            type: string
        - name: forms
          in: query
          description: Filter by form types
          schema:
            type: array
            items:
              type: string
              enum: ["10-K", "10-Q", "8-K", "S-1", "424B2", "SC 13D", "N-PORT"]
        - name: from
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: List of matching filings
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/FilingSummary'

  /v4/company/{cik}:
    get:
      summary: Get Company Facts
      description: Returns all XBRL facts for a specific company.
      parameters:
        - name: cik
          in: path
          required: true
          schema:
            type: string
            pattern: '^\d{10}$'
      responses:
        '200':
          description: Company facts
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CompanyFacts'

components:
  schemas:
    FilingSummary:
      type: object
      properties:
        accessionNumber:
          type: string
          description: Unique identifier for the filing.
        cik:
          type: string
        ticker:
          type: ["string", "null"]
        companyName:
          type: string
        formType:
          type: string
        filingDate:
          type: string
          format: date
        reportPeriod:
          type: string
          format: date
        primaryDocUrl:
          type: string
          format: uri
        description:
          type: string
        items:
          type: array
          description: 8-K Items reported (e.g. "1.01", "2.01")
          items:
            type: string

    CompanyFacts:
      type: object
      properties:
        cik: { type: string }
        entityName: { type: string }
        facts:
          type: object
          description: Map of US-GAAP taxonomies to fact arrays.
```
