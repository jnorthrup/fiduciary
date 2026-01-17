# FedLine Gateway API (v5.0.0)

Interface for Federal Reserve Financial Services (FRFS) payment rails including Fedwire Funds Service and FedNow Service.

```yaml
openapi: 3.1.0
info:
  title: FedLine Gateway
  description: API for high-value wire transfers and instant payments via ISO 20022.
  version: 5.0.0
servers:
  - url: https://api.frb.org/fedline/v5
    description: Secure Transport Node

paths:
  /wires/originate:
    post:
      summary: Send Fedwire Funds
      operationId: originateWire
      description: Initiates an irrevocable RTGS transfer. Maps to ISO 20022 pacs.008.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WireInstruction'
      responses:
        '201':
          description: Wire Accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WireReceipt'

  /fednow/transfer:
    post:
      summary: Send FedNow Instant Payment
      description: 24/7/365 instant settlement.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InstantPaymentInstruction'
      responses:
        '200':
          description: Settlement Complete
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WireReceipt'

  /messages/{imad}:
    get:
      summary: Retrieve Message Status
      parameters:
        - name: imad
          in: path
          required: true
          schema:
            type: string
            description: Input Message Accountability Data (22 chars)
      responses:
        '200':
          description: Message Audit Trail
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MessageAudit'

components:
  schemas:
    WireInstruction:
      type: object
      required: [amount, beneficiary, odfi, rdfi]
      properties:
        amount:
          type: number
          format: double
        currency:
          type: string
          default: "USD"
        odfi:
          $ref: '#/components/schemas/RoutingData'
        rdfi:
          $ref: '#/components/schemas/RoutingData'
        beneficiary:
          type: object
          properties:
            name: { type: string }
            account: { type: string }
            address: { type: string }
        originator:
          type: object
          properties:
            name: { type: string }
            account: { type: string }
        obi:
          type: string
          description: Originator to Beneficiary Information (Memo)

    InstantPaymentInstruction:
      allOf:
        - $ref: '#/components/schemas/WireInstruction'
        - type: object
          properties:
            endToEndId: { type: string }

    WireReceipt:
      type: object
      properties:
        imad:
          type: string
          description: YYYYMMDDAAAABBBBB00000
        omad:
          type: string
          description: Output Message Accountability Data
        timestamp:
          type: string
          format: date-time
        status:
          type: string
          enum: ["PROCESSED", "PENDING", "REJECTED"]

    RoutingData:
      type: object
      properties:
        aba:
          type: string
          pattern: '^\d{9}$'
        name: { type: string }

    MessageAudit:
      type: object
      properties:
        status: { type: string }
        history:
          type: array
          items:
            type: object
            properties:
              stage: { type: string }
              timestamp: { type: string, format: date-time }
```
