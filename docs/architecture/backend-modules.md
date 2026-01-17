# System Modular Architecture

This document outlines the logical modular architecture of The Platform's backend. While implementation details (languages/frameworks) may vary, the domain boundaries and dependencies remain consistent.

## Module Dependency Graph

```mermaid
flowchart TB
  %% =========================
  %% The Platform - Modular Suite
  %% =========================

  subgraph API["Core API"]
    MAIN["Entry Point\nRouter Registry\nSchema Generation"]
    DB["Database Connection\nSession Management"]
    MODELS["Data Models\nLedger / Rail / Vault / Mail / Claims / Notes"]
    SCHEMAS["Data Transfer Objects (DTOs)\nCreate/Out + ChartPoint + AmortRow"]
  end

  %% =========================
  %% Modules
  %% =========================

  subgraph LEDGER["Core Ledger"]
    L_ROUTER["/ledger/accounts\n/ledger/journal"]
    L_SVC["Service Layer\ncreate_account()\npost_journal_entry()\n(balance check)"]
    L_Tables["DB Tables\naccounts\njournal_entries\njournal_lines"]
  end

  subgraph VAULT["Asset Vault"]
    V_ROUTER["/vault/assets"]
    V_Tables["DB Table\nassets"]
  end

  subgraph RAIL["Settlement Rail (Bank Feed + Reconciliation)"]
    R_ROUTER["/rail/bank/import\n/rail/reconcile\n/rail/bank/txns"]
    R_SVC["Service Layer\nimport_bank_txn()\nreconcile_bank_txn_to_payable()\n(posts settlement JE)"]
    R_Tables["DB Table\nbank_transactions"]
  end

  subgraph MAIL["Certified Log"]
    M_ROUTER["/mail"]
    M_Tables["DB Table\nmail_items"]
  end

  subgraph CLAIMS["Identity Registry"]
    C_ROUTER["/claims\n/claims/{id}/claim"]
    C_Tables["DB Table\nclaim_identifiers"]
  end

  subgraph NOTES["Instruments (Issuance + Amortization)"]
    N_ROUTER["/notes\n/notes/{id}/amortization"]
    N_SVC["Service Layer\ncreate_note()\namortize()"]
    N_Tables["DB Table\nnotes"]
  end

  subgraph COMPLIANCE["Compliance Engine (Rules + Audit Packs)"]
    CO_ROUTER["/compliance/health"]
    CO_SVC["(stub)\npolicy checks\napprovals\naudit pack generator"]
  end

  subgraph CHARTS["Analytics & Dashboards"]
    CH_ROUTER["/charts/* endpoints"]
    CH_SVC["Service Layer\ncash_balance_series()\nap_balance_series()\nrail_flow_series()\nasset_value_by_category()\nnotes_principal_total()"]
  end

  %% =========================
  %% Wiring / Dependencies
  %% =========================

  MAIN --> L_ROUTER
  MAIN --> V_ROUTER
  MAIN --> R_ROUTER
  MAIN --> M_ROUTER
  MAIN --> C_ROUTER
  MAIN --> N_ROUTER
  MAIN --> CO_ROUTER
  MAIN --> CH_ROUTER

  L_ROUTER -->|Depends(get_db)| DB
  V_ROUTER -->|Depends(get_db)| DB
  R_ROUTER -->|Depends(get_db)| DB
  M_ROUTER -->|Depends(get_db)| DB
  C_ROUTER -->|Depends(get_db)| DB
  N_ROUTER -->|Depends(get_db)| DB
  CH_ROUTER -->|Depends(get_db)| DB

  DB --> MODELS
  SCHEMAS --> L_ROUTER
  SCHEMAS --> V_ROUTER
  SCHEMAS --> R_ROUTER
  SCHEMAS --> M_ROUTER
  SCHEMAS --> C_ROUTER
  SCHEMAS --> N_ROUTER

  %% =========================
  %% Ledger as System of Record
  %% =========================

  L_ROUTER --> L_SVC
  L_SVC --> L_Tables

  %% Rail writes to Ledger (settlement JE)
  R_ROUTER --> R_SVC
  R_SVC --> R_Tables
  R_SVC -->|calls post_journal_entry()| L_SVC

  %% Vault / Mail / Claims / Notes write their own tables
  V_ROUTER --> V_Tables
  M_ROUTER --> M_Tables
  C_ROUTER --> C_Tables
  N_ROUTER --> N_SVC
  N_SVC --> N_Tables

  %% Charts read across modules (Ledger + Rail + Vault + Notes)
  CH_ROUTER --> CH_SVC
  CH_SVC --> L_Tables
  CH_SVC --> R_Tables
  CH_SVC --> V_Tables
  CH_SVC --> N_Tables

  %% =========================
  %% Lifecycle Flow: Obligation -> Settlement -> Reconcile -> Charts
  %% =========================

  subgraph FLOW["Accrual Lifecycle (System Behavior)"]
    BILL["1) Create Bill JE\nDr Expense/Asset\nCr Accounts Payable"]
    BANK["2) Import Bank Txn\n(outflow/inflow mirror)"]
    SETTLE["3) Reconcile\nCreates Settlement JE\nDr A/P\nCr Cash/Bank"]
    DASH["4) Charts Update\nCash trend / A/P trend\nNet flows / Assets mix"]
  end

  BILL --> BANK --> SETTLE --> DASH
  BILL -->|/ledger/journal| L_ROUTER
  BANK -->|/rail/bank/import| R_ROUTER
  SETTLE -->|/rail/reconcile| R_ROUTER
  DASH -->|/charts/*| CH_ROUTER 
```