# Technology Stack: Trust Ledger System

## Architecture Overview

**Client-Server Architecture** with frontend in root directory and Express backend in `/server` directory. OpenAPI 3.1 specification defines the API contract with generated TypeScript client stubs.

---

## Frontend

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.3 | UI framework |
| **TypeScript** | 5.8.2 | Type safety and developer experience |
| **Vite** | 6.2.0 | Build tool and dev server |

### UI Libraries
| Technology | Version | Purpose |
|------------|---------|---------|
| **D3.js** | 7.8.5 | Data visualization and entity relationship graphs |
| **Mermaid** | 10.6.1 | Diagram rendering (flowcharts, sequence diagrams) |
| **Lucide React** | 0.561.0 | Icon system |

### Document Processing
| Technology | Version | Purpose |
|------------|---------|---------|
| **Mammoth** | 1.6.0 | DOCX document parsing and conversion |
| **XLSX** | 0.18.5 | Excel spreadsheet import/export |

---

## Backend

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | (via nvm) | JavaScript runtime |
| **Express** | 5.2.1 | Web server and API framework |
| **TypeScript** | 5.9.3 | Type safety for backend code |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| **DuckDB** | (@duckdb/node-api) 1.4.3-r.3 | Analytical database with CouchDB-compatible API layer |

### AI Integration
| Technology | Version | Purpose |
|------------|---------|---------|
| **Google Generative AI SDK** | (@google/genai) 1.34.0 | AI-powered document analysis and insights |

### Development
| Technology | Version | Purpose |
|------------|---------|---------|
| **ts-node-dev** | 2.0.0 | Hot-reloading TypeScript dev server |
| **CORS** | 2.8.5 | Cross-origin resource sharing |
| **dotenv** | 17.2.3 | Environment configuration |

---

## API & Code Generation

| Technology | Version | Purpose |
|------------|---------|---------|
| **OpenAPI** | 3.1 | API specification format |
| **@hey-api/openapi-ts** | 0.90.2 | Generate TypeScript client stubs from OpenAPI spec |

---

## Data Flow

```
┌─────────────────┐     OpenAPI 3.1     ┌─────────────────┐
│   React App     │ ◄─────────────────► │   Express API   │
│  (TypeScript)   │   Generated Types   │  (TypeScript)   │
└─────────────────┘                     └────────┬────────┘
                                                │
                                                ▼
                                        ┌─────────────────┐
                                        │     DuckDB      │
                                        │  (CouchDB API)  │
                                        └─────────────────┘
```

## Development Commands

### Frontend (root directory)
```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend (/server directory)
```bash
npm run dev      # Start ts-node-dev with hot reload
npm run start    # Start production server
npm run test     # Run tests (not yet configured)
```

## Technology Rationale

### Why React + TypeScript
- Industry standard for complex data-driven applications
- TypeScript catches errors at compile time, critical for financial/legal applications
- Large ecosystem of visualization libraries (D3, Mermaid)

### Why DuckDB
- High-performance analytical database
- In-process SQL engine eliminates network overhead
- CouchDB-compatible API layer provides document-oriented operations alongside SQL queries

### Why Google Generative AI
- Enterprise-grade AI with clear compliance documentation
- Suitable for document analysis and legal compliance applications
- Stable API with TypeScript support

### Why OpenAPI 3.1
- Standard API specification enables type-safe frontend-backend contract
- Generated client stubs reduce boilerplate and ensure API consistency
- Supports multiple frontend implementations if needed

## Future Considerations

- **Authentication**: OAuth 2.0 / JWT tokens for API security
- **Testing**: Vitest for frontend, Jest/Mocha for backend
- **CI/CD**: GitHub Actions or similar for automated testing and deployment
- **Monitoring**: Error tracking (Sentry) and performance monitoring
- **Database Scaling**: Consider PostgreSQL for transactional workloads if DuckDB limitations are reached
