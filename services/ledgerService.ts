
import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Entity, Account, JournalEntry, User, ComplianceFiling, TaxModule, 
  EntityType, EntityRole, AccountType, DCFlag, UserRole,
  PayrollRun, Employee, IntrusionRecord, WalletCredential,
  BSORole, BSOSubmission, IRSAPICredential, IRMDocument,
  TransmissionLog, SystemStatus, SearchResult, ComplianceViolation,
  CreditDefenseRecord, ChanceryFiling, PerfectionInstruction,
  InstrumentExchangeRecord, DTCCPledgeRecord, EscrowAccount,
  TicklerRecord, FedwireRecord, CanalRecord, MaradRecord,
  AccordRecord, PrivateAdminRecord, ResolutionRecord,
  FiduciaryAction, FiduciaryVote, FiduciaryReview,
  ReSitusRecord, TrustCertificate, Indenture,
  ParcelRecord, EdgarResearchRecord, CRMPerson, Interaction,
  ACHRecord, SSAStatement, ChangeSet, ApiSecrets, SystemSettings,
  TrustSubType, EntityGraph, LSMStore
} from '../types';
import { SEED_ENTITIES, SEED_ACCOUNTS, SEED_JOURNALS, SEED_MODULES, SEED_FILINGS } from './mockData';
import { searchIRSManual, getSystemStatus, simulateTransmission } from './irsApiService';

// --- INITIAL STATE CONSTANTS ---

const INITIAL_USER: User = {
  id: 'USR-GUEST',
  name: '',
  email: '',
  role: 'Viewer',
  avatarInitials: '??',
  lastActive: 'Never',
  _version: '0'
};

const INITIAL_SETTINGS: SystemSettings = {
    fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Fast' },
    network: 'Local'
};

const INITIAL_SECRETS: ApiSecrets = {
    irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: ''
};

// --- HELPER FUNCTIONS ---

const initializeGraph = (entities: Entity[]): EntityGraph => {
    const nodeMap: Record<string, Entity> = {};
    const adjacencyList: Record<string, string[]> = {};
    const roots: string[] = [];

    entities.forEach(e => {
        nodeMap[e.id] = e;
        if (e.parentEntityId) {
            if (!adjacencyList[e.parentEntityId]) adjacencyList[e.parentEntityId] = [];
            adjacencyList[e.parentEntityId].push(e.id);
        } else {
            roots.push(e.id);
        }
    });

    return { nodeMap, adjacencyList, roots };
};

const initializeLSM = (journals: JournalEntry[]): LSMStore => {
    // Simplified LSM: Just put everything in L0 sorted by date for now
    const sorted = [...journals].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
        memTable: [],
        l0: sorted,
        l1: []
    };
};

// --- CONTEXT & REDUCER ---

interface LedgerState {
  currentUser: User;
  users: User[];
  entities: Entity[];
  accounts: Account[];
  journals: JournalEntry[];
  modules: TaxModule[];
  filings: ComplianceFiling[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  intrusions: IntrusionRecord[];
  wallets: WalletCredential[];
  documents: IRMDocument[];
  transmissions: TransmissionLog[];
  achRecords: ACHRecord[];
  crmPeople: CRMPerson[];
  fedWires: FedwireRecord[];
  ticks: TicklerRecord[];
  escrows: EscrowAccount[];
  fiduciaryReviews: FiduciaryReview[];
  dtccRecords: DTCCPledgeRecord[];
  resolutions: ResolutionRecord[];
  bsoRoles: BSORole[];
  submissions: BSOSubmission[];
  irsCreds: IRSAPICredential[];
  ssaStatements: SSAStatement[];
  canalRecords: CanalRecord[];
  maradRecords: MaradRecord[];
  chanceryFilings: ChanceryFiling[];
  perfections: PerfectionInstruction[];
  creditDefenseRecords: CreditDefenseRecord[];
  accords: AccordRecord[];
  privateAdminRecords: PrivateAdminRecord[];
  reSitusRecords: ReSitusRecord[];
  instrumentExchanges: InstrumentExchangeRecord[];
  edgarRecords: EdgarResearchRecord[];
  parcels: ParcelRecord[];
  
  // Settings & Sys
  settings: SystemSettings;
  secrets: ApiSecrets;
  activeViolation: ComplianceViolation | null;
  apiSystemStatus: SystemStatus[];
  searchResults: SearchResult[];
  isSearching: boolean;
  
  // Graph & LSM
  entityGraph: EntityGraph;
  lsmStore: LSMStore;
  
  // Meta
  source: 'Persistence' | 'Simulation';
  canResume: boolean;
  schemaHash: string;
  changeGraph: ChangeSet[];
}

type Action = 
  | { type: 'SET_STATE'; payload: Partial<LedgerState> }
  | { type: 'ADD_ENTITY'; payload: Entity }
  | { type: 'UPDATE_ENTITY'; payload: { id: string, updates: Partial<Entity> } }
  | { type: 'DELETE_ENTITY'; payload: string }
  | { type: 'POST_JOURNAL'; payload: JournalEntry }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'SET_VIOLATION'; payload: ComplianceViolation | null }
  ;

