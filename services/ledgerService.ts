
import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as types from '../types';
import { simulateTransmission, searchIRSManual } from './irsApiService';
import { UseCaseLogger } from './useCaseLogger';
import { logger } from './logger';
import { GoogleGenAI } from "@google/genai";
import { cryptoService } from './cryptoService';
import * as accountService from './accountService';
import { storageService } from './storageService';

// Unified State Interface to reduce useState bloat
interface LedgerDb {
  entities: types.Entity[];
  accounts: types.Account[];
  journals: types.JournalEntry[];
  wallets: types.WalletCredential[];
  users: types.User[];
  modules: types.TaxModule[];
  filings: types.ComplianceFiling[];
  transmissions: types.TransmissionLog[];
  documents: types.IRMDocument[];
  canalRecords: types.CanalRecord[];
  crmPeople: types.CRMPerson[];
  escrows: types.EscrowAccount[];
  ticks: types.TicklerRecord[];
  fedWires: types.FedwireRecord[];
  contractors: types.Contractor[];
  bsoRoles: types.BSORole[];
  bsoSubmissions: types.BSOSubmission[];
  irsCreds: types.IRSAPICredential[];
  employees: types.Employee[];
  payrollRuns: types.PayrollRun[];
  ssaStatements: types.SSAStatement[];
  resolutions: types.ResolutionRecord[];
  purchaseContracts: types.PurchaseContract[];
  creditResolutions: types.CreditResolution[];
  creditInstruments: types.CreditInstrument[];
  closingRecords: types.ClosingRecord[];
  realEstateAssets: types.RealEstateAsset[];
  collateralPools: types.CollateralPool[];
  collateralItems: types.CollateralItem[];
  fiduciaryActions: types.FiduciaryAction[];
  resitusRecords: types.ReSitusRecord[];
  trustCertificates: types.TrustCertificate[];
  giftTaxRecords: types.GiftTaxRecord[];
  parcelRecords: types.ParcelRecord[];
  edgarResearchRecords: types.EdgarResearchRecord[];
  achRecords: types.ACHRecord[];
  instrumentExchangeRecords: types.InstrumentExchangeRecord[];
  dtccPledgeRecords: types.DTCCPledgeRecord[];
  fiduciaryReviews: types.FiduciaryReview[];
  agencyCertifications: types.AgencyCertification[];
  fsForm1010s: types.FSForm1010[];
  legalInstruments: types.LegalInstrument[];
  creditDefenseRecords: types.CreditDefenseRecord[];
  chanceryFilings: types.ChanceryFiling[];
  perfectionInstructions: types.PerfectionInstruction[];
  maradRecords: types.MaradRecord[];
  settlements: types.SettlementInstruction[];
  invoices: types.Invoice[];
  payables: types.Payable[];
  settlementConfirmations: types.SettlementConfirmation[];
}

// Empty State for Initialization before Data Load
const EMPTY_DB: LedgerDb = {
  entities: [], accounts: [], journals: [], wallets: [], users: [], modules: [], filings: [], transmissions: [],
  documents: [], canalRecords: [], crmPeople: [], escrows: [], ticks: [], fedWires: [],
  contractors: [], bsoRoles: [], bsoSubmissions: [],
  irsCreds: [], employees: [], payrollRuns: [],
  ssaStatements: [], resolutions: [], purchaseContracts: [],
  creditResolutions: [], creditInstruments: [], closingRecords: [],
  realEstateAssets: [], collateralPools: [], collateralItems: [],
  fiduciaryActions: [], resitusRecords: [], trustCertificates: [], giftTaxRecords: [], parcelRecords: [], edgarResearchRecords: [],
  achRecords: [], instrumentExchangeRecords: [], dtccPledgeRecords: [], fiduciaryReviews: [], agencyCertifications: [],
  fsForm1010s: [], legalInstruments: [], creditDefenseRecords: [],
  chanceryFilings: [], perfectionInstructions: [], maradRecords: [], settlements: [],
  invoices: [], payables: [], settlementConfirmations: []
};

// --- SUSPENSE UTILITIES ---

// Resource wrapper for Suspense
function createResource<T>(promise: Promise<T>) {
  let status = "pending";
  let result: T;
  let suspender = promise.then(
    (r) => {
      status = "success";
      result = r;
    },
    (e) => {
      status = "error";
      result = e;
    }
  );
  return {
    read() {
      if (status === "pending") {
        throw suspender;
      } else if (status === "error") {
        throw result;
      } else if (status === "success") {
        return result;
      }
      return result; // Should not happen
    },
  };
}

