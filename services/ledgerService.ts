
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Entity, Account, TaxModule, JournalEntry, Contractor, ComplianceFiling, 
  WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, 
  PayrollRun, IRMDocument, SSAStatement, TransmissionLog, SystemStatus, 
  SearchResult, AccordRecord, PrivateAdminRecord, ResolutionRecord, 
  ReSitusRecord, User, ChangeSet, ApiSecrets, SystemSettings,
  EntityType, EntityRole, IRSFormType, DCFlag, FiduciaryAction, BOIReport, ParcelRecord,
  EdgarResearchRecord, ACHRecord, CRMPerson, Interaction, PatchOperation,
  InstrumentExchangeRecord, AccountType, DTCCPledgeRecord, FiduciaryReview, EscrowAccount, TicklerRecord, FedwireRecord,
  CanalRecord, StorageSource, TimeSeriesPoint, ChanceryFiling, PerfectionInstruction, CreditDefenseRecord, ComplianceViolation, IntrusionRecord
} from '../types';
import { simulateTransmission, getSystemStatus, searchIRSManual } from './irsApiService';
import { checkCompliance } from './complianceRules';
import { 
  SEED_ENTITIES, SEED_ACCOUNTS, SEED_MODULES, SEED_FILINGS, 
  SEED_CONTRACTORS, SEED_WALLETS, SEED_BSO_ROLES, SEED_BSO_SUBMISSIONS, 
  SEED_IRS_CREDS, SEED_EMPLOYEES, SEED_PAYROLL_RUNS, SEED_SSA_STATEMENTS, 
  SEED_DOCUMENTS, SEED_RESOLUTIONS, SEED_JOURNALS, SEED_CREDIT_DEFENSE, SEED_INTRUSIONS
} from './mockData';

const SCHEMA_HASH = "8f7e3c9a1b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f";
const STORAGE_KEY = 'TRUST_LEDGER_STATE_REBOOT_V1';

interface LedgerState {
  schemaHash: string;
  source: StorageSource;
  entities: Entity[];
  accounts: Account[];
  modules: TaxModule[];
  journals: JournalEntry[];
  contractors: Contractor[];
  filings: ComplianceFiling[];
  wallets: WalletCredential[];
  parcels: ParcelRecord[];
  edgarRecords: EdgarResearchRecord[]; 
  achRecords: ACHRecord[];
  crmPeople: CRMPerson[];
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
  fiduciaryActions: FiduciaryAction[];
  fiduciaryReviews: FiduciaryReview[];
  boiReports: BOIReport[];
  escrows: EscrowAccount[];
  ticks: TicklerRecord[];
  fedWires: FedwireRecord[];
  canalRecords: CanalRecord[];
  instrumentExchanges: InstrumentExchangeRecord[];
  dtccRecords: DTCCPledgeRecord[];
  chanceryFilings: ChanceryFiling[];
  perfections: PerfectionInstruction[];
  creditDefenseRecords: CreditDefenseRecord[];
  intrusions: IntrusionRecord[];
  apiSystemStatus: SystemStatus[];
  searchResults: SearchResult[];
  isSearching: boolean;
  users: User[];
  currentUser: User;
  secrets: ApiSecrets;
  settings: SystemSettings;
  changeGraph: ChangeSet[];
  headHash: string;
  
  // Compliance
  activeViolation: ComplianceViolation | null;
}

const INITIAL_USER: User = { 
  id: 'USR-GENESIS', 
  name: '', 
  email: '', 
  role: 'Owner', 
  avatarInitials: '??', 
  lastActive: 'Initializing', 
  _version: '0' 
};

