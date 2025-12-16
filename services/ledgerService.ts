

// ... keep imports ...
import React, { useState, useEffect, useReducer, useCallback, useMemo } from 'react';
import { Entity, Account, TaxModule, JournalEntry, JournalLine, DCFlag, Contractor, ComplianceFiling, WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, PayrollRun, IRMDocument, EntityType, EntityRole, EntityModelData, TransmissionLog, SystemStatus, SearchResult, IRSFormType, SSAStatement, AccordRecord, PrivateAdminRecord, ResolutionRecord, ReSitusRecord, AccountType, User, UserRole, ChangeSet, PatchOperation, RequestContext, ApiSecrets, SystemSettings } from '../types';
import { SEED_ENTITIES, SEED_ACCOUNTS, SEED_MODULES, SEED_CONTRACTORS, SEED_FILINGS, SEED_WALLETS, SEED_BSO_ROLES, SEED_BSO_SUBMISSIONS, SEED_IRS_CREDS, SEED_EMPLOYEES, SEED_PAYROLL_RUNS, SEED_DOCUMENTS, SEED_SSA_STATEMENTS } from './mockData';
import { simulateTransmission, getSystemStatus, searchIRSManual, mockBSORegistration, mockBSOSubmission } from './irsApiService';
import { v4 as uuidv4 } from 'uuid';

// --- PERSISTENCE CONFIG ---
const STORAGE_KEY = 'trust_ledger_state_v1';

// --- INITIAL STATE SETUP ---
const GENESIS_HASH = "0000000000000000";

const INITIAL_USER: User = {
    id: 'USR-001',
    name: 'Heather S.',
    email: 'heather@trust.local',
    role: 'Owner',
    avatarInitials: 'HS',
    lastActive: 'Just now',
    jobTitle: 'Primary Trustee',
    department: 'Executive Administration',
    isPrivate: false,
    _version: GENESIS_HASH
};

const INITIAL_SECRETS: ApiSecrets = {
    irsEtin: '00000',
    irsAppId: '',
    bsoUserId: '',
    hmacKey: ''
};

const INITIAL_SETTINGS: SystemSettings = {
    fuzzing: { enabled: true, intensity: 'Low', latencyMode: 'Realistic' },
    network: 'Testnet'
};

// Seed versioning
const INITIAL_ENTITIES = SEED_ENTITIES.map(e => ({ ...e, _version: GENESIS_HASH }));

interface AppState {
  version: number;
  headHash: string; // The tip of the Pijul graph
  changeGraph: ChangeSet[]; // The log of all changes (CRDT Source of Truth)
  
  // Configuration
  secrets: ApiSecrets;
  settings: SystemSettings;

  // Materialized Views (Projections)
  currentUser: User;
  users: User[];
  entities: Entity[];
  accounts: Account[];
  modules: TaxModule[];
  journals: JournalEntry[];
  contractors: Contractor[];
  filings: ComplianceFiling[];
  wallets: WalletCredential[];
  documents: IRMDocument[];
  bsoRoles: BSORole[];
  bsoSubmissions: BSOSubmission[];
  irsCreds: IRSAPICredential[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  ssaStatements: SSAStatement[];
  transmissions: TransmissionLog[];
  accords: AccordRecord[];
  resolutions: ResolutionRecord[];
  reSitusRecords: ReSitusRecord[];
}

const INITIAL_STATE: AppState = {
  version: 1,
  headHash: GENESIS_HASH,
  changeGraph: [],
  secrets: INITIAL_SECRETS,
  settings: INITIAL_SETTINGS,
  currentUser: INITIAL_USER,
  users: [INITIAL_USER],
  entities: INITIAL_ENTITIES,
  accounts: SEED_ACCOUNTS,
  modules: SEED_MODULES,
  journals: [],
  contractors: SEED_CONTRACTORS,
  filings: SEED_FILINGS,
  wallets: SEED_WALLETS,
  documents: SEED_DOCUMENTS,
  bsoRoles: SEED_BSO_ROLES,
  bsoSubmissions: SEED_BSO_SUBMISSIONS,
  irsCreds: SEED_IRS_CREDS,
  employees: SEED_EMPLOYEES,
  payrollRuns: SEED_PAYROLL_RUNS,
  ssaStatements: SEED_SSA_STATEMENTS,
  transmissions: [],
  accords: [],
  resolutions: [],
  reSitusRecords: []
};

// --- CORE UTILS ---

// Simple string hash for demo purposes (not crypto secure but consistent)
const calculateHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
};

