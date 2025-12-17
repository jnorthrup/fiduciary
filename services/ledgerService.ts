
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Entity, Account, TaxModule, JournalEntry, Contractor, ComplianceFiling, 
  WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, 
  PayrollRun, IRMDocument, SSAStatement, TransmissionLog, SystemStatus, 
  SearchResult, AccordRecord, PrivateAdminRecord, ResolutionRecord, 
  ReSitusRecord, User, ChangeSet, ApiSecrets, SystemSettings,
  EntityType, EntityRole, IRSFormType, DCFlag, FiduciaryAction, BOIReport
} from '../types';
import { 
  SEED_ENTITIES, SEED_ACCOUNTS, SEED_MODULES, SEED_CONTRACTORS, SEED_FILINGS, 
  SEED_WALLETS, SEED_BSO_ROLES, SEED_BSO_SUBMISSIONS, SEED_IRS_CREDS, 
  SEED_EMPLOYEES, SEED_PAYROLL_RUNS, SEED_DOCUMENTS, SEED_SSA_STATEMENTS,
  SEED_RESOLUTIONS
} from './mockData';
import { simulateTransmission, getSystemStatus, searchIRSManual } from './irsApiService';

interface LedgerState {
  entities: Entity[];
  accounts: Account[];
  modules: TaxModule[];
  journals: JournalEntry[];
  contractors: Contractor[];
  filings: ComplianceFiling[];
  wallets: WalletCredential[];
  bsoRoles: BSORole[];
  bsoSubmissions: BSOSubmission[];
  irsCreds: IRSAPICredential[];
  employees: Employee[];
  payrollRuns: PayrollRun[];
  ssaStatements: SSAStatement[];
  documents: IRMDocument[];
  transmissions: TransmissionLog[];
  accords: AccordRecord[];
  resolutions: ResolutionRecord[];
  reSitusRecords: ReSitusRecord[];
  
  // Fiduciary & Governance
  fiduciaryActions: FiduciaryAction[];
  boiReports: BOIReport[];

  // System
  apiSystemStatus: SystemStatus[];
  searchResults: SearchResult[];
  isSearching: boolean;
  
  // Users
  users: User[];
  currentUser: User;
  
  // Config
  secrets: ApiSecrets;
  settings: SystemSettings;
  
  // Versioning
  changeGraph: ChangeSet[];
  headHash: string;
}