const initialState: LedgerState = {
  currentUser: INITIAL_USER,
  users: [INITIAL_USER],
  entities: [],
  accounts: [],
  journals: [],
  modules: [],
  filings: [],
  employees: [],
  payrollRuns: [],
  intrusions: [],
  wallets: [],
  documents: [],
  transmissions: [],
  achRecords: [],
  crmPeople: [],
  fedWires: [],
  ticks: [],
  escrows: [],
  fiduciaryReviews: [],
  dtccRecords: [],
  resolutions: [],
  bsoRoles: [],
  submissions: [],
  irsCreds: [],
  ssaStatements: [],
  canalRecords: [],
  maradRecords: [],
  chanceryFilings: [],
  perfections: [],
  creditDefenseRecords: [],
  accords: [],
  privateAdminRecords: [],
  reSitusRecords: [],
  instrumentExchanges: [],
  edgarRecords: [],
  parcels: [],
  settings: INITIAL_SETTINGS,
  secrets: INITIAL_SECRETS,
  activeViolation: null,
  apiSystemStatus: getSystemStatus(),
  searchResults: [],
  isSearching: false,
  entityGraph: { nodeMap: {}, adjacencyList: {}, roots: [] },
  lsmStore: { memTable: [], l0: [], l1: [] },
  source: 'Persistence',
  canResume: false,
  schemaHash: 'v1.0.0',
  changeGraph: []
};

const reducer = (state: LedgerState, action: Action): LedgerState => {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    case 'ADD_ENTITY':
        const newEntities = [...state.entities, action.payload];
        return { 
            ...state, 
            entities: newEntities,
            entityGraph: initializeGraph(newEntities)
        };
    case 'UPDATE_ENTITY':
        const updatedEntities = state.entities.map(e => e.id === action.payload.id ? { ...e, ...action.payload.updates } : e);
        return {
            ...state,
            entities: updatedEntities,
            entityGraph: initializeGraph(updatedEntities)
        };
    case 'DELETE_ENTITY':
        const filteredEntities = state.entities.filter(e => e.id !== action.payload);
        return {
            ...state,
            entities: filteredEntities,
            entityGraph: initializeGraph(filteredEntities)
        };
    case 'POST_JOURNAL':
        const newJournals = [...state.journals, action.payload];
        return {
            ...state,
            journals: newJournals,
            lsmStore: initializeLSM(newJournals)
        };
    case 'UPDATE_USER':
        return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
    case 'ADD_USER':
        return { ...state, users: [...state.users, action.payload] };
    case 'DELETE_USER':
        return { ...state, users: state.users.filter(u => u.id !== action.payload) };
    case 'SET_VIOLATION':
        return { ...state, activeViolation: action.payload };
    default:
      return state;
  }
};