// --- REDUCER (The "Backend") ---

type Action = 
  | { type: 'INIT_STORE'; payload: AppState }
  | { type: 'APPLY_CHANGE_SET'; payload: ChangeSet }
  | { type: 'UPDATE_SECRETS'; payload: Partial<ApiSecrets> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<SystemSettings> }
  | { type: 'RESET_STORE' };

const applyOperation = (state: AppState, op: PatchOperation): AppState => {
    const newState = { ...state };
    const parts = op.path.split('/').filter(p => p);
    const collectionName = parts[0] as keyof AppState;
    const targetId = parts[1];
    const field = parts[2];

    if (op.op === 'add') {
        if (Array.isArray(newState[collectionName])) {
            // @ts-ignore
            newState[collectionName] = [op.value, ...newState[collectionName]];
        }
    } else if (op.op === 'replace') {
        if (Array.isArray(newState[collectionName])) {
            // @ts-ignore
            newState[collectionName] = newState[collectionName].map(item => {
                if (item.id === targetId) {
                    return { ...item, [field]: op.value };
                }
                return item;
            });
        }
        // Sync current user if it was updated
        if (collectionName === 'users' && targetId === state.currentUser.id) {
            newState.currentUser = { ...state.currentUser, [field]: op.value };
        }
    } else if (op.op === 'remove') {
        if (Array.isArray(newState[collectionName])) {
            // @ts-ignore
            newState[collectionName] = newState[collectionName].filter(item => item.id !== targetId);
        }
    }

    return newState;
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INIT_STORE':
      return { ...INITIAL_STATE, ...action.payload }; // Merge to ensure new fields (like secrets) exist even if old state is loaded
    case 'UPDATE_SECRETS':
      return { ...state, secrets: { ...state.secrets, ...action.payload } };
    case 'UPDATE_SETTINGS':
        // Deep merge for settings
        const newSettings = { ...state.settings, ...action.payload };
        // Handle nested fuzzing config if provided partially
        // @ts-ignore
        if (action.payload.fuzzing) { newSettings.fuzzing = { ...state.settings.fuzzing, ...action.payload.fuzzing }; }
        return { ...state, settings: newSettings };
    case 'APPLY_CHANGE_SET':
      const changeSet = action.payload;
      const newGraph = [...state.changeGraph, changeSet];
      let materializedState = { ...state, changeGraph: newGraph, headHash: changeSet.hash };
      changeSet.operations.forEach(op => {
          materializedState = applyOperation(materializedState, op);
      });
      return materializedState;
    case 'RESET_STORE':
      return INITIAL_STATE;
    default:
      return state;
  }
};

// --- REQUEST FACTORY IMPLEMENTATION ---

class LedgerRequestContext implements RequestContext {
    private operations: PatchOperation[] = [];
    private dispatch: React.Dispatch<Action>;
    private currentUser: User;
    private parentHash: string;
    private description: string;

    constructor(dispatch: React.Dispatch<Action>, currentUser: User, headHash: string, description: string) {
        this.dispatch = dispatch;
        this.currentUser = currentUser;
        this.parentHash = headHash;
        this.description = description;
    }

    edit<T extends { id: string, _version: string }>(entity: T): T {
        // @ts-ignore
        const collectionName = this.inferCollectionName(entity);
        return new Proxy(entity, {
            set: (target: any, prop: string | symbol, value: any) => {
                if (prop === '_version') return true; 
                const oldValue = target[prop];
                target[prop] = value; 
                this.operations.push({
                    op: 'replace',
                    path: `/${collectionName}/${target.id}/${String(prop)}`,
                    value: value,
                    prevValue: oldValue
                });
                return true;
            }
        });
    }

    create<T>(collection: string, object: T): T {
        this.operations.push({
            op: 'add',
            path: `/${collection}`,
            value: object
        });
        return object;
    }