const INITIAL_STATE: LedgerState = {
  entities: SEED_ENTITIES,
  accounts: SEED_ACCOUNTS,
  modules: SEED_MODULES,
  journals: [],
  contractors: SEED_CONTRACTORS,
  filings: SEED_FILINGS,
  wallets: SEED_WALLETS,
  bsoRoles: SEED_BSO_ROLES,
  bsoSubmissions: SEED_BSO_SUBMISSIONS,
  irsCreds: SEED_IRS_CREDS,
  employees: SEED_EMPLOYEES,
  payrollRuns: SEED_PAYROLL_RUNS,
  ssaStatements: SEED_SSA_STATEMENTS,
  documents: SEED_DOCUMENTS,
  transmissions: [],
  accords: [],
  resolutions: SEED_RESOLUTIONS, // Repopulated
  reSitusRecords: [],
  fiduciaryActions: [],
  boiReports: [],
  apiSystemStatus: getSystemStatus(),
  searchResults: [],
  isSearching: false,
  users: [
    { id: 'USR-001', name: 'Admin User', email: 'admin@system.local', role: 'Owner', avatarInitials: 'AD', lastActive: 'Now', _version: '0' }
  ],
  currentUser: { id: 'USR-001', name: 'Admin User', email: 'admin@system.local', role: 'Owner', avatarInitials: 'AD', lastActive: 'Now', _version: '0' },
  secrets: { irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' },
  settings: { fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Fast' }, network: 'Testnet' },
  changeGraph: [],
  headHash: 'GENESIS'
};

type Action = 
  | { type: 'SET_STATE'; payload: Partial<LedgerState> }
  | { type: 'GENERIC_UPDATE'; collection: keyof LedgerState; item: any; op: 'add' | 'update' | 'delete' };

const reducer = (state: LedgerState, action: Action): LedgerState => {
  switch (action.type) {
      case 'SET_STATE': return { ...state, ...action.payload };
      case 'GENERIC_UPDATE': {
          const { collection, item, op } = action;
          const list = state[collection] as any[];
          if (op === 'add') return { ...state, [collection]: [...list, item] };
          if (op === 'update') return { ...state, [collection]: list.map(i => i.id === item.id ? { ...i, ...item } : i) };
          if (op === 'delete') return { ...state, [collection]: list.filter(i => i.id !== item) };
          return state;
      }
      default: return state;
  }
};

const LedgerContext = createContext<any>(null);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const addEntity = (parentId: string, type: EntityType, role: EntityRole, nameOverride?: string) => {
      const newEntity: Entity = {
          id: uuidv4(),
          name: nameOverride || `New ${type}`,
          type,
          role,
          parentEntityId: parentId || null,
          _version: uuidv4()
      };
      dispatch({ type: 'GENERIC_UPDATE', collection: 'entities', item: newEntity, op: 'add' });
      return Promise.resolve(newEntity);
  };

  const updateEntity = (id: string, updates: Partial<Entity>) => {
      dispatch({ type: 'GENERIC_UPDATE', collection: 'entities', item: { id, ...updates }, op: 'update' });
  };

  const deleteEntity = (id: string) => {
      dispatch({ type: 'GENERIC_UPDATE', collection: 'entities', item: id, op: 'delete' });
  };

  const postJournal = (entityId: string, date: string, memo: string, type: string, lines: any[]) => {
      const newJournal: JournalEntry = {
          id: uuidv4(),
          entityId,
          date,
          memo,
          type,
          lines: lines.map(l => ({ ...l, id: uuidv4() })),
          locked: true,
          _version: uuidv4()
      };
      dispatch({ type: 'GENERIC_UPDATE', collection: 'journals', item: newJournal, op: 'add' });
  };

  const createFiling = (entityId: string, formType: IRSFormType) => {
      const newFiling: ComplianceFiling = {
          id: uuidv4(),
          entityId,
          formType,
          status: 'Drafted',
          _version: uuidv4()
      };
      dispatch({ type: 'GENERIC_UPDATE', collection: 'filings', item: newFiling, op: 'add' });
  };

  const updateFilingStatus = (id: string, status: ComplianceFiling['status'], date?: string) => {
      dispatch({ type: 'GENERIC_UPDATE', collection: 'filings', item: { id, status, filingDate: date }, op: 'update' });
  };

  const performGroundingSearch = async (query: string) => {
      dispatch({ type: 'SET_STATE', payload: { isSearching: true } });
      const results = await searchIRSManual(query);
      dispatch({ type: 'SET_STATE', payload: { isSearching: false, searchResults: results } });
  };

  const submitW2Report = (entityId: string, wages: number, fed: number, ss: number, med: number) => {
      console.log(`Submitting W2 for ${entityId}: ${wages}`);
  };

  const addUser = (user: User) => dispatch({ type: 'GENERIC_UPDATE', collection: 'users', item: user, op: 'add' });
  const updateUser = (user: User) => dispatch({ type: 'GENERIC_UPDATE', collection: 'users', item: user, op: 'update' });
  const deleteUser = (id: string) => dispatch({ type: 'GENERIC_UPDATE', collection: 'users', item: id, op: 'delete' });

  const updateSecrets = (secrets: Partial<ApiSecrets>) => {
      dispatch({ type: 'SET_STATE', payload: { secrets: { ...state.secrets, ...secrets } } });
  };

  const updateSettings = (settings: Partial<SystemSettings>) => {
      dispatch({ type: 'SET_STATE', payload: { settings: { ...state.settings, ...settings } } });
  };

  const generateSyntheticData = () => {};

  const resetData = () => {
      dispatch({ type: 'SET_STATE', payload: INITIAL_STATE });
  };

  const importData = (data: string) => {
      try {
          const parsed = JSON.parse(data);
          dispatch({ type: 'SET_STATE', payload: parsed });
      } catch (e) {
          console.error("Import failed", e);
      }
  };

  const runPayroll = (entityId: string, periodStart: string, periodEnd: string, payDate: string, moduleId: string) => {
      const activeEmps = state.employees.filter(e => e.entityId === entityId && e.status === 'Active');
      const totalGross = activeEmps.reduce((sum, e) => sum + (e.salary / 26), 0);
      const totalEmployerTax = totalGross * 0.0765;
      const totalNetPay = totalGross * 0.80; 
      
      const newRun: PayrollRun = {
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
      };
      dispatch({ type: 'GENERIC_UPDATE', collection: 'payrollRuns', item: newRun, op: 'add' });
  };

  const submitFilingViaAPI = async (filingId: string) => {
      const filing = state.filings.find(f => f.id === filingId);
      if (!filing) return;
      const entity = state.entities.find(e => e.id === filing.entityId);
      if (!entity) return;

      const log = await simulateTransmission(entity, filing.formType, state.settings.fuzzing);
      dispatch({ type: 'GENERIC_UPDATE', collection: 'transmissions', item: log, op: 'add' });
      
      if (log.status === 'Accepted') {
          updateFilingStatus(filingId, 'Accepted', new Date().toISOString());
      } else {
          updateFilingStatus(filingId, 'Rejected');
      }
  };

  const registerBSOEmployer = async (entityId: string, bsoId: string) => {
      const role: BSORole = {
          id: uuidv4(),
          entityId,
          roleType: 'Employer',
          bsoId,
          registrationStatus: 'Active'
      };
      dispatch({ type: 'GENERIC_UPDATE', collection: 'bsoRoles', item: role, op: 'add' });
  };

  const createAccord = (r: AccordRecord) => dispatch({ type: 'GENERIC_UPDATE', collection: 'accords', item: r, op: 'add' });
  const createPrivateAdminEntry = (r: PrivateAdminRecord) => console.log('Private Admin', r);
  const resolveTaxpayerAccount = (r: ResolutionRecord) => dispatch({ type: 'GENERIC_UPDATE', collection: 'resolutions', item: r, op: 'add' });
  const createReSitus = (r: ReSitusRecord) => dispatch({ type: 'GENERIC_UPDATE', collection: 'reSitusRecords', item: r, op: 'add' });

  // Employee CRUD
  const addEmployee = (emp: Employee) => dispatch({ type: 'GENERIC_UPDATE', collection: 'employees', item: { ...emp, id: emp.id || uuidv4() }, op: 'add' });
  const updateEmployee = (emp: Employee) => dispatch({ type: 'GENERIC_UPDATE', collection: 'employees', item: emp, op: 'update' });
  const deleteEmployee = (id: string) => dispatch({ type: 'GENERIC_UPDATE', collection: 'employees', item: id, op: 'delete' });

  // Contractor CRUD
  const addContractor = (con: Contractor) => dispatch({ type: 'GENERIC_UPDATE', collection: 'contractors', item: { ...con, id: con.id || uuidv4() }, op: 'add' });
  const updateContractor = (con: Contractor) => dispatch({ type: 'GENERIC_UPDATE', collection: 'contractors', item: con, op: 'update' });
  const deleteContractor = (id: string) => dispatch({ type: 'GENERIC_UPDATE', collection: 'contractors', item: id, op: 'delete' });

  // Fiduciary & Governance
  const addFiduciaryAction = (action: FiduciaryAction) => dispatch({ type: 'GENERIC_UPDATE', collection: 'fiduciaryActions', item: action, op: 'add' });
  const updateFiduciaryAction = (action: FiduciaryAction) => dispatch({ type: 'GENERIC_UPDATE', collection: 'fiduciaryActions', item: action, op: 'update' });
  const addBOIReport = (report: BOIReport) => dispatch({ type: 'GENERIC_UPDATE', collection: 'boiReports', item: report, op: 'add' });

  const value = {
    ...state,
    addEntity,
    updateEntity,
    deleteEntity,
    postJournal,
    createFiling,
    updateFilingStatus,
    performGroundingSearch,
    submitW2Report,
    addUser,
    updateUser,
    deleteUser,
    updateSecrets,
    updateSettings,
    generateSyntheticData,
    resetData,
    importData,
    runPayroll,
    submitFilingViaAPI,
    registerBSOEmployer,
    createAccord,
    createPrivateAdminEntry,
    resolveTaxpayerAccount,
    createReSitus,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addContractor,
    updateContractor,
    deleteContractor,
    addFiduciaryAction,
    updateFiduciaryAction,
    addBOIReport,
    fileAllDrafts: () => {},
    linkDocument: () => {}
  };

  return React.createElement(LedgerContext.Provider, { value }, children);
};

export const useLedgerStore = () => useContext(LedgerContext);
