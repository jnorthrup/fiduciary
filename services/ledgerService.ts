import { useState, useEffect, useCallback } from 'react';
import { Entity, Account, TaxModule, JournalEntry, JournalLine, DCFlag, Contractor, ComplianceFiling, WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, PayrollRun, IRMDocument, EntityType, EntityRole, EntityModelData, TransmissionLog, SystemStatus, SearchResult, IRSFormType } from '../types';
import { SEED_ENTITIES, SEED_ACCOUNTS, SEED_MODULES, SEED_CONTRACTORS, SEED_FILINGS, SEED_WALLETS, SEED_BSO_ROLES, SEED_BSO_SUBMISSIONS, SEED_IRS_CREDS, SEED_EMPLOYEES, SEED_PAYROLL_RUNS, SEED_DOCUMENTS } from './mockData';
import { simulateTransmission, getSystemStatus, searchIRSManual } from './irsApiService';
import { v4 as uuidv4 } from 'uuid';

// In-memory store hook simulation
export const useLedgerStore = () => {
  const [entities, setEntities] = useState<Entity[]>(SEED_ENTITIES);
  const [accounts, setAccounts] = useState<Account[]>(SEED_ACCOUNTS);
  const [modules] = useState<TaxModule[]>(SEED_MODULES);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [contractors] = useState<Contractor[]>(SEED_CONTRACTORS);
  const [filings, setFilings] = useState<ComplianceFiling[]>(SEED_FILINGS);
  const [wallets] = useState<WalletCredential[]>(SEED_WALLETS);
  const [documents, setDocuments] = useState<IRMDocument[]>(SEED_DOCUMENTS);
  
  // New State for BSO/IRS
  const [bsoRoles] = useState<BSORole[]>(SEED_BSO_ROLES);
  const [bsoSubmissions] = useState<BSOSubmission[]>(SEED_BSO_SUBMISSIONS);
  const [irsCreds] = useState<IRSAPICredential[]>(SEED_IRS_CREDS);

  // New State for API Integration
  const [transmissions, setTransmissions] = useState<TransmissionLog[]>([]);
  const [apiSystemStatus, setApiSystemStatus] = useState<SystemStatus[]>(getSystemStatus());
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // New State for HR
  const [employees] = useState<Employee[]>(SEED_EMPLOYEES);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(SEED_PAYROLL_RUNS);

  // Helper to post a journal
  const postJournal = useCallback((
    entityId: string, 
    date: string, 
    memo: string, 
    type: string,
    rawLines: { accountCode: string; dc: DCFlag; amount: number; moduleId?: string }[]
  ) => {
    
    // 1. Create Journal Lines with full Account details
    const lines: JournalLine[] = rawLines.map(line => {
      const acct = accounts.find(a => a.code === line.accountCode && a.entityId === entityId);
      if (!acct) throw new Error(`Account code ${line.accountCode} not found for entity ${entityId}`);
      
      return {
        id: uuidv4(),
        accountId: acct.id,
        accountCode: acct.code,
        accountName: acct.name,
        dc: line.dc,
        amount: line.amount,
        moduleId: line.moduleId
      };
    });

    // 2. Validate Balance
    const debits = lines.filter(l => l.dc === DCFlag.Debit).reduce((sum, l) => sum + l.amount, 0);
    const credits = lines.filter(l => l.dc === DCFlag.Credit).reduce((sum, l) => sum + l.amount, 0);
    
    if (Math.abs(debits - credits) > 0.01) {
      throw new Error(`Journal unbalanced: Dr ${debits.toFixed(2)} != Cr ${credits.toFixed(2)}`);
    }

    // 3. Create Entry
    const newJournal: JournalEntry = {
      id: uuidv4(),
      entityId,
      date,
      memo,
      type,
      lines,
      locked: true
    };

    // 4. Update Account Balances (Naive implementation for UI feedback)
    setAccounts(prev => prev.map(acc => {
      const relevantLines = lines.filter(l => l.accountId === acc.id);
      if (relevantLines.length === 0) return acc;
      
      let balanceChange = 0;
      relevantLines.forEach(l => {
        if (acc.normalBalance === DCFlag.Debit) {
          balanceChange += l.dc === DCFlag.Debit ? l.amount : -l.amount;
        } else {
          balanceChange += l.dc === DCFlag.Credit ? l.amount : -l.amount;
        }
      });

      return { ...acc, balance: acc.balance + balanceChange };
    }));

    setJournals(prev => [newJournal, ...prev]);
    return newJournal;
  }, [accounts]);

  // HR: Run Payroll logic
  const runPayroll = useCallback((entityId: string, periodStart: string, periodEnd: string, payDate: string, moduleId: string) => {
    // 1. Calculate totals for active employees in entity
    const activeEmps = employees.filter(e => e.entityId === entityId && e.status === 'Active');
    
    // Simplified Calculation logic (assuming bi-weekly)
    const totalGross = activeEmps.reduce((sum, e) => sum + (e.salary / 26), 0);
    const employerTaxRate = 0.0765; // FICA
    const totalEmployerTax = totalGross * employerTaxRate;
    const employeeTaxWithholding = totalGross * 0.20; // Est 20% withholding
    const totalNetPay = totalGross - employeeTaxWithholding;
    const totalLiabilities = totalEmployerTax + employeeTaxWithholding;

    // 2. Post Journal Entry
    
    const journal = postJournal(entityId, payDate, `Payroll Run ${periodEnd}`, 'DISBURSEMENT', [
      { accountCode: '530000', dc: DCFlag.Debit, amount: parseFloat(totalGross.toFixed(2)), moduleId },
      { accountCode: '530100', dc: DCFlag.Debit, amount: parseFloat(totalEmployerTax.toFixed(2)), moduleId },
      { accountCode: '220000', dc: DCFlag.Credit, amount: parseFloat(totalLiabilities.toFixed(2)), moduleId },
      { accountCode: '101000', dc: DCFlag.Credit, amount: parseFloat(totalNetPay.toFixed(2)) }
    ]);

    // 3. Create Payroll Record
    const newRun: PayrollRun = {
      id: uuidv4(),
      entityId,
      periodStart,
      periodEnd,
      payDate,
      totalGross: parseFloat(totalGross.toFixed(2)),
      totalEmployerTax: parseFloat(totalEmployerTax.toFixed(2)),
      totalNetPay: parseFloat(totalNetPay.toFixed(2)),
      status: 'Posted',
      journalId: journal.id
    };

    setPayrollRuns(prev => [newRun, ...prev]);
    return newRun;
  }, [employees, postJournal]);

  const updateFilingStatus = useCallback((filingId: string, status: ComplianceFiling['status'], date?: string, submissionId?: string) => {
    setFilings(prev => prev.map(f => {
      if (f.id === filingId) {
        return { ...f, status, filingDate: date || f.filingDate, submissionId: submissionId || f.submissionId };
      }
      return f;
    }));
  }, []);

  const createFiling = useCallback((entityId: string, formType: ComplianceFiling['formType']) => {
    const newFiling: ComplianceFiling = {
      id: uuidv4(),
      entityId,
      formType,
      status: 'Drafted',
      notes: `New ${formType} started`
    };
    setFilings(prev => [...prev, newFiling]);
  }, []);

  // API Submission Logic
  const submitFilingViaAPI = useCallback(async (filingId: string) => {
    const filing = filings.find(f => f.id === filingId);
    const entity = entities.find(e => e.id === filing?.entityId);
    
    if (!filing || !entity) return;

    // Trigger API call
    const log = await simulateTransmission(entity, filing.formType);
    
    setTransmissions(prev => [log, ...prev]);

    // Update filing status based on API result
    if (log.status === 'Accepted') {
      updateFilingStatus(filingId, 'Accepted', new Date().toISOString().split('T')[0], log.submissionId);
    } else {
      updateFilingStatus(filingId, 'Rejected');
    }
  }, [filings, entities, updateFilingStatus]);

  const performGroundingSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    const results = await searchIRSManual(query);
    setSearchResults(results);
    setIsSearching(false);
  }, []);

  // IRM: File All & Generate PDFs
  const fileAllDrafts = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const newDocs: IRMDocument[] = [];

    setFilings(prev => {
      return prev.map(f => {
        if (f.status === 'Drafted') {
          // Generate Document
          newDocs.push({
            id: uuidv4(),
            entityId: f.entityId,
            taxYear: 2025, // Assuming current context year
            formType: f.formType,
            fileName: `Form${f.formType}_${f.entityId.split('-')[1]}_2025_FINAL.pdf`,
            generatedDate: today,
            status: 'Submitted',
            size: `${Math.floor(Math.random() * 200 + 50)} KB`,
            category: 'Compliance',
            campusDestination: 'Ogden, UT'
          });
          // Update Status
          return { ...f, status: 'Filed', filingDate: today };
        }
        return f;
      });
    });

    setDocuments(prev => [...prev, ...newDocs]);
  }, []);

  // --- ENTITY CRUD & MODELING ---

  const addEntity = useCallback((parentId: string, type: EntityType, role: EntityRole) => {
    const newEnt: Entity = {
      id: `ENT-${Math.floor(Math.random() * 10000)}`,
      name: "New Entity",
      type,
      role,
      parentEntityId: parentId,
      regionCode: 'OSC',
      modelData: {
        vizType: 'D3_SERIES',
        timeSeries: [],
      }
    };
    setEntities(prev => [...prev, newEnt]);
    return newEnt;
  }, []);

  const updateEntity = useCallback((id: string, updates: Partial<Entity>) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteEntity = useCallback((id: string) => {
    setEntities(prev => prev.filter(e => e.id !== id && e.parentEntityId !== id));
  }, []);

  const generateModelData = useCallback((id: string) => {
    setEntities(prev => prev.map(e => {
      if (e.id !== id) return e;

      // Generative Time Series Logic
      const points = [];
      const now = new Date();
      let val = Math.random() * 50000 + 10000;
      
      for (let i = -6; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        val = val * (1 + (Math.random() * 0.2 - 0.05)); // +/- 5% to 15% growth/volatility
        points.push({
          date: d.toISOString().split('T')[0],
          value: val,
          projected: i > 0
        });
      }

      // Default Mermaid Definition
      const mermaidDef = `
        graph TD
          A[Capital Source] -->|Funding| B(${e.name})
          B -->|Expenses| C[Operations]
          B -->|Distributions| D[Beneficiaries]
          style B fill:#f9f,stroke:#333,stroke-width:2px
      `;

      return {
        ...e,
        modelData: {
          ...e.modelData,
          vizType: e.modelData?.vizType || 'D3_SERIES',
          timeSeries: points,
          definition: mermaidDef,
          lastGenerated: new Date().toISOString()
        } as EntityModelData
      };
    }));
  }, []);

  const linkDocument = useCallback((docId: string, type: 'Journal' | 'Account', targetId: string) => {
    setDocuments(prev => prev.map(d => {
        if (d.id !== docId) return d;
        if (type === 'Journal') {
            const existing = d.relatedJournalIds || [];
            if (!existing.includes(targetId)) return { ...d, relatedJournalIds: [...existing, targetId] };
        }
        if (type === 'Account') {
            const existing = d.relatedAccountIds || [];
            if (!existing.includes(targetId)) return { ...d, relatedAccountIds: [...existing, targetId] };
        }
        return d;
    }));
  }, []);

  return {
    entities,
    accounts,
    modules,
    journals,
    contractors,
    filings,
    wallets,
    bsoRoles,
    bsoSubmissions,
    irsCreds,
    employees,
    payrollRuns,
    documents,
    transmissions,
    apiSystemStatus,
    searchResults,
    isSearching,
    postJournal,
    runPayroll,
    updateFilingStatus,
    createFiling,
    fileAllDrafts,
    submitFilingViaAPI,
    performGroundingSearch,
    // CRUD
    addEntity,
    updateEntity,
    deleteEntity,
    generateModelData,
    // Linking
    linkDocument
  };
};