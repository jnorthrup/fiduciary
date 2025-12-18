
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Entity, Account, TaxModule, JournalEntry, Contractor, ComplianceFiling, 
  WalletCredential, BSORole, BSOSubmission, IRSAPICredential, Employee, 
  PayrollRun, IRMDocument, SSAStatement, TransmissionLog, SystemStatus, 
  SearchResult, AccordRecord, PrivateAdminRecord, ResolutionRecord, 
  ReSitusRecord, User, ChangeSet, ApiSecrets, SystemSettings,
  EntityType, EntityRole, IRSFormType, DCFlag, FiduciaryAction, BOIReport, ParcelRecord,
  EdgarResearchRecord, ACHRecord, CRMPerson, Interaction, PatchOperation,
  InstrumentExchangeRecord, AccountType, DTCCPledgeRecord
} from '../types';
import { simulateTransmission, getSystemStatus, searchIRSManual } from './irsApiService';

const SCHEMA_HASH = "8f7e3c9a1b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f";
const STORAGE_KEY = 'TRUST_LEDGER_STATE_V1';

const CORP_NAMES = ["Aetherial Logistics", "Nebula Bio-Labs", "Solstice Dynamics", "Ironwood Infrastructure", "Vanguard Cybernetics", "Oasis Ag-Tech", "Prism Data Systems", "Titanium Holdings", "Obsidian Capital", "Vertex Research"];
const TRUST_PREFIXES = ["Silver Lining", "Meridian", "Heritage", "Sovereign", "North Star", "Legacy", "Iron Gate", "Golden Anchor"];

const ASSET_POOL = [
    { name: "Gold Bullion (LBMA)", code: "108000", volatility: 0.05, base: 500000, category: 'Precious Metals' },
    { name: "Commercial Real Estate (Lot 42)", code: "110000", volatility: 0.03, base: 1200000, category: 'Real Estate' },
    { name: "Proprietary Algorithm IP", code: "115000", volatility: 0.15, base: 250000, category: 'Intangibles' },
    { name: "Digital Commodity Portfolio", code: "109000", volatility: 0.45, base: 100000, category: 'Digital Assets' },
    { name: "Rare Earth Mineral Rights", code: "112000", volatility: 0.12, base: 750000, category: 'Natural Resources' }
];

interface LedgerState {
  schemaHash: string;
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
  boiReports: BOIReport[];
  instrumentExchanges: InstrumentExchangeRecord[];
  dtccRecords: DTCCPledgeRecord[]; // Added DTCC
  apiSystemStatus: SystemStatus[];
  searchResults: SearchResult[];
  isSearching: boolean;
  users: User[];
  currentUser: User;
  secrets: ApiSecrets;
  settings: SystemSettings;
  changeGraph: ChangeSet[];
  headHash: string;
}