    delete(collection: string, id: string) {
        this.operations.push({
            op: 'remove',
            path: `/${collection}/${id}`
        });
    }

    async fire(): Promise<void> {
        if (this.operations.length === 0) return;
        const changeSet: ChangeSet = {
            hash: "", 
            parentHash: this.parentHash,
            timestamp: Date.now(),
            author: this.currentUser.name,
            description: this.description,
            operations: this.operations
        };
        const content = JSON.stringify(changeSet.operations) + changeSet.parentHash + changeSet.author + changeSet.timestamp;
        changeSet.hash = calculateHash(content);
        this.dispatch({ type: 'APPLY_CHANGE_SET', payload: changeSet });
    }

    cancel() { this.operations = []; }

    private inferCollectionName(entity: any): string {
        if (entity.role && (entity.type === EntityType.TRUST || entity.type === EntityType.LLC || entity.type === EntityType.INDIVIDUAL)) return 'entities';
        if (entity.balance !== undefined) return 'accounts';
        if (entity.lines) return 'journals';
        if (entity.formType) return 'filings';
        if (entity.email) return 'users';
        if (entity.bsoId) return 'bsoRoles';
        if (entity.batchId) return 'bsoSubmissions';
        return 'entities'; 
    }
}

// --- HOOK ---

export const useLedgerStore = () => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load from Persistence on Mount
  useEffect(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              dispatch({ type: 'INIT_STORE', payload: parsed });
          } catch (e) {
              console.error("Ledger hydration failed:", e);
          }
      }
      setIsLoaded(true);
  }, []);

  // 2. Save to Persistence on Change
  useEffect(() => {
      if (isLoaded) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
  }, [state, isLoaded]);

  // Derived State
  const [apiSystemStatus] = useState<SystemStatus[]>(getSystemStatus());
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- ACTIONS ---

  const createRequest = useCallback((desc: string) => {
      return new LedgerRequestContext(dispatch, state.currentUser, state.headHash, desc);
  }, [state.currentUser, state.headHash]);

  const updateSecrets = (secrets: Partial<ApiSecrets>) => dispatch({ type: 'UPDATE_SECRETS', payload: secrets });
  const updateSettings = (settings: Partial<SystemSettings>) => dispatch({ type: 'UPDATE_SETTINGS', payload: settings });

  const resetData = useCallback(() => {
      dispatch({ type: 'RESET_STORE' });
      localStorage.removeItem(STORAGE_KEY);
  }, []);

  const importData = useCallback((jsonData: string) => {
      try {
          const parsed = JSON.parse(jsonData);
          // Simple validation check
          if (!parsed.version || !parsed.headHash) throw new Error("Invalid ledger file format");
          dispatch({ type: 'INIT_STORE', payload: parsed });
      } catch (e) {
          console.error("Import failed:", e);
          throw e;
      }
  }, []);

  const addEntity = useCallback(async (parentId: string, type: EntityType, role: EntityRole, nameOverride?: string) => {
    const req = createRequest(`Add Entity: ${nameOverride || type}`);
    const newEnt: Entity = {
      id: `ENT-${Math.floor(Math.random() * 10000)}`,
      name: nameOverride || "New Entity",
      type,
      role,
      parentEntityId: parentId,
      regionCode: 'OSC',
      modelData: { vizType: 'D3_SERIES', timeSeries: [] },
      _version: state.headHash
    };
    req.create('entities', newEnt);
    await req.fire();
    return newEnt;
  }, [createRequest, state.headHash]);

  const updateEntity = useCallback(async (id: string, updates: Partial<Entity>) => {
    const entity = state.entities.find(e => e.id === id);
    if (!entity) return;
    const req = createRequest(`Update Entity: ${entity.name}`);
    const proxy = req.edit(entity);
    Object.assign(proxy, updates);
    await req.fire();
  }, [createRequest, state.entities]);

  const deleteEntity = useCallback(async (id: string) => {
    const req = createRequest(`Delete Entity: ${id}`);
    req.delete('entities', id);
    await req.fire();
  }, [createRequest]);

  const postJournal = useCallback(async (
    entityId: string, date: string, memo: string, type: string,
    rawLines: { accountCode: string; dc: DCFlag; amount: number; moduleId?: string }[],
    isPrivateDomain: boolean = false
  ) => {
    const req = createRequest(`Post Journal: ${memo}`);
    const lines: JournalLine[] = rawLines.map(line => {
      let acct = state.accounts.find(a => a.code === line.accountCode && a.entityId === entityId);
      const lineAccount = acct || { id: 'mock', code: line.accountCode, name: 'Suspense/Clearing' };
      return {
        id: uuidv4(),
        accountId: lineAccount.id,
        accountCode: lineAccount.code,
        accountName: lineAccount.name,
        dc: line.dc,
        amount: line.amount,
        moduleId: line.moduleId
      };
    });
    const newJournal: JournalEntry = {
      id: uuidv4(), entityId, date, memo, type, lines, locked: true, isPrivateDomain
    };
    req.create('journals', newJournal);
    state.accounts.forEach(acc => {
        const relevantLines = lines.filter(l => l.accountId === acc.id);
        if (relevantLines.length > 0) {
            let balanceChange = 0;
            relevantLines.forEach(l => {
                if (acc.normalBalance === DCFlag.Debit) {
                    balanceChange += l.dc === DCFlag.Debit ? l.amount : -l.amount;
                } else {
                    balanceChange += l.dc === DCFlag.Credit ? l.amount : -l.amount;
                }
            });
            const proxy = req.edit(acc);
            proxy.balance += balanceChange;
        }
    });
    await req.fire();
    return newJournal;
  }, [createRequest, state.accounts]);

  const runPayroll = useCallback((entityId: string, periodStart: string, periodEnd: string, payDate: string, moduleId: string) => {
      const activeEmps = state.employees.filter(e => e.entityId === entityId && e.status === 'Active');
      const totalGross = activeEmps.reduce((sum, e) => sum + (e.salary / 26), 0);
      const totalEmployerTax = totalGross * 0.0765;
      const totalNetPay = totalGross * 0.80; 
      
      const req = createRequest("Run Payroll");
      req.create('payrollRuns', {
          id: uuidv4(),
          entityId,
          periodStart,
          periodEnd,
          payDate,
          totalGross,
          totalEmployerTax,
          totalNetPay,
          status: 'Posted',
          journalId: uuidv4() 
      });
      req.fire();
  }, [createRequest, state.employees]);

  // Generic helpers
  const genericCreate = useCallback((collection: string, item: any, desc: string) => {
      const req = createRequest(desc);
      req.create(collection, item);
      req.fire();
  }, [createRequest]);

  const genericUpdate = useCallback((collection: string, id: string, updates: any, desc: string) => {
      const req = createRequest(desc);
      // @ts-ignore
      const item = state[collection]?.find((i: any) => i.id === id);
      if (item) {
          const proxy = req.edit(item);
          Object.assign(proxy, updates);
          req.fire();
      }
  }, [createRequest, state]);

  // --- API SIMULATIONS (Using new services/irsApiService) ---
  const registerBSOEmployer = useCallback(async (entityId: string, bsoId: string) => {
      try {
          // FUZZED CALL
          await mockBSORegistration(bsoId, state.secrets, state.settings.fuzzing);
          
          genericCreate('bsoRoles', { 
              id: `BSO-${Date.now()}`, 
              entityId, 
              roleType: 'Employer', 
              bsoId, 
              registrationStatus: 'Active' 
          }, 'Register BSO');
          return true;
      } catch (error) {
          console.error("BSO Registration Failed:", error);
          alert(`BSO Error: ${error instanceof Error ? error.message : 'Connection Reset'}`);
          return false;
      }
  }, [genericCreate, state.secrets, state.settings]);

  const submitW2Report = useCallback(async (entityId: string, w: number, f: number, s: number, m: number) => {
      const role = state.bsoRoles.find(r => r.entityId === entityId);
      if (!role) return;

      try {
          // FUZZED CALL
          const result = await mockBSOSubmission(role.bsoId, state.secrets, state.settings.fuzzing);
          
          genericCreate('bsoSubmissions', { 
              id: `SUB-${Date.now()}`, 
              bsoRoleId: role.id, 
              reportType: 'W-2', 
              batchId: result.batchId,
              status: result.status, 
              submissionDate: new Date().toISOString().split('T')[0]
          }, 'Submit W-2');
      } catch (error) {
          console.error("W2 Submission Failed:", error);
          alert(`Transmission Error: ${error instanceof Error ? error.message : 'Gateway Timeout'}`);
      }
  }, [genericCreate, state.bsoRoles, state.secrets, state.settings]);

  const submitFilingViaAPI = useCallback(async (filingId: string) => {
      const filing = state.filings.find(f => f.id === filingId);
      const entity = state.entities.find(e => e.id === filing?.entityId);
      if (!filing || !entity) return;

      // FUZZED CALL
      const log = await simulateTransmission(entity, filing.formType, state.settings.fuzzing);
      
      const req = createRequest(`Transmit Form ${filing.formType}`);
      req.create('transmissions', log);
      
      if (log.status === 'Accepted') {
          const filingProxy = req.edit(filing);
          filingProxy.status = 'Accepted';
          filingProxy.submissionId = log.submissionId;
          filingProxy.filingDate = new Date().toISOString().split('T')[0];
      } else {
          const filingProxy = req.edit(filing);
          filingProxy.status = 'Rejected';
          filingProxy.notes = "Rejected by MeF. See API Console logs.";
      }
      req.fire();
  }, [createRequest, state.filings, state.entities, state.settings]);

  const performGroundingSearch = async (q: string) => {
      setIsSearching(true);
      const res = await searchIRSManual(q);
      setSearchResults(res);
      setIsSearching(false);
  };

  // Mapped functions
  const createFiling = (eid: string, type: IRSFormType) => genericCreate('filings', { id: uuidv4(), entityId: eid, formType: type, status: 'Drafted', _version: state.headHash }, `Create Filing ${type}`);
  const updateFilingStatus = (id: string, status: string, date?: string) => genericUpdate('filings', id, { status, filingDate: date }, `Update Filing Status ${status}`);
  const addUser = (u: User) => genericCreate('users', { ...u, _version: state.headHash }, `Add User ${u.name}`);
  const updateUser = (u: User) => genericUpdate('users', u.id, u, `Update User ${u.name}`);
  const deleteUser = (id: string) => { const req = createRequest(`Delete User ${id}`); req.delete('users', id); req.fire(); };
  
  const generateSyntheticData = useCallback(async () => {
      const req = createRequest("Seed Synthetic History");
      const LLC_ID = "ENT-002";
      for(let i=0; i<5; i++) {
          const id = `SYN-${uuidv4()}`;
          req.create('entities', {
              id, name: `Synthetic Vendor ${i}`, type: EntityType.VENDOR, role: EntityRole.OTHER, _version: state.headHash
          });
          req.create('journals', {
              id: uuidv4(), entityId: LLC_ID, date: new Date().toISOString(), memo: `Payment to Vendor ${i}`, type: 'DISBURSEMENT', lines: [], locked: true
          });
      }
      await req.fire();
  }, [createRequest, state.headHash]);

  return {
    ...state,
    changeGraph: state.changeGraph,
    apiSystemStatus,
    searchResults,
    isSearching,
    addEntity,
    updateEntity,
    deleteEntity,
    postJournal,
    runPayroll,
    createFiling,
    updateFilingStatus,
    fileAllDrafts: () => {}, 
    linkDocument: () => {},
    submitFilingViaAPI,
    performGroundingSearch,
    registerBSOEmployer,
    submitW2Report,
    createAccord: (r: AccordRecord) => genericCreate('accords', r, 'Create Accord'),
    createPrivateAdminEntry: (r: PrivateAdminRecord) => genericCreate('journals', {}, 'Private Admin'),
    resolveTaxpayerAccount: (r: ResolutionRecord) => genericCreate('resolutions', r, 'Resolve Account'),
    createReSitus: (r: ReSitusRecord) => genericCreate('reSitusRecords', r, `Re-Situs ${r.type}`),
    generateModelData: () => {},
    undo: () => {}, redo: () => {},
    addUser, updateUser, deleteUser,
    updateSecrets,
    updateSettings,
    generateSyntheticData,
    resetData, // EXPORTED
    importData // EXPORTED
  };
};
