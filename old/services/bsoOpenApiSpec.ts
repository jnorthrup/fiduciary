/**
 * SSA Business Services Online (BSO) OpenAPI Specification
 *
 * Defines the API contract for BSO proxy endpoints
 * Used for validation and mock response generation
 */

export const BSO_API_SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "SSA Business Services Online API",
    "version": "1.0.0",
    "description": "API for SSA Business Services Online (BSO) W-2 filing and management"
  },
  "servers": [
    {
      "url": "https://www.ssa.gov/bso/ewizard2",
      "description": "Production SSA BSO server"
    },
    {
      "url": "https://www.ssa.gov/bso/ewizard2",
      "description": "Test SSA BSO server"
    }
  ],
  "paths": {
    "/v1/users/register": {
      "post": {
        "summary": "Register new BSO user",
        "description": "Step 1 of BSO enrollment: Register a new user account",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "username": { "type": "string", "minLength": 4, "maxLength": 20 },
                  "email": { "type": "string", "format": "email" },
                  "password": { "type": "string", "minLength": 8 },
                  "securityQuestions": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "question": { "type": "string" },
                        "answer": { "type": "string" }
                      },
                      "required": ["question", "answer"]
                    }
                  }
                },
                "required": ["username", "email", "password", "securityQuestions"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "User registration initiated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "userId": { "type": "string" },
                    "status": { "type": "string", "enum": ["Pending", "Active"] },
                    "activationCode": { "type": "string" }
                  },
                  "required": ["userId", "status"]
                }
              }
            }
          },
          "400": { "$ref": "#/components/responses/BadRequest" },
          "409": { "$ref": "#/components/responses/Conflict" }
        }
      }
    },

    "/v1/users/link-employer": {
      "put": {
        "summary": "Link employer to user account",
        "description": "Step 2 of BSO enrollment: Associate an employer with the user account",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "userId": { "type": "string" },
                  "ein": { "type": "string", "pattern": "^\\d{9}$" },
                  "employerName": { "type": "string", "maxLength": 57 },
                  "role": { "type": "string", "enum": ["Administrator", "Preparer", "Reporter"] }
                },
                "required": ["userId", "ein", "employerName", "role"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Employer linked successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string" },
                    "linkedEmployerId": { "type": "string" }
                  },
                  "required": ["status", "linkedEmployerId"]
                }
              }
            }
          },
          "403": { "$ref": "#/components/responses/Forbidden" },
          "404": { "$ref": "#/components/responses/NotFound" }
        }
      }
    },

    "/v1/services/provision": {
      "post": {
        "summary": "Provision BSO services for employer",
        "description": "Step 3 of BSO enrollment: Request access to W-2 filing services",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "userId": { "type": "string" },
                  "ein": { "type": "string", "pattern": "^\\d{9}$" },
                  "services": {
                    "type": "array",
                    "items": { "type": "string", "enum": ["W-2", "W-2c"] },
                    "minItems": 1
                  }
                },
                "required": ["userId", "ein", "services"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Services provisioned successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string" },
                    "provisionedServices": { "type": "array", "items": { "type": "string" } }
                  },
                  "required": ["status", "provisionedServices"]
                }
              }
            }
          },
          "403": { "$ref": "#/components/responses/Forbidden" }
        }
      }
    },

    "/v1/auth/activate": {
      "post": {
        "summary": "Activate BSO account",
        "description": "Step 4 of BSO enrollment: Activate account with activation code",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "userId": { "type": "string" },
                  "activationCode": { "type": "string", "minLength": 6 }
                },
                "required": ["userId", "activationCode"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Account activated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string", "enum": ["Active"] },
                    "token": { "type": "string" }
                  },
                  "required": ["status"]
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/Unauthorized" },
          "404": { "$ref": "#/components/responses/NotFound" }
        }
      }
    },

    "/v1/w2/submit": {
      "post": {
        "summary": "Submit W-2 EFW2 file",
        "description": "Upload and submit an EFW2 format W-2 file for processing",
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "ein": { "type": "string", "pattern": "^\\d{9}$" },
                  "taxYear": { "type": "string", "pattern": "^\\d{4}$" },
                  "file": { "type": "string", "format": "binary" },
                  "filename": { "type": "string" }
                },
                "required": ["ein", "taxYear", "file"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "W-2 file submitted successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "batchId": { "type": "string" },
                    "status": { "type": "string", "enum": ["Pending", "Processing"] }
                  },
                  "required": ["batchId", "status"]
                }
              }
            }
          },
          "400": { "$ref": "#/components/responses/BadRequest" },
          "401": { "$ref": "#/components/responses/Unauthorized" }
        }
      }
    },

    "/v1/submissions/{batchId}": {
      "get": {
        "summary": "Check submission status",
        "description": "Retrieve the current status and AccuWage validation results for a W-2 submission",
        "parameters": [
          {
            "name": "batchId",
            "in": "path",
            "required": true,
            "schema": { "type": "string" },
            "description": "The batch ID returned from the W-2 submission"
          }
        ],
        "responses": {
          "200": {
            "description": "Submission status retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "batchId": { "type": "string" },
                    "status": { "type": "string", "enum": ["Pending", "Processing", "Pass", "Errors", "Rejected"] },
                    "accuWageStatus": { "type": "string", "enum": ["Pass", "Errors", "Pending"] },
                    "submittedAt": { "type": "string", "format": "date-time" },
                    "updatedAt": { "type": "string", "format": "date-time" },
                    "errors": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "code": { "type": "string" },
                          "message": { "type": "string" },
                          "lineNumber": { "type": "number" }
                        }
                      }
                    }
                  },
                  "required": ["batchId", "status"]
                }
              }
            }
          },
          "404": { "$ref": "#/components/responses/NotFound" }
        }
      }
    },

    "/v1/notices": {
      "get": {
        "summary": "Retrieve BSO notices",
        "description": "Get EDC (Employee Decentralized Correspondence) notices from SSA",
        "parameters": [
          { "name": "ein", "in": "query", "schema": { "type": "string", "pattern": "^\\d{9}$" } },
          { "name": "category", "in": "query", "schema": { "type": "string", "enum": ["Enforcement", "Unpostable", "Informational"] } },
          { "name": "unreadOnly", "in": "query", "schema": { "type": "boolean" } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "minimum": 1, "maximum": 100 } }
        ],
        "responses": {
          "200": {
            "description": "Notices retrieved successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": { "type": "string" },
                      "category": { "type": "string", "enum": ["Enforcement", "Unpostable", "Informational"] },
                      "subject": { "type": "string" },
                      "content": { "type": "string" },
                      "date": { "type": "string", "format": "date-time" },
                      "ein": { "type": "string" },
                      "read": { "type": "boolean" },
                      "deadline": { "type": "string", "format": "date-time" }
                    },
                    "required": ["id", "category", "subject", "content", "date"]
                  }
                }
              }
            }
          },
          "401": { "$ref": "#/components/responses/Unauthorized" }
        }
      }
    },

    "/v1/errors/interpret": {
      "post": {
        "summary": "Interpret BSO error code with AI assistance",
        "description": "Get user-friendly explanation and next steps for a BSO error code",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "errorCode": { "type": "string", "pattern": "^BSO-\\d{3}$" },
                  "context": {
                    "type": "object",
                    "properties": {
                      "action": { "type": "string" },
                      "timestamp": { "type": "string", "format": "date-time" },
                      "details": { "type": "object" }
                    }
                  }
                },
                "required": ["errorCode"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Error interpretation generated successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "errorCode": { "type": "string" },
                    "explanation": { "type": "string" },
                    "nextSteps": { "type": "array", "items": { "type": "string" } },
                    "source": { "type": "string", "enum": ["ai", "fallback"] }
                  },
                  "required": ["errorCode", "explanation", "nextSteps"]
                }
              }
            }
          },
          "400": { "$ref": "#/components/responses/BadRequest" }
        }
      }
    }
  },

  "components": {
    "responses": {
      "BadRequest": {
        "description": "Bad Request - Invalid input parameters",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "error": { "type": "string" },
                "code": { "type": "string", "enum": ["BSO-101", "BSO-102", "BSO-103", "BSO-104", "BSO-105", "BSO-106"] }
              }
            }
          }
        }
      },
      "Unauthorized": {
        "description": "Unauthorized - Authentication required",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "error": { "type": "string" },
                "code": { "type": "string", "enum": ["BSO-900", "BSO-902", "BSO-903"] }
              }
            }
          }
        }
      },
      "Forbidden": {
        "description": "Forbidden - Insufficient permissions",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "error": { "type": "string" },
                "code": { "type": "string", "enum": ["BSO-403"] }
              }
            }
          }
        }
      },
      "NotFound": {
        "description": "Not Found - Resource not found",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "error": { "type": "string" },
                "code": { "type": "string", "enum": ["BSO-404"] }
              }
            }
          }
        }
      },
      "Conflict": {
        "description": "Conflict - Resource already exists",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "error": { "type": "string" },
                "code": { "type": "string" }
              }
            }
          }
        }
      }
    },

    "schemas": {
      "BSOError": {
        "type": "object",
        "properties": {
          "code": { "type": "string", "description": "BSO error code (e.g., BSO-900)" },
          "message": { "type": "string", "description": "User-friendly error message" },
          "resolution": { "type": "string", "description": "Suggested resolution steps" },
          "category": { "type": "string", "enum": ["Authentication", "Validation", "System"] }
        },
        "required": ["code", "message"]
      },

      "EFW2Submission": {
        "type": "object",
        "properties": {
          "ein": { "type": "string", "pattern": "^\\d{9}$", "description": "Employer EIN" },
          "taxYear": { "type": "string", "pattern": "^\\d{4}$", "description": "Tax year (YYYY)" },
          "fileContent": { "type": "string", "description": "EFW2 format file content" },
          "filename": { "type": "string", "description": "Upload filename" }
        },
        "required": ["ein", "taxYear", "fileContent"]
      },

      "AccuWageStatus": {
        "type": "object",
        "properties": {
          "status": { "type": "string", "enum": ["Pass", "Errors", "Pending", "Rejected"] },
          "fileId": { "type": "string" },
          "validationDate": { "type": "string", "format": "date-time" },
          "errorCount": { "type": "integer", "minimum": 0 },
          "errors": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "code": { "type": "string" },
                "message": { "type": "string" },
                "lineNumber": { "type": "integer" },
                "severity": { "type": "string", "enum": ["error", "warning"] }
              }
            }
          }
        }
      }
    }
  }
};
