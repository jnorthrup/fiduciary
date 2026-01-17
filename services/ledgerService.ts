
import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as types from '../types';
import { simulateTransmission, searchIRSManual } from './irsApiService';
import { UseCaseLogger } from './useCaseLogger';
import { GoogleGenAI } from "@google/genai";
import { initFirebase, getDb, batchUpload, getFirebaseAuth } from './firebase';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { cryptoService } from './cryptoService';
import * as accountService from './accountService';

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

const STORAGE_KEY = 'trust_ledger_state';

// The Async Data Fetcher
async function fetchLedgerData(key?: CryptoKey): Promise<{ db: LedgerDb, user: types.User, secrets: types.ApiSecrets, settings: types.SystemSettings }> {
  // 1. Try Local Storage first
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      let data = saved;
      // If key is provided, attempt to decrypt
      if (key) {
        const encrypted: any = JSON.parse(saved);
        if (encrypted.ciphertext) {
          data = await cryptoService.decrypt(
            Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0)).buffer,
            key,
            new Uint8Array(atob(encrypted.iv).split('').map(c => c.charCodeAt(0)))
          );
        }
      }

      const parsed = JSON.parse(data);
      // Ensure we merge with EMPTY_DB to ensure all keys exist even if local storage is old
      const db = { ...EMPTY_DB, ...parsed };
      // Clean up top-level keys that might have been merged into db by mistake if structure changed, 
      // but simpler to just return the parsed structure if valid.
      return {
        db: db, // Assuming the saved object IS the db + extra fields, we extract what we need
        user: parsed.currentUser || {} as types.User,
        secrets: parsed.secrets || { irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' },
        settings: parsed.settings || { fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' }, network: 'Testnet' }
      };
    } catch (e) {
      console.error("Local storage corruption, falling back to seed", e);
    }
  }

  // 2. Fallback to Dynamic Import of Mock Data
  // This simulates a network request and keeps initial bundle size smaller
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
  signInWithGoogle: () => Promise<types.User | null>;
  pushLocalToCloud: () => Promise<void>;
  requestAuthorization: (callback: () => void) => void;
  verify2FA: (code: string) => boolean;
  cancel2FA: () => void;
  setInitialOwner: (name: string, email: string) => void;
  loadJimProfile: () => void;
  loadSyntheticFuzz: () => void;
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
  generateSyntheticData: () => void;
  generateSampleEnterprise: () => void;
  postJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => void;

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
};

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const useLedgerStore = () => {
  const context = useContext(LedgerContext);
  if (!context) throw new Error('useLedgerStore must be used within a LedgerProvider');
  return context;
};

