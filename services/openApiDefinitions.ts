
export const PARCEL_API_SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "National GIS Parcel Data Service",
    "version": "2.1.0"
  },
  "paths": {
    "/v1/parcel/search": {
      "get": {
        "summary": "Retrieve detailed parcel data via geocode or address",
        "parameters": [
          { "name": "address", "in": "query", "required": true, "schema": { "type": "string" } },
          { "name": "includeGeometry", "in": "query", "schema": { "type": "boolean" } }
        ],
        "responses": {
          "200": {
            "description": "Successful retrieval of property record",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "apn": { "type": "string", "description": "Assessor Parcel Number" },
                    "fipsCode": { "type": "string", "description": "Federal Information Processing Standards code for county" },
                    "legalDescription": { 
                      "type": "string", 
                      "description": "Full legal description including Metes and Bounds or Lot/Block" 
                    },
                    "zoning": { "type": "string" },
                    "acreage": { "type": "number" },
                    "assessedValue": { "type": "number" },
                    "ownerName": { "type": "string" },
                    "coordinates": {
                      "type": "object",
                      "properties": {
                        "lat": { "type": "number" },
                        "lon": { "type": "number" }
                      }
                    }
                  },
                  "required": ["apn", "legalDescription", "coordinates"]
                }
              }
            }
          }
        }
      }
    }
  }
};

export const EDGAR_API_SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "SEC EDGAR Data Access",
    "version": "4.0.0"
  },
  "paths": {
    "/v4/filings/query": {
      "get": {
        "summary": "Search corporate filings",
        "parameters": [
          { "name": "q", "in": "query", "required": true, "schema": { "type": "string" } },
          { "name": "forms", "in": "query", "schema": { "type": "array", "items": { "type": "string" } } }
        ],
        "responses": {
          "200": {
            "description": "List of matching filings",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "accessionNumber": { "type": "string" },
                      "cik": { "type": "string" },
                      "cusip": { "type": "string" },
                      "ticker": { "type": "string" },
                      "companyName": { "type": "string" },
                      "formType": { "type": "string" },
                      "filingDate": { "type": "string", "format": "date" },
                      "reportPeriod": { "type": "string", "format": "date" },
                      "primaryDocUrl": { "type": "string", "format": "uri" },
                      "description": { "type": "string" }
                    },
                    "required": ["accessionNumber", "cik", "companyName", "formType"]
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const MSRB_EMMA_API_SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "MSRB EMMA Market Data",
    "version": "1.0.0"
  },
  "paths": {
    "/v1/securities/search": {
      "get": {
        "summary": "Search Municipal Securities (EMMA)",
        "parameters": [
          { "name": "q", "in": "query", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "List of matching municipal securities",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "cusip": { "type": "string" },
                      "issuerName": { "type": "string" },
                      "issueDescription": { "type": "string" },
                      "datedDate": { "type": "string", "format": "date" },
                      "maturityDate": { "type": "string", "format": "date" },
                      "interestRate": { "type": "number" },
                      "principalAmount": { "type": "number" },
                      "officialStatementUrl": { "type": "string", "format": "uri" },
                      "status": { "type": "string" }
                    },
                    "required": ["cusip", "issuerName", "issueDescription"]
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const IRIS_API_SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "IRS Information Returns Intake System (IRIS)",
    "version": "1.3.0"
  },
  "paths": {
    "/v1/submissions": {
      "post": {
        "summary": "Ingest Information Return Batch",
        "description": "Submit a batch of 1099 forms for processing.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "transmitterId": { "type": "string" },
                  "softwareId": { "type": "string" },
                  "formType": { "type": "string" },
                  "filer": { 
                    "type": "object",
                    "properties": {
                        "ein": { "type": "string" },
                        "name": { "type": "string" }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Receipt Acknowledgment",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "receiptId": { "type": "string" },
                    "status": { "type": "string" },
                    "timestamp": { "type": "string" },
                    "messages": { "type": "array", "items": { "type": "string" } }
                  },
                  "required": ["receiptId", "status", "timestamp"]
                }
              }
            }
          }
        }
      }
    },
    "/v1/tin-validation": {
      "post": {
        "summary": "Interactive TIN Matching",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "tin": { "type": "string" },
                  "name": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Match Result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": { "type": "integer" },
                    "message": { "type": "string" },
                    "match": { "type": "boolean" }
                  },
                  "required": ["code", "match"]
                }
              }
            }
          }
        }
      }
    }
  }
};
