# National GIS Parcel Data Service API (v2.1.0)

This API provides normalized access to county assessor data, spatial boundaries, and zoning regulations across the United States.

```yaml
openapi: 3.1.0
info:
  title: National GIS Parcel Data Service
  description: Gateway for retrieving property assessment data, legal descriptions, and geospatial boundaries.
  version: 2.1.0
  contact:
    name: API Support
    email: support@national-gis.gov
servers:
  - url: https://api.national-gis.gov/v2
    description: Production Server
  - url: https://sandbox.national-gis.gov/v2
    description: Sandbox Server

paths:
  /parcel/search:
    get:
      summary: Search Parcels
      description: Retrieve parcel records based on address, geocode, or APN.
      operationId: searchParcels
      parameters:
        - name: address
          in: query
          description: Standardized street address
          schema:
            type: string
        - name: lat
          in: query
          schema:
            type: number
        - name: lon
          in: query
          schema:
            type: number
        - name: includeGeometry
          in: query
          description: Whether to return full GeoJSON boundaries
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: Successful search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ParcelResponse'
        '404':
          description: No parcel found at location

  /parcel/{apn}:
    get:
      summary: Get Parcel by APN
      description: Direct retrieval of a specific tax parcel by Assessor Parcel Number and FIPS code.
      parameters:
        - name: apn
          in: path
          required: true
          schema:
            type: string
        - name: fips
          in: query
          required: true
          description: 5-digit County FIPS code
          schema:
            type: string
      responses:
        '200':
          description: Parcel details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ParcelRecord'

components:
  schemas:
    ParcelResponse:
      type: object
      properties:
        totalResults:
          type: integer
        results:
          type: array
          items:
            $ref: '#/components/schemas/ParcelRecord'

    ParcelRecord:
      type: object
      required: [apn, fipsCode, coordinates]
      properties:
        apn:
          type: string
          description: Assessor Parcel Number (formatted)
        fipsCode:
          type: string
          pattern: '^\d{5}$'
        ownerName:
          type: ["string", "null"]
        address:
          type: string
        legalDescription:
          type: string
          description: Metes and bounds or Lot/Block legal text.
        zoning:
          type: string
          example: "R-1"
        landUseCode:
          type: string
          example: "1001"
        acreage:
          type: number
          format: double
        assessedValue:
          type: object
          properties:
            total: { type: number }
            land: { type: number }
            improvement: { type: number }
            year: { type: integer }
        coordinates:
          type: object
          properties:
            lat: { type: number }
            lon: { type: number }
        geometry:
          description: GeoJSON Polygon of property lines
          type: object 
```