export const LedgerProvider: React.FC<{ children: React.ReactNode, encryptionKey?: CryptoKey }> = ({ children, encryptionKey }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    fetchLedgerData(encryptionKey).then(data => {
      setInitialData(data);
      setIsLoaded(true);
    });
  }, [encryptionKey]);

  if (!isLoaded) return null; // Or show a local loading state

  // Consolidated Ledger Database State
  const [db, setDb] = useState<LedgerDb>(initialData.db);

  // System/UI State
  const [currentUser, setCurrentUser] = useState<types.User>(initialData.user);
  const [secrets, setSecrets] = useState<types.ApiSecrets>(initialData.secrets);
  const [settings, setSettings] = useState<types.SystemSettings>(initialData.settings);

  const [apiSystemStatus, setApiSystemStatus] = useState<types.SystemStatus[]>([
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
  const [canResume, setCanResume] = useState(!!initialData.user.name);
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);
  const [is2FAOpen, setIs2FAOpen] = useState(false);
  const [teachModeEnabled, setTeachModeEnabled] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // --- Persistence & Sync ---
  const syncDoc = (collectionName: keyof LedgerDb | string, data: any) => {
    if (isCloudEnabled) {
      const fb = getDb();
      if (fb && data.id) setDoc(doc(fb, collectionName, data.id), data).catch(console.error);
    }
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
  const postJournal = (entityId: string, date: string, memo: string, type: string, lines: any[]) => {
    const entry: types.JournalEntry = { id: uuidv4(), entityId, date, memo, type, lines: lines.map(l => ({ ...l, id: uuidv4() })), locked: true, _version: '1' };
    addItem('journals', entry);

    // Optimistic Account Balance Update
    const newAccounts = db.accounts.map(acc => {
      const relLines = entry.lines.filter(l => l.accountCode === acc.code || l.accountId === acc.id);
      if (relLines.length === 0) return acc;
      let change = 0;
      relLines.forEach(l => change += (acc.type === 'Asset' || acc.type === 'Expense') ? (l.dc === types.DCFlag.Debit ? l.amount : -l.amount) : (l.dc === types.DCFlag.Credit ? l.amount : -l.amount));
      const updatedAcc = { ...acc, balance: acc.balance + change };
      syncDoc('accounts', updatedAcc);
      return updatedAcc;
    });
    setDb(prev => ({ ...prev, accounts: newAccounts }));
  };

  const addEntity = async (parentId: string, type: types.EntityType, role: types.EntityRole, nameOverride?: string) => {
    const newEntity: types.Entity = { id: uuidv4(), name: nameOverride || `New ${type}`, type, role, parentEntityId: parentId || null, _version: '1' };
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
        const state = JSON.stringify({ ...db, currentUser, secrets, settings });
        if (encryptionKey) {
          const { ciphertext, iv } = await cryptoService.encrypt(state, encryptionKey);
          const encrypted = JSON.stringify({
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
            iv: btoa(String.fromCharCode(...iv))
          });
          localStorage.setItem(STORAGE_KEY, encrypted);
        } else {
          localStorage.setItem(STORAGE_KEY, state);
        }
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
    const success = initFirebase(config);
    if (success) {
      setIsCloudEnabled(true);
      setSettings(prev => ({ ...prev, firebaseConfig: config }));

      // Setup Listeners
      const fb = getDb();
      if (fb) {
        ['entities', 'accounts', 'journals'].forEach(col => {
          onSnapshot(collection(fb, col), (snap) => {
            const items = snap.docs.map(d => d.data());
            if (items.length > 0) setDb(prev => ({ ...prev, [col]: items }));
          });
        });
      }
    }
    return success;
  };

  const signInWithGoogle = async (): Promise<types.User | null> => {
    const auth = getFirebaseAuth();
    if (!auth) {
      console.error("Firebase Auth not initialized");
      return null;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const u: types.User = {
        id: user.uid,
        name: user.displayName || 'Google User',
        email: user.email || '',
        role: 'Owner' as types.UserRole,
        avatarInitials: (user.displayName || 'GU').substring(0, 2).toUpperCase(),
        lastActive: 'Now',
        _version: '1'
      };

      setCurrentUser(u);
      addItem('users', u);
      return u;
    } catch (e) {
      console.error("Google Sign-In failed", e);
      return null;
    }
  };

  const contextValue: LedgerContextType = {
    ...db,
    currentUser, apiSystemStatus, searchResults, isSearching, secrets, settings, changeGraph, canResume, isCloudEnabled, is2FAOpen,
    teachModeEnabled,
    setTeachModeEnabled,
    connectToFirebase,
    signInWithGoogle,
    pushLocalToCloud: async () => { if (isCloudEnabled) { await batchUpload('entities', db.entities); await batchUpload('accounts', db.accounts); await batchUpload('journals', db.journals); } },
    requestAuthorization: (cb) => { setPendingCallback(() => cb); setIs2FAOpen(true); },
    verify2FA: (code) => { if (code.length === 6 && !isNaN(Number(code))) { pendingCallback?.(); setIs2FAOpen(false); return true; } return false; },
    cancel2FA: () => { setIs2FAOpen(false); setPendingCallback(null); },
    setInitialOwner: (name, email) => {
      const u = { id: uuidv4(), name, email, role: 'Owner' as types.UserRole, avatarInitials: name.substring(0, 2).toUpperCase(), lastActive: 'Now', _version: '1' };
      setCurrentUser(u); addItem('users', u);
    },
    loadJimProfile: async () => {
      const mockData = await import('./mockData');
      setDb({
        ...EMPTY_DB,
        entities: mockData.JIM_ENTITIES,
        accounts: mockData.JIM_ACCOUNTS,
        journals: mockData.JIM_JOURNALS,
        modules: mockData.JIM_MODULES,
        filings: mockData.JIM_FILINGS,
        transmissions: mockData.JIM_TRANSMISSIONS
      });
      const u = { id: uuidv4(), name: "James R. Northrup Jr.", email: "james@sovereign-node.local", role: 'Owner' as types.UserRole, avatarInitials: "JN", lastActive: 'Now', _version: '1' };
      setCurrentUser(u); addItem('users', u);
    },
    loadSyntheticFuzz: async () => {
      const mockData = await import('./mockData');
      setDb({ ...EMPTY_DB, entities: mockData.FUZZ_ENTITIES, accounts: mockData.FUZZ_ACCOUNTS, journals: mockData.FUZZ_JOURNALS });
      const u = { id: uuidv4(), name: "Synthetic Operator", email: "ai@fuzznet.local", role: 'Owner' as types.UserRole, avatarInitials: "AI", lastActive: 'Now', _version: '1' };
      setCurrentUser(u); addItem('users', u);
    },
    resumePersistent: () => { const s = localStorage.getItem(STORAGE_KEY); if (s) importData(s); },
    wipeSession: () => { localStorage.removeItem(STORAGE_KEY); resetData(); setCanResume(false); },

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
    generateSyntheticData: async () => {
      const mockData = await import('./mockData');
      setDb({ ...EMPTY_DB, entities: mockData.FUZZ_ENTITIES, accounts: mockData.FUZZ_ACCOUNTS, journals: mockData.FUZZ_JOURNALS });
    },
    generateSampleEnterprise: async () => {
      const mockData = await import('./mockData');
      setDb({ ...EMPTY_DB, entities: mockData.JIM_ENTITIES, accounts: mockData.JIM_ACCOUNTS, journals: mockData.JIM_JOURNALS, modules: mockData.JIM_MODULES, filings: mockData.JIM_FILINGS });
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
  };

  return React.createElement(LedgerContext.Provider, { value: contextValue }, children);
};