// The Async Data Fetcher
async function fetchLedgerData(key?: CryptoKey): Promise<{ db: LedgerDb, user: types.User, secrets: types.ApiSecrets, settings: types.SystemSettings }> {
  // 1. Initialize Unified Storage
  await storageService.init();

  // 2. Try Unified Storage first
  const saved = storageService.get<any>('ledger_state');
  if (saved) {
    try {
      const parsed = saved; // Data is already parsed by storageService
      // Ensure we merge with EMPTY_DB to ensure all keys exist even if storage is old
      const db = { ...EMPTY_DB, ...parsed };
      return {
        db: db,
        user: parsed.currentUser || {} as types.User,
        secrets: parsed.secrets || { irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' },
        settings: parsed.settings || { fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' }, network: 'Testnet' }
      };
    } catch (e) {
      console.error("Storage recovery error, falling back to seed", e);
    }
  }

  // 2. Production: Return empty DB (no mock data seeding)
  // Development: Load mock data for demo purposes
  if (!import.meta.env.DEV) {
    return {
      db: EMPTY_DB,
      user: {} as types.User,
      secrets: { irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' },
      settings: { fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' }, network: 'Mainnet' }
    };
  }

  // DEV ONLY: Fallback to Dynamic Import of Mock Data
  await new Promise(resolve => setTimeout(resolve, 800)); // Artificial delay to show Suspense
  const mockData = await import('./mockData');

  return {
    db: {
      ...EMPTY_DB,
      documents: mockData.SEED_DOCUMENTS,
      contractors: mockData.SEED_CONTRACTORS,
      bsoRoles: mockData.SEED_BSO_ROLES,
      bsoSubmissions: mockData.SEED_BSO_SUBMISSIONS,
      irsCreds: mockData.SEED_IRS_CREDS,
      employees: mockData.SEED_EMPLOYEES,
      payrollRuns: mockData.SEED_PAYROLL_RUNS,
      ssaStatements: mockData.SEED_SSA_STATEMENTS,
      resolutions: mockData.SEED_RESOLUTIONS,
      purchaseContracts: mockData.SEED_PURCHASE_CONTRACTS,
      creditResolutions: mockData.SEED_CREDIT_RESOLUTIONS,
      creditInstruments: mockData.SEED_CREDIT_INSTRUMENTS,
      closingRecords: mockData.SEED_CLOSING_RECORDS,
      realEstateAssets: mockData.SEED_REAL_ESTATE_ASSETS,
      collateralPools: mockData.SEED_COLLATERAL_POOLS,
      legalInstruments: mockData.SEED_LEGAL_INSTRUMENTS,
      creditDefenseRecords: mockData.SEED_CREDIT_DEFENSE,
      invoices: mockData.SEED_INVOICES,
      payables: mockData.SEED_PAYABLES,
      settlementConfirmations: mockData.SEED_SETTLEMENT_CONFIRMATIONS
    },
    user: {} as types.User,
    secrets: { irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' },
    settings: { fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' }, network: 'Testnet' }
  };
}

// Explicit Context Type Definition
type LedgerContextType = LedgerDb & {
  currentUser: types.User;
  apiSystemStatus: types.SystemStatus[];
  searchResults: types.SearchResult[];
  isSearching: boolean;
  secrets: types.ApiSecrets;
  settings: types.SystemSettings;
  changeGraph: types.ChangeSet[];
  canResume: boolean;
  isCloudEnabled: boolean;
  is2FAOpen: boolean;
  teachModeEnabled: boolean;

  // Methods
  setTeachModeEnabled: (enabled: boolean) => void;
  connectToFirebase: (config: any) => Promise<boolean>;
  signInWithGoogle: (profileData?: any) => Promise<types.User | null>;
  pushLocalToCloud: () => Promise<void>;
  requestAuthorization: (callback: () => void) => void;
  verify2FA: (code: string) => boolean;
  cancel2FA: () => void;
  setInitialOwner: (name: string, email: string) => void;

  loadSyntheticFuzz?: () => void;  // Demo only (DEV mode)
  loadJimProfile?: () => void;     // Demo only (DEV mode)
  resumePersistent: () => void;
  wipeSession: () => void;

  // Generic CRUD
  addUser: (user: types.User) => void;
  updateUser: (user: types.User) => void;
  deleteUser: (id: string) => void;
  addEntity: (parentId: string, type: types.EntityType, role: types.EntityRole, nameOverride?: string) => Promise<types.Entity>;
  updateEntity: (id: string, updates: Partial<types.Entity>) => void;
  deleteEntity: (id: string) => void;

  // Account CRUD
  createAccount: (input: {
    entityId: string;
    code: string;
    name: string;
    type: types.AccountType;
    description?: string;
    taxLine?: string;
    parentAccountId?: string;
  }) => { account: types.Account | null; errors: Array<{ field: string; message: string }> };
  getAccount: (accountId: string) => types.Account | null;
  getAccounts: (filters?: {
    entityId?: string;
    type?: types.AccountType;
    accountClass?: types.AccountClass;
    isActive?: boolean;
    parentAccountId?: string | null;
    searchTerm?: string;
  }) => types.Account[];
  updateAccount: (accountId: string, updates: {
    name?: string;
    description?: string;
    taxLine?: string;
    parentAccountId?: string;
    isActive?: boolean;
  }) => { account: types.Account | null; errors: Array<{ field: string; message: string }> };
  deleteAccount: (accountId: string) => { account: types.Account | null; errors: Array<{ field: string; message: string }> };
  getCreditAccounts: (entityId: string, activeOnly?: boolean) => types.Account[];
  getDebitAccounts: (entityId: string, activeOnly?: boolean) => types.Account[];
  getActiveAccounts: (entityId: string) => types.Account[];
  getAccountHierarchy: (entityId: string) => types.Account[];
  getAccountTotals: (entityId: string) => { debitTotal: number; creditTotal: number; netWorth: number; breakdown: Record<types.AccountType, number> };

  // Specific Actions
  createFiling: (entityId: string, formType: types.IRSFormType) => void;
  addFiling: (filing: types.ComplianceFiling) => void;
  updateFilingStatus: (id: string, status: types.ComplianceFiling['status'], date?: string) => void;
  submitFilingViaAPI: (filingId: string) => Promise<void>;
  addTaxModule: (module: types.TaxModule) => void;
  performGroundingSearch: (query: string) => void;
  importData: (json: string) => void;
  exportData: () => string;
  resetData: () => void;
  updateSecrets: (updates: Partial<types.ApiSecrets>) => void;
  updateSettings: (updates: Partial<types.SystemSettings>) => void;
  generateSyntheticData?: () => void;  // Demo only (DEV mode)
  generateSampleEnterprise?: () => void;  // Demo only (DEV mode)
  toggleLayoutMode: () => void;
  postJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => { success: boolean; errors: Array<{ field: string; message: string }> };

  // Generic Setters
  addCanalRecord: (r: types.CanalRecord) => void;
  addEscrow: (e: types.EscrowAccount) => void;
  updateEscrow: (e: Partial<types.EscrowAccount> & { id: string }) => void;
  addTick: (t: types.TicklerRecord) => void;
  updateTick: (t: Partial<types.TicklerRecord> & { id: string }) => void;
  onOriginate: (r: types.FedwireRecord) => void;
  addContractor: (c: types.Contractor) => void;
  updateContractor: (c: types.Contractor) => void;
  deleteContractor: (id: string) => void;
  runPayroll: (entityId: string, start: string, end: string, payDate: string, moduleId: string) => void;
  addEmployee: (e: types.Employee) => void;
  updateEmployee: (e: types.Employee) => void;
  deleteEmployee: (id: string) => void;
  addResolution: (r: types.ResolutionRecord) => void;
  recordAsset: (p: types.ParcelRecord) => void;
  recordResearch: (r: types.EdgarResearchRecord) => void;
  originateACH: (r: types.ACHRecord) => void;
  exchangeInstrument: (r: types.InstrumentExchangeRecord) => void;
  addDTCCRecord: (r: types.DTCCPledgeRecord) => void;
  updateDTCCRecord: (r: types.DTCCPledgeRecord) => void;
  completeReview: (r: types.FiduciaryReview) => void;
  completeCertification: (c: types.AgencyCertification) => void;
  completeFSForm1010: (f: types.FSForm1010) => void;
  completeLegalInstrument: (i: types.LegalInstrument) => void;
  completeCreditDefense: (r: types.CreditDefenseRecord) => void;
  completeChanceryFiling: (f: types.ChanceryFiling) => void;
  completePerfection: (i: types.PerfectionInstruction) => void;
  addMaradRecord: (r: types.MaradRecord) => void;
  addRealEstateAsset: (a: types.RealEstateAsset) => void;
  addPurchaseContract: (c: types.PurchaseContract) => void;
  addCreditResolution: (r: types.CreditResolution) => void;
  addCreditInstrument: (i: types.CreditInstrument) => void;
  executeClosing: (closing: types.ClosingRecord, propId: string, instrId: string, entityId: string, amount: number) => void;
  addCollateralPool: (pool: types.CollateralPool) => void;
  addCollateralItem: (item: types.CollateralItem) => void;
  proposeFiduciaryAction: (a: types.FiduciaryAction) => void;
  voteFiduciaryAction: (id: string, vote: types.FiduciaryVote) => void;
  executeFiduciaryAction: (id: string) => void;
  completeReSitus: (r: types.ReSitusRecord) => void;
  completeGiftTax: (doneeId: string, amount: number, desc: string, isSplit: boolean) => void;
  addCRMPerson: (p: types.CRMPerson) => void;
  updateCRMPerson: (p: types.CRMPerson) => void;
  deleteCRMPerson: (id: string) => void;
  addInteraction: (pid: string, i: types.Interaction) => void;
  updateIrsCredential: (id: string, updates: Partial<types.IRSAPICredential>) => void;
  addIrsCredential: (cred: types.IRSAPICredential) => void;
  deleteIrsCredential: (id: string) => void;
  addAccount: (account: types.Account) => void;
  addDocument: (doc: types.IRMDocument) => void;
  addSettlement: (s: types.SettlementInstruction) => void;

  // Obligation & Confirmation CRUD
  addInvoice: (i: types.Invoice) => void;
  updateInvoice: (i: types.Invoice) => void;
  addPayable: (p: types.Payable) => void;
  updatePayable: (p: types.Payable) => void;
  addSettlementConfirmation: (c: types.SettlementConfirmation) => void;
  processSettlementReturn: (settlementId: string, returnCode: string, reason: string) => void;

  // Account Navigation State (Phase 1.2)
  cursorIndex: number;
  selectedAccountId: string | null;
  setCursorIndex: (index: number) => void;
  setSelectedAccountId: (id: string | null) => void;
  paginationCursor: string | null;
  setPaginationCursor: (cursor: string | null) => void;
  paginationLimit: number;
  setPaginationLimit: (limit: number) => void;
  fetchNextAccountsPage: () => void;
  fetchPreviousAccountsPage: () => void;
};

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const useLedgerStore = () => {
  const context = useContext(LedgerContext);
  if (!context) throw new Error('useLedgerStore must be used within a LedgerProvider');
  return context;
};

export const LedgerProvider: React.FC<{ children: React.ReactNode, encryptionKey?: CryptoKey }> = ({ children, encryptionKey }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Consolidated Ledger Database State
  // Consolidated Ledger Database State
  const [db, setDb] = useState<LedgerDb>(EMPTY_DB);

  const DEFAULT_DEV_USER: types.User = {
    id: 'dev-auto',
    name: 'Developer',
    email: 'dev@local',
    role: 'Owner' as types.UserRole,
    avatarInitials: 'DV',
    lastActive: 'Now',
    _version: '1'
  };

  // System/UI State - Init with Dev User to bypass LaunchScreen immediately
  const [currentUser, setCurrentUser] = useState<types.User>(
    import.meta.env.DEV ? DEFAULT_DEV_USER : ({} as types.User)
  );
  const [secrets, setSecrets] = useState<types.ApiSecrets>({ irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' });
  const [settings, setSettings] = useState<types.SystemSettings>({
    fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' },
    network: 'Testnet',
    layoutMode: 'MobileQuickBooks'
  });

  const [apiSystemStatus] = useState<types.SystemStatus[]>([
    { channel: 'MeF', status: 'Operational', latency: '45ms', uptime: '99.98%' },
    { channel: 'AIR', status: 'Operational', latency: '120ms', uptime: '99.5%' },
    { channel: 'IRIS', status: 'Degraded', latency: '800ms', uptime: '98.2%' },
    { channel: 'FEDWIRE', status: 'Operational', latency: '12ms', uptime: '99.99%' },
    { channel: 'FEDNOW', status: 'Operational', latency: '3ms', uptime: '99.99%' },
    { channel: 'TIN_MATCH', status: 'Maintenance', latency: '-', uptime: '0%' },
  ]);

  const [searchResults, setSearchResults] = useState<types.SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [changeGraph, setChangeGraph] = useState<types.ChangeSet[]>([]);
  const [canResume, setCanResume] = useState(false);
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);
  const [is2FAOpen, setIs2FAOpen] = useState(false);
  const [teachModeEnabled, setTeachModeEnabled] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Account Navigation State (Phase 1.2)
  const [cursorIndex, setCursorIndex] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [paginationCursor, setPaginationCursor] = useState<string | null>(null);
  const [paginationLimit] = useState(50); // Default page size



  useEffect(() => {
    fetchLedgerData(encryptionKey).then(data => {
      // SEED DEFAULT ENTITY IF MISSING (QuickBooks Mode)
      if (data.db.entities.length === 0) {
        data.db.entities.push({
          id: 'default-op-co',
          name: 'Standard Operating LLC',
          type: types.EntityType.LLC,
          role: types.EntityRole.OPERATING_LLC,
          parentEntityId: null,
          _version: '1'
        });
      }
      setDb(data.db);
      // specific logic: if loaded data has a valid user, use it. Otherwise keep default (Dev).
      if (data.user && data.user.name) {
        setCurrentUser(data.user);
        setCanResume(true);
      }
      setSecrets(data.secrets);
      setSettings({
        ...data.settings,
        layoutMode: data.settings.layoutMode || 'MobileQuickBooks'
      });
      setIsLoaded(true);
      if (data.user && data.user.name) {
        setCanResume(true);
      }
    }).catch(e => {
      console.error("Ledger Load Error:", e);
      setIsLoaded(true);
    });
  }, [encryptionKey]);

  const LoadingScreen = () => {
    return React.createElement('div', {
      className: "fixed inset-0 flex flex-col items-center justify-center bg-[#0B0F19] text-slate-300"
    }, [
      React.createElement('div', {
        key: 'spinner',
        className: "w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"
      }),
      React.createElement('h2', {
        key: 'title',
        className: "text-xl font-bold tracking-widest text-white uppercase"
      }, "Initializing Ledger"),
      React.createElement('p', {
        key: 'desc',
        className: "text-xs text-slate-500 mt-2 font-mono"
      }, "Decrypting Secure Enclave...")
    ]);
  };



  // --- Persistence & Sync ---
  const syncDoc = (collectionName: keyof LedgerDb | string, data: any) => {
    // Stubbed (Non-goal)
  };

  const addItem = (key: keyof LedgerDb, item: any) => {
    setDb(prev => ({ ...prev, [key]: [...prev[key], item] }));
    syncDoc(key, item);
  };

  const updateItem = (key: keyof LedgerDb, item: any) => {
    setDb(prev => ({ ...prev, [key]: prev[key].map((i: any) => i.id === item.id ? { ...i, ...item } : i) }));
    syncDoc(key, item);
  };

  const deleteItem = (key: keyof LedgerDb, id: string) => {
    setDb(prev => ({ ...prev, [key]: prev[key].filter((i: any) => i.id !== id) }));
  };

  // --- Specialized Actions ---
  const postJournal = (entityId: string, date: string, memo: string, type: string, lines: any[]): { success: boolean; errors: Array<{ field: string; message: string }> } => {
    const errors: Array<{ field: string; message: string }> = [];
    const entityAccounts = db.accounts.filter(a => a.entityId === entityId);

    // Step 1: Validate all accounts exist and are active
    const resolvedLines: Array<{ line: any; account: types.Account }> = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const account = entityAccounts.find(a =>
        (line.accountId && a.id === line.accountId) ||
        (line.accountCode && a.code === line.accountCode)
      );

      if (!account) {
        errors.push({
          field: `lines[${i}]`,
          message: `Account not found: ${line.accountCode || line.accountId}`
        });
        continue;
      }

      if (!account.isActive) {
        errors.push({
          field: `lines[${i}]`,
          message: `Account ${account.code} is inactive`
        });
        continue;
      }

      resolvedLines.push({ line, account });
    }

    // Step 2: Validate debits equal credits
    let totalDebits = 0;
    let totalCredits = 0;
    resolvedLines.forEach(({ line }) => {
      if (line.dc === types.DCFlag.Debit) {
        totalDebits += line.amount;
      } else {
        totalCredits += line.amount;
      }
    });

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      errors.push({
        field: 'lines',
        message: `Journal entry must balance: Debits (${totalDebits.toFixed(2)}) ≠ Credits (${totalCredits.toFixed(2)})`
      });
    }

    // If validation errors, return early
    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Step 3: Create journal entry with resolved account IDs
    const entry: types.JournalEntry = {
      id: uuidv4(),
      entityId,
      date,
      memo,
      type,
      lines: resolvedLines.map(({ line, account }) => ({
        ...line,
        id: uuidv4(),
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name
      })),
      locked: true,
      _version: '1'
    };
    addItem('journals', entry);

    // Step 4: Update account balances atomically
    const balanceUpdates = new Map<string, number>();
    resolvedLines.forEach(({ line, account }) => {
      // Calculate balance change based on account type and debit/credit
      // Debit accounts (Asset, Expense): Debit increases, Credit decreases
      // Credit accounts (Liability, Equity, Income): Credit increases, Debit decreases
      const isDebitAccount = account.type === 'Asset' || account.type === 'Expense';
      const change = isDebitAccount
        ? (line.dc === types.DCFlag.Debit ? line.amount : -line.amount)
        : (line.dc === types.DCFlag.Credit ? line.amount : -line.amount);

      const currentChange = balanceUpdates.get(account.id) || 0;
      balanceUpdates.set(account.id, currentChange + change);
    });

    // Apply balance updates
    const newAccounts = db.accounts.map(acc => {
      const change = balanceUpdates.get(acc.id);
      if (change === undefined) return acc;
      const updatedAcc = { ...acc, balance: acc.balance + change };
      syncDoc('accounts', updatedAcc);
      return updatedAcc;
    });
    setDb(prev => ({ ...prev, accounts: newAccounts }));

    return { success: true, errors: [] };
  };

  const addEntity = async (parentId: string, type: types.EntityType, role: types.EntityRole, nameOverride?: string, metadata?: Partial<types.Entity>) => {
    const newEntity: types.Entity = {
      id: uuidv4(),
      name: nameOverride || `New ${type}`,
      type,
      role,
      parentEntityId: parentId || null,
      _version: '1',
      ...metadata
    };
    addItem('entities', newEntity);
    return newEntity;
  };

  // --- Effects ---
  useEffect(() => {
    // Load Teach Mode preference
    try {
      const stored = localStorage.getItem('teachModeEnabled');
      if (stored === 'true') setTeachModeEnabled(true);
    } catch (e) { }

    const handler = setTimeout(async () => {
      if (currentUser.name || db.entities.length > 0) {
        const state = { ...db, currentUser, secrets, settings };
        storageService.set('ledger_state', state);
        await storageService.persist();

        if (!canResume) setCanResume(true);
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [db, currentUser, secrets, settings, encryptionKey]);

  useEffect(() => {
    // Connect to firebase if config exists in loaded settings
    if (settings.firebaseConfig) {
      connectToFirebase(settings.firebaseConfig);
    }
  }, []);

  // --- Context Methods ---
  const importData = (json: string) => {
    try {
      const data = JSON.parse(json);
      const newDb = { ...EMPTY_DB };
      (Object.keys(EMPTY_DB) as Array<keyof LedgerDb>).forEach(k => {
        if (data[k]) newDb[k] = data[k];
      });
      setDb(newDb);
      if (data.currentUser) setCurrentUser(data.currentUser);
      if (data.secrets) setSecrets(data.secrets);
      if (data.settings) setSettings(data.settings);
      UseCaseLogger.log('SYSTEM', 'Data Import Successful');
    } catch (e) { console.error("Import failed", e); }
  };

  const exportData = () => {
    return JSON.stringify({ ...db, currentUser, secrets, settings }, null, 2);
  };

  const resetData = () => {
    setDb(EMPTY_DB);
    setCurrentUser({} as types.User);
    setIsCloudEnabled(false);
    UseCaseLogger.log('SYSTEM', 'Reset System Data');
  };

  const connectToFirebase = async (config: any): Promise<boolean> => {
    // Firebase is a non-goal. Stubbed.
    return false;
  };

  const signInWithGoogle = async (profileData?: any): Promise<types.User | null> => {
    // If profile data is provided (from real Google Auth), use it
    if (profileData) {
      const user: types.User = {
        id: profileData.sub || uuidv4(),
        name: profileData.name || profileData.email || 'Google User',
        email: profileData.email || 'no-email@google.com',
        role: 'Owner' as types.UserRole,
        avatarInitials: ((profileData.given_name?.[0] || '') + (profileData.family_name?.[0] || '')).toUpperCase() || 'GU',
        lastActive: 'Now',
        _version: '1',
        profileImage: profileData.picture
        // Store the key ID or similar if needed for crypto later, but for now this is identity
      };

      setCurrentUser(user);
      addItem('users', user);
      logger.info("Google Sign-In Successful", { uid: user.id, email: user.email });

      // Update secrets with any relevant info if available, or just log
      return user;
    }

    // Fallback: Direct Environment Auth (No Firebase/Google Data)
    // Only used if signInWithGoogle is called without args (e.g. dev bypass)
    const envUser: types.User = {
      id: 'auth-env-standard',
      name: 'James R. Standard Jr.',
      email: 'admin@trust-ledger.system',
      role: 'Owner' as types.UserRole,
      avatarInitials: 'JS',
      lastActive: 'Now',
      _version: '1'
    };

    setCurrentUser(envUser);
    addItem('users', envUser);
    logger.info("Environment Sign-In Successful (Mock)", { uid: envUser.id });
    return envUser;
  };

  const contextValue: LedgerContextType = {
    ...db,
    currentUser, apiSystemStatus, searchResults, isSearching, secrets, settings, changeGraph, canResume, isCloudEnabled, is2FAOpen,
    teachModeEnabled,
    setTeachModeEnabled,
    connectToFirebase: async () => false, // Stubbed (Non-goal)
    signInWithGoogle,
    pushLocalToCloud: async () => { /* Stubbed (Non-goal) */ },
    requestAuthorization: (cb) => { setPendingCallback(() => cb); setIs2FAOpen(true); },
    verify2FA: (code) => { if (code.length === 6 && !isNaN(Number(code))) { pendingCallback?.(); setIs2FAOpen(false); return true; } return false; },
    cancel2FA: () => { setIs2FAOpen(false); setPendingCallback(null); },
    setInitialOwner: (name, email) => {
      const u = { id: uuidv4(), name, email, role: 'Owner' as types.UserRole, avatarInitials: name.substring(0, 2).toUpperCase(), lastActive: 'Now', _version: '1' };
      setCurrentUser(u); addItem('users', u);
    },
    resumePersistent: () => {
      const s = storageService.get<any>('ledger_state');
      if (s) {
        setDb(s.db || EMPTY_DB);
        setCurrentUser(s.currentUser || {} as types.User);
        setSecrets(s.secrets || { irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' });
        setSettings(s.settings || { fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' }, network: 'Testnet' });
      }
    },
    wipeSession: () => {
      // 1. Clear Persistence
      storageService.remove('ledger_state');
      storageService.remove('auth_current_user');
      storageService.remove('google_user');
      storageService.remove('selected_skin');

      localStorage.clear(); // Legacy cleanup
      sessionStorage.clear();

      // 2. Reset Internal State
      resetData();
      setCanResume(false);

      // 3. Log Action
      console.warn("Factory Reset Executed - Profile/Buckets Abandoned");
      UseCaseLogger.log("SYSTEM", "Factory Reset Executed - Profile/Buckets Abandoned");
    },
    // Demo functions - only available in development mode
    ...(import.meta.env.DEV ? {

      loadSyntheticFuzz: async () => {
        const mockData = await import('./mockData');
        setDb({ ...EMPTY_DB, entities: mockData.FUZZ_ENTITIES, accounts: mockData.FUZZ_ACCOUNTS, journals: mockData.FUZZ_JOURNALS });
        const u = { id: uuidv4(), name: "Synthetic Operator", email: "ai@fuzznet.local", role: 'Owner' as types.UserRole, avatarInitials: "AI", lastActive: 'Now', _version: '1' };
        setCurrentUser(u); addItem('users', u);
      },
      loadJimProfile: async () => {
        const mockData = await import('./mockData');
        setDb({ ...EMPTY_DB, entities: mockData.JIM_ENTITIES, accounts: mockData.JIM_ACCOUNTS, journals: mockData.JIM_JOURNALS, modules: mockData.JIM_MODULES, filings: mockData.JIM_FILINGS, contractors: mockData.SEED_CONTRACTORS });
        const u = { id: 'auth-env-standard', name: "James R. Standard Jr.", email: "admin@trust-ledger.system", role: 'Owner' as types.UserRole, avatarInitials: "JS", lastActive: 'Now', _version: '1' };
        setCurrentUser(u); addItem('users', u);
      }
    } : {}),

    // CRUD Map
    addUser: (u) => addItem('users', u), updateUser: (u) => updateItem('users', u), deleteUser: (id) => deleteItem('users', id),
    addEntity, updateEntity: (id, u) => { setDb(p => ({ ...p, entities: p.entities.map(e => e.id === id ? { ...e, ...u } : e) })); }, deleteEntity: (id) => deleteItem('entities', id),

    createFiling: (eid, type) => addItem('filings', { id: uuidv4(), entityId: eid, formType: type, status: 'Drafted', _version: '1' }),
    addFiling: (f) => addItem('filings', f),
    updateFilingStatus: (id, s, d) => setDb(p => ({ ...p, filings: p.filings.map(f => f.id === id ? { ...f, status: s, filingDate: d } : f) })),
    submitFilingViaAPI: async (id) => {
      const f = db.filings.find(x => x.id === id); const e = db.entities.find(x => x.id === f?.entityId);
      if (f && e) {
        // Update status optimistically then await result
        setDb(p => ({ ...p, filings: p.filings.map(fil => fil.id === id ? { ...fil, status: 'Transmitting' } : fil) }));
        const log = await simulateTransmission(e, f.formType as types.IRSFormType, settings.fuzzing);
        addItem('transmissions', log);
        setDb(p => ({ ...p, filings: p.filings.map(fil => fil.id === id ? { ...fil, status: log.status === 'Accepted' ? 'Accepted' : 'Rejected', filingDate: log.timestamp } : fil) }));
      }
    },
    addTaxModule: (m) => addItem('modules', m),
    performGroundingSearch: async (q) => {
      setIsSearching(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
        const res = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Search: ${q}`, config: { tools: [{ googleSearch: {} }] } });
        // Simple parsing for demo
        setSearchResults([{ id: 'AI', title: 'AI Result', snippet: res.text || 'No result', source: 'Pub', url: '#', relevance: 1 }]);
      } catch (e) { setSearchResults(await searchIRSManual(q)); } finally { setIsSearching(false); }
    },
    updateSecrets: (s) => setSecrets(p => ({ ...p, ...s })), updateSettings: (s) => setSettings(p => ({ ...p, ...s })),
    // Demo functions - only available in development mode
    ...(import.meta.env.DEV ? {
      generateSyntheticData: async () => {
        const mockData = await import('./mockData');
        setDb({ ...EMPTY_DB, entities: mockData.FUZZ_ENTITIES, accounts: mockData.FUZZ_ACCOUNTS, journals: mockData.FUZZ_JOURNALS, contractors: mockData.SEED_CONTRACTORS });
      },
      generateSampleEnterprise: async () => {
        const mockData = await import('./mockData');
        setDb({ ...EMPTY_DB, entities: mockData.JIM_ENTITIES, accounts: mockData.JIM_ACCOUNTS, journals: mockData.JIM_JOURNALS, modules: mockData.JIM_MODULES, filings: mockData.JIM_FILINGS, contractors: mockData.SEED_CONTRACTORS });
      }
    } : {}),
    toggleLayoutMode: () => {
      setSettings(prev => ({
        ...prev,
        layoutMode: prev.layoutMode === 'MobileQuickBooks' ? 'Standard' : 'MobileQuickBooks'
      }));
    },
    postJournal,

    importData,
    exportData,
    resetData,


    // Mapped Setters
    addCanalRecord: (r) => addItem('canalRecords', r),
    addEscrow: (e) => addItem('escrows', e), updateEscrow: (e) => updateItem('escrows', e),
    addTick: (t) => addItem('ticks', t), updateTick: (t) => updateItem('ticks', t),
    onOriginate: (r) => addItem('fedWires', r),
    addContractor: (c) => addItem('contractors', c), updateContractor: (c) => updateItem('contractors', c), deleteContractor: (id) => deleteItem('contractors', id),
    runPayroll: (eid, s, e, d, mid) => {
      const run: types.PayrollRun = { id: uuidv4(), entityId: eid, periodStart: s, periodEnd: e, payDate: d, totalGross: 50000, totalEmployerTax: 3800, totalNetPay: 40000, status: 'Posted' };
      addItem('payrollRuns', run);
      postJournal(eid, d, `Payroll ${s}`, 'PAYROLL', [
        { accountCode: '510000', dc: types.DCFlag.Debit, amount: 50000, accountName: 'Labor Exp' },
        { accountCode: '101000', dc: types.DCFlag.Credit, amount: 40000, accountName: 'Cash' },
        { accountCode: '210000', dc: types.DCFlag.Credit, amount: 10000, accountName: 'Tax Liab' }
      ]);
    },
    addEmployee: (e) => addItem('employees', e), updateEmployee: (e) => updateItem('employees', e), deleteEmployee: (id) => deleteItem('employees', id),
    addResolution: (r) => addItem('resolutions', r), recordAsset: (p) => addItem('parcelRecords', p), recordResearch: (r) => addItem('edgarResearchRecords', r),
    originateACH: (r) => addItem('achRecords', r), exchangeInstrument: (r) => addItem('instrumentExchangeRecords', r),
    addDTCCRecord: (r) => addItem('dtccPledgeRecords', r), updateDTCCRecord: (r) => updateItem('dtccPledgeRecords', r),
    completeReview: (r) => addItem('fiduciaryReviews', r), completeCertification: (c) => addItem('agencyCertifications', c),
    completeFSForm1010: (f) => addItem('fsForm1010s', f), completeLegalInstrument: (i) => addItem('legalInstruments', i),
    completeCreditDefense: (r) => addItem('creditDefenseRecords', r), completeChanceryFiling: (f) => addItem('chanceryFilings', f),
    completePerfection: (i) => addItem('perfectionInstructions', i), addMaradRecord: (r) => addItem('maradRecords', r),
    addRealEstateAsset: (a) => addItem('realEstateAssets', a), addPurchaseContract: (c) => addItem('purchaseContracts', c),
    addCreditResolution: (r) => addItem('creditResolutions', r),
    addCreditInstrument: (i) => {
      addItem('creditInstruments', i);
      if (i.status === 'Accepted') postJournal(i.entityId, i.issueDate, `Credit Acceptance: ${i.type}`, 'ASSET_ACQ', [{ accountCode: '150000', dc: types.DCFlag.Debit, amount: i.faceAmount, accountName: 'Asset' }, { accountCode: '250000', dc: types.DCFlag.Credit, amount: i.faceAmount, accountName: 'Liability' }]);
    },
    executeClosing: (c, pid, iid, eid, amt) => {
      addItem('closingRecords', c);
      setDb(p => ({ ...p, realEstateAssets: p.realEstateAssets.map(a => a.id === pid ? { ...a, status: 'Owned' } : a), creditInstruments: p.creditInstruments.map(i => i.id === iid ? { ...i, status: 'Discharged' } : i) }));
      postJournal(eid, c.closingDate, `Closing: ${c.recordingRef}`, 'DISCHARGE', [{ accountCode: '250000', dc: types.DCFlag.Debit, amount: amt, accountName: 'Liability' }, { accountCode: '300000', dc: types.DCFlag.Credit, amount: amt, accountName: 'Equity' }]);
    },
    addCollateralPool: (p) => addItem('collateralPools', p),
    addCollateralItem: (i) => { addItem('collateralItems', i); setDb(p => ({ ...p, collateralPools: p.collateralPools.map(pool => pool.id === i.poolId ? { ...pool, totalValue: pool.totalValue + i.assessedValue } : pool) })); },
    proposeFiduciaryAction: (a) => addItem('fiduciaryActions', a),
    voteFiduciaryAction: (id, v) => setDb(p => ({ ...p, fiduciaryActions: p.fiduciaryActions.map(a => a.id === id ? { ...a, votes: [...a.votes, v] } : a) })),
    executeFiduciaryAction: (id) => setDb(p => ({ ...p, fiduciaryActions: p.fiduciaryActions.map(a => a.id === id ? { ...a, status: 'Executed', dateExecuted: new Date().toISOString() } : a) })),
    completeReSitus: (r) => addItem('resitusRecords', r), completeGiftTax: (did, amt, d, s) => addItem('giftTaxRecords', { id: uuidv4(), entityId: currentUser.id, doneeId: did, amount: amt, description: d, isSplit: s, date: new Date().toISOString().split('T')[0], status: 'Draft' }),
    addCRMPerson: (p) => addItem('crmPeople', p), updateCRMPerson: (p) => updateItem('crmPeople', p), deleteCRMPerson: (id) => deleteItem('crmPeople', id),
    addInteraction: (pid: string, i: types.Interaction) => setDb(p => ({ ...p, crmPeople: p.crmPeople.map(person => person.id === pid ? { ...person, interactions: [i, ...person.interactions] } : person) })),
    updateIrsCredential: (id, u) => setDb(p => ({ ...p, irsCreds: p.irsCreds.map(c => c.id === id ? { ...c, ...u } : c) })), addIrsCredential: (c) => addItem('irsCreds', c), deleteIrsCredential: (id) => deleteItem('irsCreds', id),
    addAccount: (account: types.Account) => addItem('accounts', account),

    // Account CRUD
    createAccount: (input) => {
      const result = accountService.createAccount(input, db.accounts);
      if (result.account) addItem('accounts', result.account);
      return result;
    },
    getAccount: (accountId) => accountService.getAccount(accountId, db.accounts),
    getAccounts: (filters) => accountService.getAccounts(filters || {}, db.accounts),
    updateAccount: (accountId, updates) => {
      const result = accountService.updateAccount(accountId, updates, db.accounts);
      if (result.account) updateItem('accounts', result.account);
      return result;
    },
    deleteAccount: (accountId) => {
      const result = accountService.deleteAccount(accountId, db.accounts);
      if (result.account) updateItem('accounts', result.account);
      return result;
    },
    getCreditAccounts: (entityId, activeOnly = true) => accountService.getCreditAccounts(entityId, db.accounts, activeOnly),
    getDebitAccounts: (entityId, activeOnly = true) => accountService.getDebitAccounts(entityId, db.accounts, activeOnly),
    getActiveAccounts: (entityId) => accountService.getActiveAccounts(entityId, db.accounts),
    getAccountHierarchy: (entityId) => accountService.getAccountHierarchy(entityId, db.accounts),
    getAccountTotals: (entityId) => accountService.getAccountTotals(entityId, db.accounts),

    addDocument: (doc: types.IRMDocument) => addItem('documents', doc),
    addSettlement: (s: types.SettlementInstruction) => addItem('settlements', s),
    addInvoice: (i) => addItem('invoices', i), updateInvoice: (i) => updateItem('invoices', i),
    addPayable: (p) => addItem('payables', p), updatePayable: (p) => updateItem('payables', p),
    addSettlementConfirmation: (c) => addItem('settlementConfirmations', c),
    processSettlementReturn: (settlementId, returnCode, reason) => {
      const settlement = db.settlements.find(s => s.payment_id === settlementId);
      if (!settlement) return;

      // 1. Update Settlement Status
      setDb(prev => ({ ...prev, settlements: prev.settlements.map(s => s.payment_id === settlementId ? { ...s, status: 'Failed' } : s) }));

      // 2. Create Confirmation Record
      const confirmation: types.SettlementConfirmation = {
        id: uuidv4(),
        settlementId: settlementId,
        traceNumber: `RET-${Date.now()}`,
        effectiveEntryDate: new Date().toISOString().split('T')[0],
        status: 'Returned',
        returnCode,
        returnReason: reason,
        postedAt: new Date().toISOString(),
        _version: '1'
      };
      addItem('settlementConfirmations', confirmation);

      // 3. Post Reversing Journal
      // Reverses the original settlement entry (Dr Asset, Cr Liability)
      const sourceAccount = db.accounts.find(a => a.id === settlement.funding_source);
      postJournal(
        settlement.entityId,
        new Date().toISOString().split('T')[0],
        `ACH RETURN: ${returnCode} - ${reason} (${settlement.payee})`,
        'RETURN',
        [
          { accountCode: sourceAccount?.code || '101000', dc: types.DCFlag.Debit, amount: settlement.amount, accountName: sourceAccount?.name || 'Asset' },
          { accountCode: '200000', dc: types.DCFlag.Credit, amount: settlement.amount, accountName: 'Accounts Payable' }
        ]
      );

      // 4. Re-Open Payable?
      // Logic: If returned, the obligation is still present.
      // We need to find the payable linked to this settlement (if any linking existed, but SettlementInstruction currently doesn't link back effectively without searching).
      // For now, we assume manual intervention is required to re-schedule.
    },

    // Account Navigation State (Phase 1.2)
    cursorIndex,
    selectedAccountId,
    setCursorIndex,
    setSelectedAccountId,
    paginationCursor,
    setPaginationCursor: (cursor: string | null) => setPaginationCursor(cursor),
    paginationLimit,
    setPaginationLimit: (limit: number) => { /* Limit is currently fixed at 50 */ },
    fetchNextAccountsPage: () => {
      // Get next page using cursor-based pagination from accountService
      const result = accountService.fetchNext(paginationCursor, paginationLimit, db.accounts);
      if (result.nextCursor) {
        setPaginationCursor(result.nextCursor);
      }
    },
    fetchPreviousAccountsPage: () => {
      // Get previous page using cursor-based pagination from accountService
      const result = accountService.fetchPrevious(paginationCursor, paginationLimit, db.accounts);
      if (result.previousCursor) {
        setPaginationCursor(result.previousCursor);
      }
    },
  };

  if (!isLoaded) return React.createElement(LoadingScreen);
  return React.createElement(LedgerContext.Provider, { value: contextValue }, children);
};