const INITIAL_STATE: LedgerState = {
  schemaHash: SCHEMA_HASH,
  source: 'Simulation',
  entities: [], 
  accounts: [],
  modules: [],
  journals: [],
  contractors: [],
  filings: [],
  wallets: [],
  parcels: [],
  edgarRecords: [],
  achRecords: [],
  crmPeople: [],
  bsoRoles: [],
  bsoSubmissions: [],
  irsCreds: [],
  employees: [],
  payrollRuns: [],
  ssaStatements: [],
  documents: [],
  transmissions: [],
  accords: [],
  resolutions: [],
  reSitusRecords: [],
  fiduciaryActions: [],
  fiduciaryReviews: [],
  boiReports: [],
  escrows: [],
  ticks: [],
  fedWires: [],
  canalRecords: [],
  instrumentExchanges: [],
  dtccRecords: [],
  chanceryFilings: [],
  perfections: [],
  creditDefenseRecords: [],
  intrusions: [],
  apiSystemStatus: getSystemStatus(),
  searchResults: [],
  isSearching: false,
  users: [INITIAL_USER],
  currentUser: INITIAL_USER,
  secrets: { irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' },
  settings: { fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Fast' }, network: 'Testnet' },
  changeGraph: [],
  headHash: 'GENESIS',
  activeViolation: null
};

const reducer = (state: LedgerState, action: any): LedgerState => {
  switch (action.type) {
      case 'LOAD_STATE': return { ...action.payload, isSearching: false, searchResults: [] };
      case 'SET_STATE': return { ...state, ...action.payload };
      case 'GENERIC_UPDATE': {
          const { collection, item, op } = action;
          const list = (state as any)[collection] as any[];
          let newList;
          if (op === 'add') newList = [...list, item];
          else if (op === 'update') newList = list.map(i => i.id === item.id ? { ...i, ...item } : i);
          else if (op === 'delete') newList = list.filter(i => i.id !== (typeof item === 'string' ? item : item.id));
          else newList = list;
          return { ...state, [collection]: newList };
      }
      case 'COMMIT_CHANGE': {
          return { 
              ...state, 
              changeGraph: [...state.changeGraph, action.changeset],
              headHash: action.changeset.hash
          };
      }
      case 'SET_VIOLATION': {
          return { ...state, activeViolation: action.payload };
      }
      case 'CLEAR_VIOLATION': {
          return { ...state, activeViolation: null };
      }
      default: return state;
  }
};

const LedgerContext = createContext<any>(null);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [canResume, setCanResume] = useState(false);
  const isHydrated = useRef(false);
  const isWiping = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: { ...INITIAL_STATE, ...parsed, schemaHash: SCHEMA_HASH, source: 'Persistence' } });
        if (parsed.currentUser?.name) {
          setCanResume(true);
        }
      } catch (e) {
        console.error("Ledger hydration failed", e);
      }
    }
    isHydrated.current = true;
  }, []);

  useEffect(() => {
    if (isHydrated.current && !isWiping.current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const setInitialOwner = (name: string, email: string) => {
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const updatedUser = { ...state.currentUser, name, email, avatarInitials: initials, lastActive: 'Now' };
      
      dispatch({ type: 'SET_STATE', payload: { 
          currentUser: updatedUser,
          users: [updatedUser],
          source: 'Persistence'
      }});
      
      commitToLedger(`Initialized Fiduciary Environment: ${name}`, [
          { op: 'replace', path: 'currentUser/name', value: name }
      ]);
  };

  const loadJimProfile = () => {
    const name = "James R. Northrup Jr.";
    const email = "james@northrup.private";
    const initials = "JN";
    const updatedUser = { ...INITIAL_USER, name, email, avatarInitials: initials, lastActive: 'Now' };
    
    dispatch({ type: 'SET_STATE', payload: { 
        currentUser: updatedUser,
        users: [updatedUser],
        entities: SEED_ENTITIES, 
        accounts: SEED_ACCOUNTS,
        modules: SEED_MODULES,
        filings: SEED_FILINGS,
        resolutions: SEED_RESOLUTIONS,
        journals: SEED_JOURNALS, // 5 Years of History
        creditDefenseRecords: SEED_CREDIT_DEFENSE, // Experian CCPA
        intrusions: SEED_INTRUSIONS, // "Evil" Nodes
        source: 'Persistence'
    }});
  };

  const loadSyntheticFuzz = () => {
    // ... (existing implementation)
    const name = "Synthetic Node Controller";
    const email = "fuzz@synthetic-ledger.local";
    const initials = "SN";
    const updatedUser = { ...INITIAL_USER, name, email, avatarInitials: initials, lastActive: 'Now' };
    
    const generateHistory = (baseVal: number, vol: number): TimeSeriesPoint[] => {
      const points: TimeSeriesPoint[] = [];
      const today = new Date();
      for (let i = 60; i >= 0; i--) {
        const d = new Date(today);
        d.setMonth(today.getMonth() - i);
        points.push({
          date: d.toISOString().split('T')[0],
          value: baseVal + (Math.random() - 0.5) * vol * baseVal,
          projected: false
        });
      }
      return points;
    };

    const synthEntities: Entity[] = [
      {
        id: "ENT-FUZZ-ROOT",
        name: "Sterling Private Fiduciary",
        type: EntityType.TRUST,
        role: EntityRole.HOLDING_TRUST,
        einLast4: "9901",
        parentEntityId: null,
        modelData: {
          vizType: 'D3_SERIES',
          timeSeries: generateHistory(1000000, 0.1)
        },
        _version: "1"
      },
      {
        id: "ENT-FUZZ-LLC1",
        name: "Vanguard Systems Unltd",
        type: EntityType.LLC,
        role: EntityRole.OPERATING_LLC,
        einLast4: "4402",
        parentEntityId: "ENT-FUZZ-ROOT",
        modelData: {
          vizType: 'D3_SERIES',
          timeSeries: generateHistory(250000, 0.4)
        },
        _version: "1"
      }
    ];

    dispatch({ type: 'SET_STATE', payload: { 
        currentUser: updatedUser,
        users: [updatedUser],
        entities: synthEntities, 
        accounts: [],
        modules: [],
        journals: [],
        source: 'Simulation'
    }});
  };

  const commitToLedger = (desc: string, ops: PatchOperation[]) => {
      const changeset: ChangeSet = {
          hash: uuidv4().replace(/-/g, ''),
          parentHash: state.headHash,
          timestamp: Date.now(),
          author: state.currentUser.name || 'System',
          description: desc,
          operations: ops
      };
      dispatch({ type: 'COMMIT_CHANGE', changeset });
  };

  const clearViolation = () => dispatch({ type: 'CLEAR_VIOLATION' });

  // --- ACTIONS ---

  const addChanceryFiling = (filing: ChanceryFiling) => {
    dispatch({ type: 'GENERIC_UPDATE', collection: 'chanceryFilings', item: filing, op: 'add' });
    commitToLedger(`Chancery Proceeding Initiated: ${filing.title}`, [
        { op: 'add', path: `chancery/${filing.id}`, value: filing }
    ]);
  };

  const addPerfection = (perfection: PerfectionInstruction) => {
    dispatch({ type: 'GENERIC_UPDATE', collection: 'perfections', item: perfection, op: 'add' });
    commitToLedger(`Perfection Process Triggered for ${perfection.recipientName}`, [
        { op: 'add', path: `perfections/${perfection.id}`, value: perfection }
    ]);
  };

  const addCreditDefenseRecord = (record: CreditDefenseRecord) => {
    dispatch({ type: 'GENERIC_UPDATE', collection: 'creditDefenseRecords', item: record, op: 'add' });
    commitToLedger(`Credit Defense: ${record.type} initiated for ${record.targetAgency}`, [
        { op: 'add', path: `defense/${record.id}`, value: record }
    ]);
  };

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
      
      const baseAccounts = [
          { id: uuidv4(), entityId: newEntity.id, code: '101000', name: 'Operating Cash', type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 0, _version: '1' },
          { id: uuidv4(), entityId: newEntity.id, code: '300000', name: role === EntityRole.HOLDING_TRUST ? 'Trust Corpus' : 'Member Capital', type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: 0, _version: '1' }
      ];
      baseAccounts.forEach(acc => dispatch({ type: 'GENERIC_UPDATE', collection: 'accounts', item: acc, op: 'add' }));

      commitToLedger(`Created Entity: ${newEntity.name}`, [
          { op: 'add', path: `entities/${newEntity.id}`, value: newEntity }
      ]);
      return Promise.resolve(newEntity);
  };

  const updateEntity = (id: string, updates: Partial<Entity>) => {
      const prev = state.entities.find((e: Entity) => e.id === id);
      
      // Compliance Check: Irrevocability
      if (prev && updates.type) {
          const violation = checkCompliance(['TRUST_IRREVOCABILITY'], { 
              entityType: prev.type, 
              trustSubType: prev.trustSubType, 
              action: 'CHANGE_TYPE' 
          });
          if (violation) {
              dispatch({ type: 'SET_VIOLATION', payload: violation });
              return;
          }
      }

      dispatch({ type: 'GENERIC_UPDATE', collection: 'entities', item: { id, ...updates }, op: 'update' });
      if (updates.parentEntityId !== undefined && updates.parentEntityId !== prev?.parentEntityId) {
          commitToLedger(`Hierarchy Changed: ${prev?.name}`, [
              { op: 'replace', path: `entities/${id}/parentEntityId`, value: updates.parentEntityId, prevValue: prev?.parentEntityId }
          ]);
      }
  };

  const postJournal = (entityId: string, date: string, memo: string, type: string, lines: any[]) => {
      const entity = state.entities.find((e: Entity) => e.id === entityId);
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

      // Compliance Checks
      const voucherViolation = checkCompliance(['VOUCHER_REQ'], { journal: newJournal, action: 'POST_JOURNAL' });
      if (voucherViolation) {
          dispatch({ type: 'SET_VIOLATION', payload: voucherViolation });
          return;
      }

      const comminglingViolation = checkCompliance(['COMMINGLING'], { entityRole: entity?.role, journal: newJournal });
      if (comminglingViolation) {
          // Warning only, proceed but alert
          dispatch({ type: 'SET_VIOLATION', payload: comminglingViolation });
      }

      dispatch({ type: 'GENERIC_UPDATE', collection: 'journals', item: newJournal, op: 'add' });
      
      lines.forEach(line => {
          const account = state.accounts.find((a: Account) => a.code === line.accountCode && a.entityId === entityId);
          if (account) {
              let impact = line.amount;
              const isNormalDebit = account.type === 'Asset' || account.type === 'Expense';
              if (isNormalDebit) {
                  impact = line.dc === DCFlag.Debit ? line.amount : -line.amount;
              } else {
                  impact = line.dc === DCFlag.Credit ? line.amount : -line.amount;
              }
              dispatch({ type: 'GENERIC_UPDATE', collection: 'accounts', item: { id: account.id, balance: account.balance + impact }, op: 'update' });
          }
      });

      commitToLedger(`Journal Entry: ${memo}`, [
          { op: 'add', path: `journals/${newJournal.id}`, value: newJournal }
      ]);
  };

  const submitFilingViaAPI = async (filingId: string) => {
      const filing = state.filings.find((f: ComplianceFiling) => f.id === filingId);
      if (!filing) return;
      const entity = state.entities.find((e: Entity) => e.id === filing.entityId);
      if (!entity) return;

      // Compliance Check: Auth
      const authViolation = checkCompliance(['AUTH_FILING'], { userRole: state.currentUser.role, action: 'FILE_RETURN' });
      if (authViolation) {
          dispatch({ type: 'SET_VIOLATION', payload: authViolation });
          return;
      }

      const log = await simulateTransmission(entity, filing.formType, state.settings.fuzzing);
      dispatch({ type: 'GENERIC_UPDATE', collection: 'transmissions', item: log, op: 'add' });
      if (log.status === 'Accepted') dispatch({ type: 'GENERIC_UPDATE', collection: 'filings', item: { id: filingId, status: 'Accepted', filingDate: new Date().toISOString() }, op: 'update' });
  };

  const value = {
    ...state,
    canResume,
    setInitialOwner,
    loadJimProfile,
    loadSyntheticFuzz,
    addChanceryFiling,
    addPerfection,
    addCreditDefenseRecord,
    addEntity,
    updateEntity,
    deleteEntity: (id: string) => {
        const target = state.entities.find((e: Entity) => e.id === id);
        dispatch({ type: 'GENERIC_UPDATE', collection: 'entities', item: id, op: 'delete' });
        commitToLedger(`Deleted Entity: ${target?.name}`, [
            { op: 'remove', path: `entities/${id}` }
        ]);
    },
    postJournal,
    importData: (data: string) => {
        try {
            const parsed = JSON.parse(data);
            dispatch({ type: 'LOAD_STATE', payload: { ...INITIAL_STATE, ...parsed, source: 'Persistence' } });
            if (parsed.currentUser?.name) setCanResume(true);
        } catch (e) {
            console.error("Manual import failed", e);
        }
    },
    addUser: (user: User) => dispatch({ type: 'GENERIC_UPDATE', collection: 'users', item: user, op: 'add' }),
    updateUser: (user: User) => {
        dispatch({ type: 'GENERIC_UPDATE', collection: 'users', item: user, op: 'update' });
        if (state.currentUser.id === user.id) dispatch({ type: 'SET_STATE', payload: { currentUser: user } });
    },
    deleteUser: (id: string) => dispatch({ type: 'GENERIC_UPDATE', collection: 'users', item: id, op: 'delete' }),
    addInteraction: (pId: string, i: Interaction) => {
        const p = state.crmPeople.find((x: CRMPerson) => x.id === pId);
        if (p) {
            dispatch({ type: 'GENERIC_UPDATE', collection: 'crmPeople', item: { ...p, interactions: [i, ...p.interactions] }, op: 'update' });
        }
    },
    createFiling: (entityId: string, formType: IRSFormType) => {
        dispatch({ type: 'GENERIC_UPDATE', collection: 'filings', item: { id: uuidv4(), entityId, formType, status: 'Drafted', _version: uuidv4() }, op: 'add' });
    },
    updateFilingStatus: (id: string, status: string, date?: string) => {
        dispatch({ type: 'GENERIC_UPDATE', collection: 'filings', item: { id, status, filingDate: date }, op: 'update' });
    },
    performGroundingSearch: async (query: string) => {
        dispatch({ type: 'SET_STATE', payload: { isSearching: true } });
        const results = await searchIRSManual(query);
        dispatch({ type: 'SET_STATE', payload: { isSearching: false, searchResults: results } });
    },
    addParcel: (parcel: ParcelRecord) => dispatch({ type: 'GENERIC_UPDATE', collection: 'parcels', item: { ...parcel, _version: uuidv4() }, op: 'add' }),
    addEdgarRecord: (record: EdgarResearchRecord) => dispatch({ type: 'GENERIC_UPDATE', collection: 'edgarRecords', item: { ...record, _version: uuidv4() }, op: 'add' }),
    resetData: () => {
        isWiping.current = true;
        localStorage.removeItem(STORAGE_KEY);
        localStorage.clear(); 
        dispatch({ type: 'LOAD_STATE', payload: { ...INITIAL_STATE, source: 'Simulation' } });
        setCanResume(false);
    },
    submitFilingViaAPI,
    updateSecrets: (secrets: Partial<ApiSecrets>) => dispatch({ type: 'SET_STATE', payload: { secrets: { ...state.secrets, ...secrets } } }),
    updateSettings: (settings: Partial<SystemSettings>) => dispatch({ type: 'SET_STATE', payload: { settings: { ...state.settings, ...settings } } }),
    clearViolation
  };

  return React.createElement(LedgerContext.Provider, { value }, children);
};

export const useLedgerStore = () => useContext(LedgerContext);