const LedgerContext = createContext<any>(null);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // --- ACTIONS ---

  const setInitialOwner = (name: string, email: string) => {
      const user = { ...INITIAL_USER, name, email, role: 'Owner' as UserRole, avatarInitials: name.substring(0, 2).toUpperCase(), id: 'USR-OWNER', lastActive: 'Now' };
      dispatch({ type: 'SET_STATE', payload: { currentUser: user, users: [user] } });
  };

  const loadJimProfile = () => {
      const jimUser: User = { ...INITIAL_USER, name: 'John Doe', email: 'admin@private-banker.local', role: 'Owner', avatarInitials: 'JN', id: 'USR-JIM', lastActive: 'Now' };
      dispatch({ type: 'SET_STATE', payload: {
          currentUser: jimUser,
          users: [jimUser],
          entities: SEED_ENTITIES,
          accounts: SEED_ACCOUNTS,
          journals: SEED_JOURNALS,
          modules: SEED_MODULES,
          filings: SEED_FILINGS,
          entityGraph: initializeGraph(SEED_ENTITIES),
          lsmStore: initializeLSM(SEED_JOURNALS),
          source: 'Persistence'
      }});
  };

  const loadSyntheticFuzz = () => {
    const name = "Synthetic Node Controller";
    const email = "fuzz@synthetic-ledger.local";
    const initials = "SN";
    const updatedUser: User = { ...INITIAL_USER, name, email, avatarInitials: initials, lastActive: 'Now', id: 'USR-FUZZ', role: 'Admin' };
    
    const rootId = "ENT-FUZZ-ROOT";
    const llcId = "ENT-FUZZ-LLC1";

    const synthEntities: Entity[] = [
      { id: rootId, name: "Sterling Private Fiduciary", type: EntityType.TRUST, role: EntityRole.HOLDING_TRUST, einLast4: "9901", parentEntityId: null, _version: "1" },
      { id: llcId, name: "Vanguard Systems Unltd", type: EntityType.LLC, role: EntityRole.OPERATING_LLC, einLast4: "4402", parentEntityId: rootId, _version: "1" }
    ];

    // --- Generate Accounts ---
    const synthAccounts: Account[] = [
        // Trust Accounts
        { id: uuidv4(), entityId: rootId, code: "101000", name: "Operating Cash", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: Math.floor(Math.random() * 5000000) + 1000000, _version: "1" },
        { id: uuidv4(), entityId: rootId, code: "108000", name: "Strategic Reserves", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: Math.floor(Math.random() * 15000000) + 5000000, _version: "1" },
        
        // LLC Accounts
        { id: "ACC-LLC-CASH", entityId: llcId, code: "101000", name: "Business Checking", type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 50000, _version: "1" }, 
        { id: "ACC-LLC-INC", entityId: llcId, code: "400000", name: "Service Revenue", type: AccountType.INCOME, normalBalance: DCFlag.Credit, balance: 0, _version: "1" },
        { id: "ACC-LLC-EXP-RENT", entityId: llcId, code: "500000", name: "Rent Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: "1" },
        { id: "ACC-LLC-EXP-SAL", entityId: llcId, code: "510000", name: "Salaries Expense", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: "1" },
        { id: "ACC-LLC-EXP-UTIL", entityId: llcId, code: "520000", name: "Utilities", type: AccountType.EXPENSE, normalBalance: DCFlag.Debit, balance: 0, _version: "1" }
    ];

    // --- Generate Employees ---
    const synthEmployees: Employee[] = [
        { id: uuidv4(), entityId: llcId, firstName: "Alice", lastName: "Vanguard", role: "Operations Manager", department: "Operations", salary: 85000, payFrequency: "Bi-Weekly", status: "Active", hireDate: "2023-01-15" },
        { id: uuidv4(), entityId: llcId, firstName: "Bob", lastName: "Builder", role: "Site Tech", department: "Field", salary: 62000, payFrequency: "Bi-Weekly", status: "Active", hireDate: "2023-03-10" }
    ];

    // --- Generate History (Journals & Payroll) ---
    const synthJournals: JournalEntry[] = [];
    const synthPayrollRuns: PayrollRun[] = [];
    const today = new Date();
    
    // Generate 3 months of activity
    for (let i = 3; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = monthDate.toLocaleString('default', { month: 'short' });
        
        // 1. Revenue
        const revAmount = Math.floor(Math.random() * 20000) + 30000; // 30k-50k
        synthJournals.push({
            id: uuidv4(), entityId: llcId, date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5).toISOString().split('T')[0],
            memo: `Invoice Revenue - ${monthStr}`, type: 'REVENUE', locked: true, _version: "1",
            lines: [
                { id: uuidv4(), accountId: "ACC-LLC-CASH", accountCode: "101000", accountName: "Business Checking", dc: DCFlag.Debit, amount: revAmount },
                { id: uuidv4(), accountId: "ACC-LLC-INC", accountCode: "400000", accountName: "Service Revenue", dc: DCFlag.Credit, amount: revAmount }
            ]
        });

        // 2. Rent
        const rentAmt = 4500;
        synthJournals.push({
            id: uuidv4(), entityId: llcId, date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split('T')[0],
            memo: `Office Rent - ${monthStr}`, type: 'EXPENSE', locked: true, _version: "1",
            lines: [
                { id: uuidv4(), accountId: "ACC-LLC-EXP-RENT", accountCode: "500000", accountName: "Rent Expense", dc: DCFlag.Debit, amount: rentAmt },
                { id: uuidv4(), accountId: "ACC-LLC-CASH", accountCode: "101000", accountName: "Business Checking", dc: DCFlag.Credit, amount: rentAmt }
            ]
        });

        // 3. Payroll (Simulate 2 runs per month)
        [15, 28].forEach(day => {
            const payDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().split('T')[0];
            const grossPay = (85000 + 62000) / 26; // approx bi-weekly total
            const tax = grossPay * 0.2;
            const net = grossPay - tax;
            
            synthJournals.push({
                id: uuidv4(), entityId: llcId, date: payDate,
                memo: `Payroll Run ${monthStr} ${day}`, type: 'PAYROLL', locked: true, _version: "1",
                lines: [
                    { id: uuidv4(), accountId: "ACC-LLC-EXP-SAL", accountCode: "510000", accountName: "Salaries Expense", dc: DCFlag.Debit, amount: grossPay },
                    { id: uuidv4(), accountId: "ACC-LLC-CASH", accountCode: "101000", accountName: "Business Checking", dc: DCFlag.Credit, amount: net },
                    { id: uuidv4(), accountId: "ACC-LLC-CASH", accountCode: "101000", accountName: "Business Checking", dc: DCFlag.Credit, amount: tax } 
                ]
            });

            synthPayrollRuns.push({
                id: uuidv4(), entityId: llcId, periodStart: payDate, periodEnd: payDate, payDate: payDate,
                totalGross: grossPay, totalEmployerTax: tax, totalNetPay: net, status: 'Posted'
            });
        });
    }
    
    // Update Cash Balance based on simulated history
    let netCashChange = 0;
    synthJournals.forEach(j => {
        j.lines.forEach(l => {
            if (l.accountCode === '101000') {
                if (l.dc === DCFlag.Debit) netCashChange += l.amount;
                else netCashChange -= l.amount;
            }
        });
    });

    const llcCashAcc = synthAccounts.find(a => a.id === "ACC-LLC-CASH");
    if (llcCashAcc) {
        llcCashAcc.balance = 50000 + netCashChange;
    }
    
    dispatch({ type: 'SET_STATE', payload: { 
        currentUser: updatedUser,
        users: [updatedUser],
        entityGraph: initializeGraph(synthEntities),
        lsmStore: initializeLSM(synthJournals),
        accounts: synthAccounts, 
        entities: synthEntities,
        journals: synthJournals,
        employees: synthEmployees,
        payrollRuns: synthPayrollRuns,
        intrusions: [],
        source: 'Simulation'
    }});
  };

  const addEntity = (parentId: string, type: EntityType, role: EntityRole, nameOverride?: string) => {
      const newEntity: Entity = {
          id: `ENT-${Date.now()}`,
          name: nameOverride || `New ${type}`,
          type,
          role,
          parentEntityId: parentId || null,
          _version: '1.0'
      };
      dispatch({ type: 'ADD_ENTITY', payload: newEntity });
      return Promise.resolve(newEntity);
  };

  const updateEntity = (id: string, updates: Partial<Entity>) => {
      dispatch({ type: 'UPDATE_ENTITY', payload: { id, updates } });
  };

  const deleteEntity = (id: string) => {
      dispatch({ type: 'DELETE_ENTITY', payload: id });
  };

  const postJournal = (entityId: string, date: string, memo: string, type: string, lines: any[]) => {
      const journal: JournalEntry = {
          id: uuidv4(),
          entityId,
          date,
          memo,
          type,
          lines: lines.map(l => ({ ...l, id: uuidv4() })),
          locked: true,
          _version: '1.0'
      };
      
      // Update account balances
      const updatedAccounts = state.accounts.map((acc: Account) => {
          const relatedLines = journal.lines.filter(l => l.accountId === acc.id || l.accountCode === acc.code); 
          if (relatedLines.length === 0) return acc;
          
          let newBalance = acc.balance;
          relatedLines.forEach(l => {
              if (acc.normalBalance === DCFlag.Debit) {
                  newBalance += l.dc === DCFlag.Debit ? l.amount : -l.amount;
              } else {
                  newBalance += l.dc === DCFlag.Credit ? l.amount : -l.amount;
              }
          });
          return { ...acc, balance: newBalance };
      });

      dispatch({ type: 'SET_STATE', payload: { accounts: updatedAccounts } });
      dispatch({ type: 'POST_JOURNAL', payload: journal });
  };

  const simpleAdd = (key: keyof LedgerState, item: any) => {
      // @ts-ignore
      dispatch({ type: 'SET_STATE', payload: { [key]: [...state[key], item] } });
  };
  
  const simpleUpdate = (key: keyof LedgerState, item: any) => {
      // @ts-ignore
      dispatch({ type: 'SET_STATE', payload: { [key]: state[key].map((x: any) => x.id === item.id ? { ...x, ...item } : x) } });
  };

  const simpleDelete = (key: keyof LedgerState, id: string) => {
      // @ts-ignore
      dispatch({ type: 'SET_STATE', payload: { [key]: state[key].filter((x: any) => x.id !== id) } });
  };

  // --- Methods Mapped to Store ---
  const contextValue = {
      ...state,
      setInitialOwner,
      loadJimProfile,
      loadSyntheticFuzz,
      addEntity,
      updateEntity,
      deleteEntity,
      postJournal,
      addUser: (u: User) => dispatch({ type: 'ADD_USER', payload: u }),
      updateUser: (u: User) => dispatch({ type: 'UPDATE_USER', payload: u }),
      deleteUser: (id: string) => dispatch({ type: 'DELETE_USER', payload: id }),
      createFiling: (entityId: string, type: string) => simpleAdd('filings', { id: uuidv4(), entityId, formType: type, status: 'Drafted' }),
      updateFilingStatus: (id: string, status: string, date?: string) => {
          const filing = state.filings.find((f: any) => f.id === id);
          if (filing) simpleUpdate('filings', { ...filing, status, filingDate: date });
      },
      submitFilingViaAPI: async (id: string) => {
          const filing = state.filings.find((f: any) => f.id === id);
          if (!filing) return;
          const entity = state.entities.find((e: any) => e.id === filing.entityId);
          if (!entity) return;
          
          const result = await simulateTransmission(entity, filing.formType as any, state.settings.fuzzing);
          simpleAdd('transmissions', result);
          
          if (result.status === 'Accepted') {
              simpleUpdate('filings', { ...filing, status: 'Accepted', submissionId: result.submissionId, filingDate: new Date().toISOString().split('T')[0] });
          } else {
              simpleUpdate('filings', { ...filing, status: 'Rejected' });
          }
      },
      generateSampleEnterprise: loadJimProfile,
      generateSyntheticData: loadSyntheticFuzz, 
      importData: (json: string) => {
          try {
              const data = JSON.parse(json);
              dispatch({ type: 'SET_STATE', payload: data });
          } catch (e) {
              console.error("Import Failed", e);
          }
      },
      resetData: () => dispatch({ type: 'SET_STATE', payload: initialState }),
      resumePersistent: () => {/* Hook for local storage in real app */},
      updateSecrets: (s: ApiSecrets) => dispatch({ type: 'SET_STATE', payload: { secrets: { ...state.secrets, ...s } } }),
      updateSettings: (s: SystemSettings) => dispatch({ type: 'SET_STATE', payload: { settings: { ...state.settings, ...s } } }),
      clearViolation: () => dispatch({ type: 'SET_VIOLATION', payload: null }),
      performGroundingSearch: async (q: string) => {
          const results = await searchIRSManual(q);
          dispatch({ type: 'SET_STATE', payload: { searchResults: results } });
      },
      
      addChanceryFiling: (f: ChanceryFiling) => simpleAdd('chanceryFilings', f),
      addPerfection: (p: PerfectionInstruction) => simpleAdd('perfections', p),
      addMaradRecord: (r: MaradRecord) => simpleAdd('maradRecords', r),
      addFedwire: (r: FedwireRecord) => simpleAdd('fedWires', r),
      addTick: (t: TicklerRecord) => simpleAdd('ticks', t),
      updateTick: (t: any) => simpleUpdate('ticks', t),
      addEscrow: (e: EscrowAccount) => simpleAdd('escrows', e),
      updateEscrow: (e: any) => simpleUpdate('escrows', e),
      addFiduciaryReview: (r: FiduciaryReview) => simpleAdd('fiduciaryReviews', r),
      addCRMPerson: (p: CRMPerson) => simpleAdd('crmPeople', p),
      updateCRMPerson: (p: CRMPerson) => simpleUpdate('crmPeople', p),
      deleteCRMPerson: (id: string) => simpleDelete('crmPeople', id),
      addInteraction: (pId: string, i: Interaction) => {
          const p = state.crmPeople.find((x: any) => x.id === pId);
          if (p) simpleUpdate('crmPeople', { ...p, interactions: [...p.interactions, i] });
      },
      addDTCCRecord: (r: DTCCPledgeRecord) => simpleAdd('dtccRecords', r),
      updateDTCCRecord: (r: DTCCPledgeRecord) => simpleUpdate('dtccRecords', r),
      addACHRecord: (r: ACHRecord) => simpleAdd('achRecords', r),
      submitW2Report: (wages: number, fed: number, ss: number, med: number) => console.log("W2 Submitted", wages, fed),
      createAccord: (r: AccordRecord) => simpleAdd('accords', r),
      createPrivateAdminEntry: (r: PrivateAdminRecord) => simpleAdd('privateAdminRecords', r),
      resolveTaxpayerAccount: (r: ResolutionRecord) => simpleAdd('resolutions', r),
      addEdgarRecord: (r: EdgarResearchRecord) => simpleAdd('edgarRecords', r),
      addParcel: (p: ParcelRecord) => simpleAdd('parcels', p),
      addInstrumentExchange: (r: InstrumentExchangeRecord) => simpleAdd('instrumentExchanges', r),
      createReSitus: (r: ReSitusRecord) => simpleAdd('reSitusRecords', r),
      addCreditDefenseRecord: (r: CreditDefenseRecord) => simpleAdd('creditDefenseRecords', r),
      addCanalRecord: (r: CanalRecord) => simpleAdd('canalRecords', r),
  };

  return React.createElement(LedgerContext.Provider, { value: contextValue }, children);
};

export const useLedgerStore = () => useContext(LedgerContext);