const INITIAL_STATE: LedgerState = {
  schemaHash: SCHEMA_HASH,
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
  boiReports: [],
  instrumentExchanges: [],
  dtccRecords: [],
  apiSystemStatus: getSystemStatus(),
  searchResults: [],
  isSearching: false,
  users: [
    { id: 'USR-001', name: 'System Owner', email: 'admin@trustledger.local', role: 'Owner', avatarInitials: 'SO', lastActive: 'Now', _version: '0' }
  ],
  currentUser: { id: 'USR-001', name: 'System Owner', email: 'admin@trustledger.local', role: 'Owner', avatarInitials: 'SO', lastActive: 'Now', _version: '0' },
  secrets: { irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' },
  settings: { fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Fast' }, network: 'Testnet' },
  changeGraph: [],
  headHash: 'GENESIS'
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
      default: return state;
  }
};

const LedgerContext = createContext<any>(null);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const isHydrated = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: { ...INITIAL_STATE, ...parsed, schemaHash: SCHEMA_HASH } });
      } catch (e) {
        console.error("Ledger hydration failed", e);
      }
    }
    isHydrated.current = true;
  }, []);

  useEffect(() => {
    if (isHydrated.current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const commitToLedger = (desc: string, ops: PatchOperation[]) => {
      const changeset: ChangeSet = {
          hash: uuidv4().replace(/-/g, ''),
          parentHash: state.headHash,
          timestamp: Date.now(),
          author: state.currentUser.name,
          description: desc,
          operations: ops
      };
      dispatch({ type: 'COMMIT_CHANGE', changeset });
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
      const prev = state.entities.find(e => e.id === id);
      dispatch({ type: 'GENERIC_UPDATE', collection: 'entities', item: { id, ...updates }, op: 'update' });
      if (updates.parentEntityId !== undefined && updates.parentEntityId !== prev?.parentEntityId) {
          commitToLedger(`Reparented Entity: ${prev?.name}`, [
              { op: 'replace', path: `entities/${id}/parentEntityId`, value: updates.parentEntityId, prevValue: prev?.parentEntityId }
          ]);
      }
  };

  const deleteEntity = (id: string) => {
      const target = state.entities.find(e => e.id === id);
      dispatch({ type: 'GENERIC_UPDATE', collection: 'entities', item: id, op: 'delete' });
      commitToLedger(`Deleted Entity: ${target?.name}`, [
          { op: 'remove', path: `entities/${id}` }
      ]);
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
      
      lines.forEach(line => {
          const account = state.accounts.find(a => a.code === line.accountCode && a.entityId === entityId);
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

  const generateSampleEnterprise = async () => {
    const corpName = CORP_NAMES[Math.floor(Math.random() * CORP_NAMES.length)];
    const trustName = `${TRUST_PREFIXES[Math.floor(Math.random() * TRUST_PREFIXES.length)]} Management Trust`;
    const einSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const selectedResource = ASSET_POOL[Math.floor(Math.random() * ASSET_POOL.length)];

    // 1. Create Entities
    const trust: Entity = {
        id: uuidv4(),
        name: trustName,
        type: EntityType.TRUST,
        role: EntityRole.HOLDING_TRUST,
        einLast4: einSuffix,
        parentEntityId: null,
        _version: uuidv4(),
        uiPosition: { x: 0, y: 0 }
    };
    
    const llc: Entity = {
        id: uuidv4(),
        name: corpName + " LLC",
        type: EntityType.LLC,
        role: EntityRole.OPERATING_LLC,
        einLast4: (parseInt(einSuffix) + 1).toString().slice(-4),
        parentEntityId: trust.id,
        _version: uuidv4(),
        uiPosition: { x: 0, y: 320 }
    };

    // 2. Setup Historical Metadata
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 5;
    const trustTimeSeries = [];
    const llcTimeSeries = [];
    const historicalJournals: JournalEntry[] = [];
    const historicalAccounts: Account[] = [];
    const historicalFilings: ComplianceFiling[] = [];

    // 3. Setup CoA
    const trustCashId = uuidv4();
    const trustCorpusId = uuidv4();
    const resAssetId = uuidv4();
    
    historicalAccounts.push(
        { id: trustCashId, entityId: trust.id, code: '101000', name: 'Operating Cash', type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 150000, _version: '1' },
        { id: resAssetId, entityId: trust.id, code: selectedResource.code, name: selectedResource.name, type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: selectedResource.base, _version: '1' },
        { id: trustCorpusId, entityId: trust.id, code: '300000', name: 'Trust Corpus', type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: selectedResource.base + 150000, _version: '1' }
    );

    const llcCashId = uuidv4();
    const llcEquityId = uuidv4();
    historicalAccounts.push(
        { id: llcCashId, entityId: llc.id, code: '101000', name: 'LLC Operating Cash', type: AccountType.ASSET, normalBalance: DCFlag.Debit, balance: 45000, _version: '1' },
        { id: llcEquityId, entityId: llc.id, code: '300000', name: 'Member Capital', type: AccountType.EQUITY, normalBalance: DCFlag.Credit, balance: 45000, _version: '1' }
    );

    // 4. Generate 5 Years of Chronological Data
    let runningTrustVal = selectedResource.base;
    let runningLlcVal = 45000;

    for (let i = 0; i <= 5; i++) {
        const year = startYear + i;
        const growthFactor = 1 + (selectedResource.volatility * (0.5 + Math.random()));
        runningTrustVal *= growthFactor;
        runningLlcVal *= 1.15; // Steady 15% LLC growth

        trustTimeSeries.push({ date: `${year}-12-31`, value: Math.round(runningTrustVal), projected: false });
        llcTimeSeries.push({ date: `${year}-12-31`, value: Math.round(runningLlcVal), projected: false });

        // Annual Revaluation Journal (Lite Recording)
        historicalJournals.push({
            id: uuidv4(),
            entityId: trust.id,
            date: `${year}-12-31`,
            memo: `Annual Fiduciary Revaluation & Asset Accumulation (${year}) - ${selectedResource.category}`,
            type: 'YEAR_END',
            lines: [
                { id: uuidv4(), accountId: resAssetId, accountName: selectedResource.name, accountCode: selectedResource.code, dc: DCFlag.Debit, amount: Math.round(runningTrustVal * 0.05) },
                { id: uuidv4(), accountId: trustCorpusId, accountName: 'Trust Corpus', accountCode: '300000', dc: DCFlag.Credit, amount: Math.round(runningTrustVal * 0.05) }
            ],
            locked: true,
            _version: uuidv4()
        });

        // Seed Compliance History (Form 56, FBAR/FinCEN context)
        if (i === 0) {
            historicalFilings.push({
                id: uuidv4(),
                entityId: trust.id,
                formType: '56',
                status: 'Accepted',
                filingDate: `${year}-02-14`,
                notes: 'Initial Notice of Fiduciary Relationship Established',
                _version: uuidv4()
            });
        }
        
        // Every year add an FBAR-representative filing for the LLC
        historicalFilings.push({
            id: uuidv4(),
            entityId: llc.id,
            formType: 'NTDO-Cert', // Used as proxy for FinCEN Foreign Bank Account Report in this model
            status: 'Accepted',
            filingDate: `${year}-06-30`,
            notes: `BSA E-Filing System: Annual FBAR Compliance (Form 114) for fiscal year ${year}`,
            _version: uuidv4()
        });
    }

    trust.modelData = { vizType: 'D3_SERIES', timeSeries: trustTimeSeries };
    llc.modelData = { vizType: 'D3_SERIES', timeSeries: llcTimeSeries };

    // 5. Seed Counterparties (CRM)
    const counterparties: CRMPerson[] = [
        {
            id: uuidv4(),
            entityId: llc.id,
            name: "FinCEN Regulatory Gateway",
            type: 'Organization',
            industry: 'Government',
            status: 'Active',
            kycStatus: 'Passed',
            kycDate: `${currentYear}-01-01`,
            interactions: [
                { id: uuidv4(), date: `${currentYear}-01-05`, type: 'Note', notes: 'Automated verification of BSA ID and e-filing credentials.', authorId: 'USR-001' }
            ],
            _version: '1'
        },
        {
            id: uuidv4(),
            entityId: llc.id,
            name: "Meridian Fiduciary Services",
            type: 'Organization',
            industry: 'Professional Services',
            status: 'Active',
            kycStatus: 'Passed',
            kycDate: `${currentYear}-02-10`,
            interactions: [],
            _version: '1'
        }
    ];

    // Commit state
    dispatch({ type: 'SET_STATE', payload: { 
        entities: [...state.entities, trust, llc],
        accounts: [...state.accounts, ...historicalAccounts],
        journals: [...state.journals, ...historicalJournals],
        filings: [...state.filings, ...historicalFilings],
        crmPeople: [...state.crmPeople, ...counterparties]
    } });

    commitToLedger(`Deployed High-Fidelity Enterprise: ${corpName} backed by ${selectedResource.name}`, [
        { op: 'add', path: `entities/${trust.id}`, value: trust },
        { op: 'add', path: `entities/${llc.id}`, value: llc }
    ]);
  };

  const addInstrumentExchange = (record: InstrumentExchangeRecord) => {
      dispatch({ type: 'GENERIC_UPDATE', collection: 'instrumentExchanges', item: record, op: 'add' });
      commitToLedger(`Instrument Exchange: ${record.reason}`, [
          { op: 'add', path: `exchanges/${record.id}`, value: record }
      ]);
  };

  const addDTCCRecord = (record: DTCCPledgeRecord) => {
      dispatch({ type: 'GENERIC_UPDATE', collection: 'dtccRecords', item: record, op: 'add' });
      commitToLedger(`DTCC Pledge: ${record.cusip} (${record.controlNumber})`, [
          { op: 'add', path: `dtcc/${record.id}`, value: record }
      ]);
  };

  const updateDTCCRecord = (record: DTCCPledgeRecord) => {
      dispatch({ type: 'GENERIC_UPDATE', collection: 'dtccRecords', item: record, op: 'update' });
      commitToLedger(`DTCC Update: ${record.cusip} Status: ${record.status}`, [
          { op: 'replace', path: `dtcc/${record.id}/status`, value: record.status }
      ]);
  };

  const value = {
    ...state,
    addEntity,
    updateEntity,
    deleteEntity,
    postJournal,
    addInstrumentExchange,
    addDTCCRecord,
    updateDTCCRecord,
    generateSampleEnterprise,
    importData: (data: string) => {
        try {
            const parsed = JSON.parse(data);
            dispatch({ type: 'LOAD_STATE', payload: { ...INITIAL_STATE, ...parsed } });
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
    addACHRecord: (record: ACHRecord) => dispatch({ type: 'GENERIC_UPDATE', collection: 'achRecords', item: record, op: 'add' }),
    addCRMPerson: (p: CRMPerson) => dispatch({ type: 'GENERIC_UPDATE', collection: 'crmPeople', item: p, op: 'add' }),
    updateCRMPerson: (p: CRMPerson) => dispatch({ type: 'GENERIC_UPDATE', collection: 'crmPeople', item: p, op: 'update' }),
    deleteCRMPerson: (id: string) => dispatch({ type: 'GENERIC_UPDATE', collection: 'crmPeople', item: id, op: 'delete' }),
    addInteraction: (pId: string, i: Interaction) => {
        const p = state.crmPeople.find(x => x.id === pId);
        if (p) dispatch({ type: 'GENERIC_UPDATE', collection: 'crmPeople', item: { ...p, interactions: [i, ...p.interactions] }, op: 'update' });
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
        localStorage.removeItem(STORAGE_KEY);
        dispatch({ type: 'LOAD_STATE', payload: INITIAL_STATE });
    },
    submitFilingViaAPI: async (filingId: string) => {
        const filing = state.filings.find(f => f.id === filingId);
        if (!filing) return;
        const entity = state.entities.find(e => e.id === filing.entityId);
        if (!entity) return;
        const log = await simulateTransmission(entity, filing.formType, state.settings.fuzzing);
        dispatch({ type: 'GENERIC_UPDATE', collection: 'transmissions', item: log, op: 'add' });
        if (log.status === 'Accepted') dispatch({ type: 'GENERIC_UPDATE', collection: 'filings', item: { id: filingId, status: 'Accepted', filingDate: new Date().toISOString() }, op: 'update' });
    },
    submitW2Report: (wages: number, fedTax: number, ssTax: number, medTax: number) => {
        commitToLedger(`W-2 Report Filed: Gross ${wages}`, [
            { op: 'add', path: 'filings/w2', value: { wages, fedTax, ssTax, medTax } }
        ]);
    },
    generateSyntheticData: () => {
        const synthJournal: JournalEntry = {
            id: uuidv4(),
            entityId: state.entities.length > 0 ? state.entities[0].id : 'GENESIS',
            date: new Date().toISOString().split('T')[0],
            memo: "System Genesis Marker",
            type: "GENESIS",
            lines: [],
            locked: true,
            _version: uuidv4()
        };
        dispatch({ type: 'GENERIC_UPDATE', collection: 'journals', item: synthJournal, op: 'add' });
        commitToLedger("Genesis record generated", [{ op: 'add', path: 'journals/genesis', value: synthJournal }]);
    },
    generateModelData: (id: string) => {
        const updates = { modelData: { vizType: 'D3_SERIES', timeSeries: [{ date: new Date().toISOString().split('T')[0], value: 0, projected: false }] } };
        dispatch({ type: 'GENERIC_UPDATE', collection: 'entities', item: { id, ...updates }, op: 'update' });
    },
    registerBSOEmployer: async (entityId: string, bsoId: string) => {
        dispatch({ type: 'GENERIC_UPDATE', collection: 'bsoRoles', item: { id: uuidv4(), entityId, roleType: 'Employer', bsoId, registrationStatus: 'Active' }, op: 'add' });
    },
    createAccord: (r: AccordRecord) => dispatch({ type: 'GENERIC_UPDATE', collection: 'accords', item: r, op: 'add' }),
    resolveTaxpayerAccount: (r: ResolutionRecord) => dispatch({ type: 'GENERIC_UPDATE', collection: 'resolutions', item: r, op: 'add' }),
    createReSitus: (r: ReSitusRecord) => dispatch({ type: 'GENERIC_UPDATE', collection: 'reSitusRecords', item: r, op: 'add' }),
    addEmployee: (emp: Employee) => dispatch({ type: 'GENERIC_UPDATE', collection: 'employees', item: { ...emp, id: emp.id || uuidv4() }, op: 'add' }),
    updateEmployee: (emp: Employee) => dispatch({ type: 'GENERIC_UPDATE', collection: 'employees', item: emp, op: 'update' }),
    deleteEmployee: (id: string) => dispatch({ type: 'GENERIC_UPDATE', collection: 'employees', item: id, op: 'delete' }),
    addContractor: (con: Contractor) => dispatch({ type: 'GENERIC_UPDATE', collection: 'contractors', item: { ...con, id: con.id || uuidv4() }, op: 'add' }),
    updateContractor: (con: Contractor) => dispatch({ type: 'GENERIC_UPDATE', collection: 'contractors', item: con, op: 'update' }),
    deleteContractor: (id: string) => dispatch({ type: 'GENERIC_UPDATE', collection: 'contractors', item: id, op: 'delete' }),
    updateSecrets: (secrets: Partial<ApiSecrets>) => dispatch({ type: 'SET_STATE', payload: { secrets: { ...state.secrets, ...secrets } } }),
    updateSettings: (settings: Partial<SystemSettings>) => dispatch({ type: 'SET_STATE', payload: { settings: { ...state.settings, ...settings } } }),
  };

  return React.createElement(LedgerContext.Provider, { value }, children);
};

export const useLedgerStore = () => useContext(LedgerContext);
