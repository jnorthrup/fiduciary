# OC10 Ledger Protocol API (v1.0)

Internal private ledger API for immutable anchoring of restrictive endorsements and instrument history.

```yaml
openapi: 3.1.0
info:
  title: OC10 Ledger Protocol
  description: Object Class 10 Distributed Ledger Shard Interface.
  version: 1.0.0
servers:
  - url: https://node.oc10.private
    description: Internal Shard

paths:
  /anchors:
    post:
      summary: Create Anchor
      description: Hashes a document or transaction and anchors it to the ledger.
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                payload: { type: string, description: "Raw content or Hash" }
                metadata: { type: object }
      responses:
        '201':
          description: Anchored
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnchorReceipt'

  /anchors/{hash}:
    get:
      summary: Verify Anchor
      parameters:
        - name: hash
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Verification Proof
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnchorProof'

components:
  schemas:
    AnchorReceipt:
      type: object
      properties:
        anchorId: { type: string }
        hash: { type: string }
        shardNode: { type: string }
        timestamp: { type: string, format: date-time }
        verificationStatus: { type: string, enum: ["Anchored", "Pending"] }

    AnchorProof:
      type: object
      properties:
        exists: { type: boolean }
        blockHeight: { type: integer }
        merkleRoot: { type: string }
        timestamp: { type: string, format: date-time }
```
