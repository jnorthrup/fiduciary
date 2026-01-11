
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as types from '../types';
import * as mockData from './mockData';
import { simulateTransmission, searchIRSManual } from './irsApiService';
import { UseCaseLogger } from './useCaseLogger';
import { GoogleGenAI, Type } from "@google/genai";
import { initFirebase, getDb, batchUpload } from './firebase';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';

interface LedgerContextType {
  entities: types.Entity[];
  accounts: types.Account[];
  journals: types.JournalEntry[];
  wallets: types.WalletCredential[];
  users: types.User[];
  currentUser: types.User;
  modules: types.TaxModule[];
  filings: types.ComplianceFiling[];
  transmissions: types.TransmissionLog[];
  apiSystemStatus: types.SystemStatus[];
  searchResults: types.SearchResult[];
  isSearching: boolean;
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
  secrets: types.ApiSecrets;
  settings: types.SystemSettings;
  changeGraph: types.ChangeSet[];
  canResume: boolean;

  // Cloud
  isCloudEnabled: boolean;
  connectToFirebase: (config: any) => Promise<boolean>;
  pushLocalToCloud: () => Promise<void>;

  is2FAOpen: boolean;
  requestAuthorization: (callback: () => void) => void;
  verify2FA: (code: string) => boolean;
  cancel2FA: () => void;

  setInitialOwner: (name: string, email: string) => void;
  loadJimProfile: () => void;
  loadSyntheticFuzz: () => void;
  resumePersistent: () => void;
  wipeSession: () => void;
  addUser: (user: types.User) => void;
  updateUser: (user: types.User) => void;
  deleteUser: (id: string) => void;
  addEntity: (parentId: string, type: types.EntityType, role: types.EntityRole, nameOverride?: string) => Promise<types.Entity>;
  updateEntity: (id: string, updates: Partial<types.Entity>) => void;
  deleteEntity: (id: string) => void;
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
  addCanalRecord: (r: types.CanalRecord) => void;
  postJournal: (entityId: string, date: string, memo: string, type: string, lines: any[]) => void;
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
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const useLedgerStore = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedgerStore must be used within a LedgerProvider');
  }
  return context;
};

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- STATE INITIALIZATION ---
  const [entities, setEntities] = useState<types.Entity[]>([]);
  const [accounts, setAccounts] = useState<types.Account[]>([]);
  const [journals, setJournals] = useState<types.JournalEntry[]>([]);
  const [wallets, setWallets] = useState<types.WalletCredential[]>([]);
  const [users, setUsers] = useState<types.User[]>([]);
  const [currentUser, setCurrentUser] = useState<types.User>({} as types.User);
  const [modules, setModules] = useState<types.TaxModule[]>([]);
  const [filings, setFilings] = useState<types.ComplianceFiling[]>([]);
  const [transmissions, setTransmissions] = useState<types.TransmissionLog[]>([]);
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
  const [documents, setDocuments] = useState<types.IRMDocument[]>(mockData.SEED_DOCUMENTS);
  const [canalRecords, setCanalRecords] = useState<types.CanalRecord[]>([]);
  const [crmPeople, setCrmPeople] = useState<types.CRMPerson[]>([]);
  const [escrows, setEscrows] = useState<types.EscrowAccount[]>([]);
  const [ticks, setTicks] = useState<types.TicklerRecord[]>([]);
  const [fedWires, setFedWires] = useState<types.FedwireRecord[]>([]);
  const [contractors, setContractors] = useState<types.Contractor[]>(mockData.SEED_CONTRACTORS);
  const [bsoRoles, setBsoRoles] = useState<types.BSORole[]>(mockData.SEED_BSO_ROLES);
  const [bsoSubmissions, setBsoSubmissions] = useState<types.BSOSubmission[]>(mockData.SEED_BSO_SUBMISSIONS);
  const [irsCreds, setIrsCreds] = useState<types.IRSAPICredential[]>(mockData.SEED_IRS_CREDS);
  const [employees, setEmployees] = useState<types.Employee[]>(mockData.SEED_EMPLOYEES);
  const [payrollRuns, setPayrollRuns] = useState<types.PayrollRun[]>(mockData.SEED_PAYROLL_RUNS);
  const [ssaStatements, setSsaStatements] = useState<types.SSAStatement[]>(mockData.SEED_SSA_STATEMENTS);
  const [resolutions, setResolutions] = useState<types.ResolutionRecord[]>(mockData.SEED_RESOLUTIONS);
  const [purchaseContracts, setPurchaseContracts] = useState<types.PurchaseContract[]>(mockData.SEED_PURCHASE_CONTRACTS);
  const [creditResolutions, setCreditResolutions] = useState<types.CreditResolution[]>(mockData.SEED_CREDIT_RESOLUTIONS);
  const [creditInstruments, setCreditInstruments] = useState<types.CreditInstrument[]>(mockData.SEED_CREDIT_INSTRUMENTS);
  const [closingRecords, setClosingRecords] = useState<types.ClosingRecord[]>(mockData.SEED_CLOSING_RECORDS);
  const [realEstateAssets, setRealEstateAssets] = useState<types.RealEstateAsset[]>(mockData.SEED_REAL_ESTATE_ASSETS);
  const [collateralPools, setCollateralPools] = useState<types.CollateralPool[]>(mockData.SEED_COLLATERAL_POOLS);
  const [collateralItems, setCollateralItems] = useState<types.CollateralItem[]>([]);
  const [fiduciaryActions, setFiduciaryActions] = useState<types.FiduciaryAction[]>([]);
  const [resitusRecords, setResitusRecords] = useState<types.ReSitusRecord[]>([]);
  const [trustCertificates, setTrustCertificates] = useState<types.TrustCertificate[]>([]);
  const [giftTaxRecords, setGiftTaxRecords] = useState<types.GiftTaxRecord[]>([]);
  const [parcelRecords, setParcelRecords] = useState<types.ParcelRecord[]>([]);
  const [edgarResearchRecords, setEdgarResearchRecords] = useState<types.EdgarResearchRecord[]>([]);
  const [achRecords, setAchRecords] = useState<types.ACHRecord[]>([]);
  const [instrumentExchangeRecords, setInstrumentExchangeRecords] = useState<types.InstrumentExchangeRecord[]>([]);
  const [dtccPledgeRecords, setDtccPledgeRecords] = useState<types.DTCCPledgeRecord[]>([]);
  const [fiduciaryReviews, setFiduciaryReviews] = useState<types.FiduciaryReview[]>([]);
  const [agencyCertifications, setAgencyCertifications] = useState<types.AgencyCertification[]>([]);
  const [fsForm1010s, setFsForm1010s] = useState<types.FSForm1010[]>([]);
  const [legalInstruments, setLegalInstruments] = useState<types.LegalInstrument[]>(mockData.SEED_LEGAL_INSTRUMENTS);
  const [creditDefenseRecords, setCreditDefenseRecords] = useState<types.CreditDefenseRecord[]>(mockData.SEED_CREDIT_DEFENSE);
  const [chanceryFilings, setChanceryFilings] = useState<types.ChanceryFiling[]>([]);
  const [perfectionInstructions, setPerfectionInstructions] = useState<types.PerfectionInstruction[]>([]);
  const [maradRecords, setMaradRecords] = useState<types.MaradRecord[]>([]);
  const [settlements, setSettlements] = useState<types.SettlementInstruction[]>([]);
  const [secrets, setSecrets] = useState<types.ApiSecrets>({ irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' });
  const [settings, setSettings] = useState<types.SystemSettings>({ fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' }, network: 'Testnet' });
  const [changeGraph, setChangeGraph] = useState<types.ChangeSet[]>([]);
  const [canResume, setCanResume] = useState(false);

  // --- CLOUD STATE ---
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);

  // --- SECURITY CONTEXT ---
  const [is2FAOpen, setIs2FAOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Persistence Key
  const STORAGE_KEY = 'trust_ledger_state';

  // --- REAL-TIME STATUS FETCH ---
  const initRealTimeStatus = async () => {
    // Uses Gemini Grounding to get actual IRS system status
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Search for the current operational status of the following IRS systems:
            1. Modernized e-File (MeF)
            2. Affordable Care Act Information Returns (AIR)
            3. Information Returns Intake System (IRIS)
            
            Return a JSON array of objects with keys: channel ('MeF', 'AIR', 'IRIS'), status ('Operational' | 'Degraded' | 'Maintenance'), latency (estimate 'Low' or 'High'), and uptime (e.g. '99%').
            Based your answers on the most recent search results from irs.gov status pages.`,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            channel: { type: Type.STRING },
                            status: { type: Type.STRING },
                            latency: { type: Type.STRING },
                            uptime: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        
        if (response.text) {
            const realStatus = JSON.parse(response.text);
            // Merge with existing static ones like FEDWIRE
            setApiSystemStatus(prev => {
                const combined = [...prev];
                realStatus.forEach((s: any) => {
                    const idx = combined.findIndex(p => p.channel === s.channel);
                    if (idx >= 0) combined[idx] = s;
                });
                return combined;
            });
        }
    } catch (e) {
        // Silently fail on 429/Quota limit to avoid crashing app or showing error toasts
        console.debug("Real-time status fetch skipped (Quota/Network). Using cached status.");
    }
  };

  useEffect(() => {
    initRealTimeStatus();
  }, []);

  // --- FIREBASE SYNC HELPERS ---
  const connectToFirebase = async (config: any): Promise<boolean> => {
    const success = initFirebase(config);
    if (success) {
      setIsCloudEnabled(true);
      // Persist the working config so we can auto-connect next time
      setSettings(prev => ({...prev, firebaseConfig: config}));
      UseCaseLogger.log('SYSTEM', 'Connected to Firebase Cloud');
      setupRealtimeListeners();
    }
    return success;
  };

  const setupRealtimeListeners = () => {
    const db = getDb();
    if (!db) return;

    // Listen to Entities
    onSnapshot(collection(db, 'entities'), (snapshot: any) => {
      const remoteEntities = snapshot.docs.map((doc: any) => doc.data() as types.Entity);
      if (remoteEntities.length > 0) setEntities(remoteEntities);
    });

    // Listen to Accounts
    onSnapshot(collection(db, 'accounts'), (snapshot: any) => {
      const remoteAccounts = snapshot.docs.map((doc: any) => doc.data() as types.Account);
      if (remoteAccounts.length > 0) setAccounts(remoteAccounts);
    });

    // Listen to Journals
    onSnapshot(collection(db, 'journals'), (snapshot: any) => {
      const remoteJournals = snapshot.docs.map((doc: any) => doc.data() as types.JournalEntry);
      if (remoteJournals.length > 0) setJournals(remoteJournals);
    });
  };

  const syncDoc = (collectionName: string, data: any) => {
    if (isCloudEnabled) {
      const db = getDb();
      if (db && data.id) {
        setDoc(doc(db, collectionName, data.id), data).catch(console.error);
      }
    }
  };

  const pushLocalToCloud = async () => {
    if (!isCloudEnabled) return;
    try {
      await batchUpload('entities', entities);
      await batchUpload('accounts', accounts);
      await batchUpload('journals', journals);
      UseCaseLogger.log('SYSTEM', 'Pushed Local State to Cloud');
    } catch (e) {
      console.error("Push failed", e);
    }
  };

  const requestAuthorization = (callback: () => void) => {
      UseCaseLogger.log('SYSTEM', '2FA Requested for Action');
      setPendingCallback(() => callback);
      setIs2FAOpen(true);
  };

  const verify2FA = (code: string): boolean => {
      // Mock validation logic
      if (code.length === 6 && !isNaN(Number(code))) {
          if (pendingCallback) {
              pendingCallback();
              setPendingCallback(null);
          }
          UseCaseLogger.log('SYSTEM', '2FA Verified Success');
          setIs2FAOpen(false);
          return true;
      }
      UseCaseLogger.log('SYSTEM', '2FA Failed', { code });
      return false;
  };

  const cancel2FA = () => {
      UseCaseLogger.log('UI', '2FA Cancelled');
      setIs2FAOpen(false);
      setPendingCallback(null);
  };

  // --- AUTO-SAVE EFFECT ---
  // Saves entire state to localStorage whenever key data changes
  useEffect(() => {
    // Debounce save to prevent trashing disk
    const handler = setTimeout(() => {
        // Only save if we have an active session (currentUser is set) or specific data worth saving
        if (currentUser.name || entities.length > 0) {
            const stateToSave = {
                entities, accounts, journals, wallets, users, currentUser, modules, filings,
                documents, canalRecords, crmPeople, escrows, ticks, fedWires, contractors,
                bsoRoles, bsoSubmissions, irsCreds, employees, payrollRuns, ssaStatements,
                resolutions, purchaseContracts, creditResolutions, creditInstruments, 
                closingRecords, realEstateAssets, collateralPools, collateralItems,
                fiduciaryActions, resitusRecords, trustCertificates, giftTaxRecords,
                parcelRecords, edgarResearchRecords, achRecords, instrumentExchangeRecords,
                dtccPledgeRecords, fiduciaryReviews, agencyCertifications, fsForm1010s,
                legalInstruments, creditDefenseRecords, chanceryFilings, perfectionInstructions,
                maradRecords, settlements, secrets, settings
            };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
                if (!canResume) setCanResume(true);
            } catch (e) {
                console.error("Auto-save failed (likely quota exceeded)", e);
            }
        }
    }, 1000);

    return () => clearTimeout(handler);
  }, [
      entities, accounts, journals, wallets, users, currentUser, modules, filings,
      documents, canalRecords, crmPeople, escrows, ticks, fedWires, contractors,
      bsoRoles, bsoSubmissions, irsCreds, employees, payrollRuns, ssaStatements,
      resolutions, purchaseContracts, creditResolutions, creditInstruments, 
      closingRecords, realEstateAssets, collateralPools, collateralItems,
      fiduciaryActions, resitusRecords, trustCertificates, giftTaxRecords,
      parcelRecords, edgarResearchRecords, achRecords, instrumentExchangeRecords,
      dtccPledgeRecords, fiduciaryReviews, agencyCertifications, fsForm1010s,
      legalInstruments, creditDefenseRecords, chanceryFilings, perfectionInstructions,
      maradRecords, settlements, secrets, settings
  ]);

  // Initial Check & Auto-Connect Firebase
  useEffect(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          setCanResume(true);
          try {
              const data = JSON.parse(saved);
              if (data.settings && data.settings.firebaseConfig) {
                  // Attempt auto-connect if config exists
                  connectToFirebase(data.settings.firebaseConfig);
              }
          } catch(e) {
              console.error("Failed to parse settings for auto-connect", e);
          }
      }
  }, []);

  const generateSampleEnterprise = () => {
      setEntities(mockData.JIM_ENTITIES);
      setAccounts(mockData.JIM_ACCOUNTS);
      setJournals(mockData.JIM_JOURNALS);
      setModules(mockData.JIM_MODULES);
      setFilings(mockData.JIM_FILINGS);
      
      // Load seeds for other data types
      setDocuments(mockData.SEED_DOCUMENTS);
      setContractors(mockData.SEED_CONTRACTORS);
      setEmployees(mockData.SEED_EMPLOYEES);
      setPayrollRuns(mockData.SEED_PAYROLL_RUNS);
      setSsaStatements(mockData.SEED_SSA_STATEMENTS);
      setResolutions(mockData.SEED_RESOLUTIONS);
      setRealEstateAssets(mockData.SEED_REAL_ESTATE_ASSETS);
      setPurchaseContracts(mockData.SEED_PURCHASE_CONTRACTS);
      setCreditResolutions(mockData.SEED_CREDIT_RESOLUTIONS);
      setCreditInstruments(mockData.SEED_CREDIT_INSTRUMENTS);
      setLegalInstruments(mockData.SEED_LEGAL_INSTRUMENTS);
      setCollateralPools(mockData.SEED_COLLATERAL_POOLS);
      setCreditDefenseRecords(mockData.SEED_CREDIT_DEFENSE);
  };

  const generateSyntheticData = () => {
      setEntities(mockData.FUZZ_ENTITIES);
      setAccounts(mockData.FUZZ_ACCOUNTS);
      setJournals(mockData.FUZZ_JOURNALS);
      setModules([]);
      setFilings([]);
  };

  const setInitialOwner = (name: string, email: string) => {
      UseCaseLogger.log('USER', 'Initialized Owner Identity', { name, email });
      const user: types.User = {
          id: uuidv4(),
          name,
          email,
          role: 'Owner',
          avatarInitials: name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
          lastActive: 'Now',
          _version: '1'
      };
      setUsers([user]);
      setCurrentUser(user);
  };

  const loadJimProfile = () => {
      UseCaseLogger.log('SYSTEM', 'Loaded Profile: Jim Northrup Jr.');
      setInitialOwner("James R. Northrup Jr.", "james@sovereign-node.local");
      generateSampleEnterprise();
  };

  const loadSyntheticFuzz = () => {
      UseCaseLogger.log('SYSTEM', 'Loaded Profile: Synthetic Fuzz');
      setInitialOwner("Synthetic Operator", "ai@fuzznet.local");
      generateSyntheticData();
  };

  const resumePersistent = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          UseCaseLogger.log('SYSTEM', 'Resumed Persistent State');
          importData(saved);
      }
  };

  const wipeSession = () => {
      localStorage.removeItem(STORAGE_KEY);
      resetData();
      setCanResume(false);
      UseCaseLogger.log('SYSTEM', 'Session Wiped');
  };

  const importData = (json: string) => {
      try {
          const data = JSON.parse(json);
          // Bulk set all state
          if(data.entities) setEntities(data.entities);
          if(data.accounts) setAccounts(data.accounts);
          if(data.journals) setJournals(data.journals);
          if(data.wallets) setWallets(data.wallets);
          if(data.users) setUsers(data.users);
          if(data.currentUser) setCurrentUser(data.currentUser);
          if(data.modules) setModules(data.modules);
          if(data.filings) setFilings(data.filings);
          if(data.transmissions) setTransmissions(data.transmissions);
          if(data.documents) setDocuments(data.documents);
          if(data.canalRecords) setCanalRecords(data.canalRecords);
          if(data.crmPeople) setCrmPeople(data.crmPeople);
          if(data.escrows) setEscrows(data.escrows);
          if(data.ticks) setTicks(data.ticks);
          if(data.fedWires) setFedWires(data.fedWires);
          if(data.contractors) setContractors(data.contractors);
          if(data.bsoRoles) setBsoRoles(data.bsoRoles);
          if(data.bsoSubmissions) setBsoSubmissions(data.bsoSubmissions);
          if(data.irsCreds) setIrsCreds(data.irsCreds);
          if(data.employees) setEmployees(data.employees);
          if(data.payrollRuns) setPayrollRuns(data.payrollRuns);
          if(data.ssaStatements) setSsaStatements(data.ssaStatements);
          if(data.resolutions) setResolutions(data.resolutions);
          if(data.purchaseContracts) setPurchaseContracts(data.purchaseContracts);
          if(data.creditResolutions) setCreditResolutions(data.creditResolutions);
          if(data.creditInstruments) setCreditInstruments(data.creditInstruments);
          if(data.closingRecords) setClosingRecords(data.closingRecords);
          if(data.realEstateAssets) setRealEstateAssets(data.realEstateAssets);
          if(data.collateralPools) setCollateralPools(data.collateralPools);
          if(data.collateralItems) setCollateralItems(data.collateralItems);
          if(data.fiduciaryActions) setFiduciaryActions(data.fiduciaryActions);
          if(data.resitusRecords) setResitusRecords(data.resitusRecords);
          if(data.trustCertificates) setTrustCertificates(data.trustCertificates);
          if(data.giftTaxRecords) setGiftTaxRecords(data.giftTaxRecords);
          if(data.parcelRecords) setParcelRecords(data.parcelRecords);
          if(data.edgarResearchRecords) setEdgarResearchRecords(data.edgarResearchRecords);
          if(data.achRecords) setAchRecords(data.achRecords);
          if(data.instrumentExchangeRecords) setInstrumentExchangeRecords(data.instrumentExchangeRecords);
          if(data.dtccPledgeRecords) setDtccPledgeRecords(data.dtccPledgeRecords);
          if(data.fiduciaryReviews) setFiduciaryReviews(data.fiduciaryReviews);
          if(data.agencyCertifications) setAgencyCertifications(data.agencyCertifications);
          if(data.fsForm1010s) setFsForm1010s(data.fsForm1010s);
          if(data.legalInstruments) setLegalInstruments(data.legalInstruments);
          if(data.creditDefenseRecords) setCreditDefenseRecords(data.creditDefenseRecords);
          if(data.chanceryFilings) setChanceryFilings(data.chanceryFilings);
          if(data.perfectionInstructions) setPerfectionInstructions(data.perfectionInstructions);
          if(data.maradRecords) setMaradRecords(data.maradRecords);
          if(data.settlements) setSettlements(data.settlements);
          if(data.secrets) setSecrets(data.secrets);
          if(data.settings) {
              setSettings(data.settings);
              // Retry connect if config is present after import
              if (data.settings.firebaseConfig && !isCloudEnabled) {
                  connectToFirebase(data.settings.firebaseConfig);
              }
          }

          UseCaseLogger.log('SYSTEM', 'Data Import Successful');
      } catch (e) {
          console.error("Import failed", e);
          UseCaseLogger.log('SYSTEM', 'Data Import Failed');
      }
  };

  const exportData = () => {
      UseCaseLogger.log('USER', 'Exported System Data');
      // Re-construct current state for export
      return JSON.stringify({
          entities, accounts, journals, wallets, users, currentUser, modules, filings,
          documents, canalRecords, crmPeople, escrows, ticks, fedWires, contractors,
          bsoRoles, bsoSubmissions, irsCreds, employees, payrollRuns, ssaStatements,
          resolutions, purchaseContracts, creditResolutions, creditInstruments, 
          closingRecords, realEstateAssets, collateralPools, collateralItems,
          fiduciaryActions, resitusRecords, trustCertificates, giftTaxRecords,
          parcelRecords, edgarResearchRecords, achRecords, instrumentExchangeRecords,
          dtccPledgeRecords, fiduciaryReviews, agencyCertifications, fsForm1010s,
          legalInstruments, creditDefenseRecords, chanceryFilings, perfectionInstructions,
          maradRecords, settlements, secrets, settings
      }, null, 2);
  };

  const resetData = () => {
      UseCaseLogger.log('SYSTEM', 'Reset System Data');
      setEntities([]);
      setAccounts([]);
      setJournals([]);
      setUsers([]);
      setCurrentUser({} as types.User);
      setIsCloudEnabled(false);
      // ... clear all other state vars if needed for full reset
      // For brevity, we assume the user reloading page after clearing local storage does the trick for most
  };

  const addUser = (user: types.User) => { setUsers(prev => [...prev, user]); };
  const updateUser = (user: types.User) => setUsers(prev => prev.map(u => u.id === user.id ? user : u));
  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));
  
  const addEntity = async (parentId: string, type: types.EntityType, role: types.EntityRole, nameOverride?: string) => {
      const newEntity: types.Entity = {
          id: uuidv4(),
          name: nameOverride || `New ${type}`,
          type,
          role,
          parentEntityId: parentId || null,
          _version: '1'
      };
      setEntities(prev => [...prev, newEntity]);
      syncDoc('entities', newEntity);
      return newEntity;
  };
  const updateEntity = (id: string, updates: Partial<types.Entity>) => {
      setEntities(prev => prev.map(e => {
          if (e.id === id) {
              const updated = { ...e, ...updates };
              syncDoc('entities', updated);
              return updated;
          }
          return e;
      }));
  };
  const deleteEntity = (id: string) => setEntities(prev => prev.filter(e => e.id !== id));

  const simpleAdd = (key: string, item: any) => {
      // (Optimized switch for brevity)
      switch(key) {
          case 'canalRecords': setCanalRecords(p => [...p, item]); break;
          case 'escrows': setEscrows(p => [...p, item]); break;
          case 'ticks': setTicks(p => [...p, item]); break;
          case 'contractors': setContractors(p => [...p, item]); break;
          case 'employees': setEmployees(p => [...p, item]); break;
          case 'resolutions': setResolutions(p => [...p, item]); break;
          case 'parcelRecords': setParcelRecords(p => [...p, item]); break;
          case 'edgarResearchRecords': setEdgarResearchRecords(p => [...p, item]); break;
          case 'achRecords': setAchRecords(p => [...p, item]); break;
          case 'instrumentExchangeRecords': setInstrumentExchangeRecords(p => [...p, item]); break;
          case 'dtccPledgeRecords': setDtccPledgeRecords(p => [...p, item]); break;
          case 'creditResolutions': setCreditResolutions(p => [...p, item]); break;
          case 'purchaseContracts': setPurchaseContracts(p => [...p, item]); break;
          case 'realEstateAssets': setRealEstateAssets(p => [...p, item]); break;
          case 'fiduciaryActions': setFiduciaryActions(p => [...p, item]); break;
          case 'resitusRecords': setResitusRecords(p => [...p, item]); break;
          case 'giftTaxRecords': setGiftTaxRecords(p => [...p, item]); break;
          case 'crmPeople': setCrmPeople(p => [...p, item]); break;
          case 'agencyCertifications': setAgencyCertifications(p => [...p, item]); break;
          case 'fsForm1010s': setFsForm1010s(p => [...p, item]); break;
          case 'creditDefenseRecords': setCreditDefenseRecords(p => [...p, item]); break;
          case 'chanceryFilings': setChanceryFilings(p => [...p, item]); break;
          case 'perfectionInstructions': setPerfectionInstructions(p => [...p, item]); break;
          case 'collateralPools': setCollateralPools(p => [...p, item]); break;
          case 'collateralItems': setCollateralItems(p => [...p, item]); break;
          case 'legalInstruments': setLegalInstruments(p => [...p, item]); break;
          case 'documents': setDocuments(p => [...p, item]); break;
          case 'fedWires': setFedWires(p => [...p, item]); break;
          case 'fiduciaryReviews': setFiduciaryReviews(p => [...p, item]); break;
          case 'maradRecords': setMaradRecords(p => [...p, item]); break;
          case 'filings': setFilings(p => [...p, item]); break;
          case 'settlements': setSettlements(p => [...p, item]); break;
      }
  };

  const createFiling = (entityId: string, formType: types.IRSFormType) => {
      const newFiling: types.ComplianceFiling = { id: uuidv4(), entityId, formType, status: 'Drafted', _version: '1' };
      setFilings(p => [...p, newFiling]);
  };
  const addFiling = (filing: types.ComplianceFiling) => simpleAdd('filings', filing);
  const updateFilingStatus = (id: string, status: any, date?: string) => setFilings(p => p.map(f => f.id === id ? { ...f, status, filingDate: date } : f));
  const submitFilingViaAPI = async (filingId: string) => {
      const filing = filings.find(f => f.id === filingId);
      const entity = entities.find(e => e.id === filing?.entityId);
      if(!filing || !entity) return;
      updateFilingStatus(filingId, 'Transmitting');
      try {
          const log = await simulateTransmission(entity, filing.formType as types.IRSFormType, settings.fuzzing);
          setTransmissions(p => [...p, log]);
          updateFilingStatus(filingId, log.status === 'Accepted' ? 'Accepted' : 'Rejected', log.timestamp);
      } catch (e) {
          updateFilingStatus(filingId, 'Rejected');
      }
  };
  const addTaxModule = (m: types.TaxModule) => setModules(p => [...p, m]);
  
  const performGroundingSearch = async (query: string) => {
      setIsSearching(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Search query: ${query}. Return relevant IRS manual or publication results.`,
              config: { tools: [{ googleSearch: {} }] }
          });
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks && chunks.length > 0) {
              setSearchResults(chunks.filter((c: any) => c.web).map((c: any, i: number) => ({
                  id: `SEARCH-${i}`, title: c.web.title, snippet: 'Source: Google Search Grounding', source: 'Pub', url: c.web.uri, relevance: 1
              })));
          } else {
              setSearchResults(await searchIRSManual(query));
          }
      } catch (e) {
          setSearchResults(await searchIRSManual(query));
      } finally {
          setIsSearching(false);
      }
  };

  const updateSecrets = (u: any) => setSecrets(p => ({...p, ...u}));
  const updateSettings = (u: any) => setSettings(p => ({...p, ...u}));

  const postJournal = (entityId: string, date: string, memo: string, type: string, lines: any[]) => {
      const entry: types.JournalEntry = { id: uuidv4(), entityId, date, memo, type, lines: lines.map(l => ({ ...l, id: uuidv4() })), locked: true, _version: '1' };
      setJournals(p => [...p, entry]);
      syncDoc('journals', entry);
      
      // Update accounts optimistically
      const newAccounts = accounts.map(acc => {
          const relLines = entry.lines.filter(l => l.accountCode === acc.code || l.accountId === acc.id);
          if (relLines.length === 0) return acc;
          let change = 0;
          relLines.forEach(l => change += (acc.type === 'Asset' || acc.type === 'Expense') ? (l.dc === 'Debit' ? l.amount : -l.amount) : (l.dc === 'Credit' ? l.amount : -l.amount));
          const updatedAcc = { ...acc, balance: acc.balance + change };
          syncDoc('accounts', updatedAcc);
          return updatedAcc;
      });
      setAccounts(newAccounts);
  };

  const addAccount = (a: types.Account) => {
      setAccounts(p => [...p, a]);
      syncDoc('accounts', a);
  };
  
  const addCreditInstrument = (i: types.CreditInstrument) => {
      setCreditInstruments(p => [...p, i]);
      if(i.status === 'Accepted') postJournal(i.entityId, i.issueDate, `Credit Acceptance: ${i.type}`, 'ASSET_ACQ', [
          { accountCode: '150000', dc: 'Debit', amount: i.faceAmount, accountName: 'Asset' },
          { accountCode: '250000', dc: 'Credit', amount: i.faceAmount, accountName: 'Liability' }
      ]);
  };
  const executeClosing = (closing: types.ClosingRecord, propId: string, instrId: string, entityId: string, amount: number) => {
      setClosingRecords(p => [...p, closing]);
      setRealEstateAssets(p => p.map(a => a.id === propId ? { ...a, status: 'Owned' } : a));
      setCreditInstruments(p => p.map(i => i.id === instrId ? { ...i, status: 'Discharged' } : i));
      postJournal(entityId, closing.closingDate, `Closing: ${closing.recordingRef}`, 'DISCHARGE', [
          { accountCode: '250000', dc: types.DCFlag.Debit, amount, accountName: 'Liability' },
          { accountCode: '300000', dc: types.DCFlag.Credit, amount, accountName: 'Equity' }
      ]);
  };
  const runPayroll = (entityId: string, start: string, end: string, payDate: string, moduleId: string) => {
      const run: types.PayrollRun = { id: uuidv4(), entityId, periodStart: start, periodEnd: end, payDate, totalGross: 50000, totalEmployerTax: 3800, totalNetPay: 40000, status: 'Posted' };
      setPayrollRuns(p => [...p, run]);
      postJournal(entityId, payDate, `Payroll ${start}`, 'PAYROLL', [
          { accountCode: '510000', dc: types.DCFlag.Debit, amount: 50000, accountName: 'Labor Exp' },
          { accountCode: '101000', dc: types.DCFlag.Credit, amount: 40000, accountName: 'Cash' },
          { accountCode: '210000', dc: types.DCFlag.Credit, amount: 10000, accountName: 'Tax Liab' }
      ]);
  };
  const completeGiftTax = (doneeId: string, amount: number, desc: string, isSplit: boolean) => simpleAdd('giftTaxRecords', { id: uuidv4(), entityId: currentUser.id, doneeId, amount, description: desc, isSplit, date: new Date().toISOString().split('T')[0], status: 'Draft' });
  const addIrsCredential = (c: any) => setIrsCreds(p => [...p, c]);
  const deleteIrsCredential = (id: string) => setIrsCreds(p => p.filter(c => c.id !== id));
  const updateIrsCredential = (id: string, updates: any) => setIrsCreds(p => p.map(c => c.id === id ? {...c, ...updates} : c));

  const contextValue: LedgerContextType = {
      entities, accounts, journals, wallets, users, currentUser, modules, filings,
      transmissions, apiSystemStatus, searchResults, isSearching, documents, canalRecords,
      crmPeople, escrows, ticks, fedWires, contractors, bsoRoles, bsoSubmissions, irsCreds,
      employees, payrollRuns, ssaStatements, resolutions, purchaseContracts, creditResolutions,
      creditInstruments, closingRecords, realEstateAssets, collateralPools, collateralItems,
      fiduciaryActions, resitusRecords, trustCertificates, giftTaxRecords, parcelRecords, edgarResearchRecords, achRecords,
      instrumentExchangeRecords, dtccPledgeRecords, fiduciaryReviews, agencyCertifications,
      fsForm1010s, legalInstruments, creditDefenseRecords, chanceryFilings, perfectionInstructions,
      maradRecords, settlements, secrets, settings, changeGraph, canResume,
      isCloudEnabled, connectToFirebase, pushLocalToCloud,
      is2FAOpen, requestAuthorization, verify2FA, cancel2FA,
      setInitialOwner, loadJimProfile, loadSyntheticFuzz, resumePersistent, wipeSession,
      addUser, updateUser, deleteUser, addEntity, updateEntity, deleteEntity,
      createFiling, addFiling, updateFilingStatus, submitFilingViaAPI, addTaxModule,
      performGroundingSearch, importData, exportData, resetData, updateSecrets, updateSettings,
      generateSyntheticData, generateSampleEnterprise,
      addCanalRecord: (r) => simpleAdd('canalRecords', r), postJournal,
      addEscrow: (e) => simpleAdd('escrows', e), updateEscrow: (e) => setEscrows(p => p.map(ex => ex.id === e.id ? { ...ex, ...e } : ex)),
      addTick: (t) => simpleAdd('ticks', t), updateTick: (t) => setTicks(p => p.map(tk => tk.id === t.id ? { ...tk, ...t } : tk)),
      onOriginate: (r) => simpleAdd('fedWires', r),
      addContractor: (c) => simpleAdd('contractors', c), updateContractor: (c) => setContractors(p => p.map(co => co.id === c.id ? c : co)), deleteContractor: (id) => setContractors(p => p.filter(c => c.id !== id)),
      runPayroll, addEmployee: (e) => simpleAdd('employees', e), updateEmployee: (e) => setEmployees(p => p.map(em => em.id === e.id ? e : em)), deleteEmployee: (id) => setEmployees(p => p.filter(e => e.id !== id)),
      addResolution: (r) => simpleAdd('resolutions', r), recordAsset: (p) => simpleAdd('parcelRecords', p), recordResearch: (r) => simpleAdd('edgarResearchRecords', r),
      originateACH: (r) => simpleAdd('achRecords', r), exchangeInstrument: (r) => simpleAdd('instrumentExchangeRecords', r),
      addDTCCRecord: (r) => simpleAdd('dtccPledgeRecords', r), updateDTCCRecord: (r) => setDtccPledgeRecords(p => p.map(d => d.id === r.id ? r : d)),
      completeReview: (r) => simpleAdd('fiduciaryReviews', r), completeCertification: (c) => simpleAdd('agencyCertifications', c),
      completeFSForm1010: (f) => simpleAdd('fsForm1010s', f), completeLegalInstrument: (i) => simpleAdd('legalInstruments', i),
      completeCreditDefense: (r) => simpleAdd('creditDefenseRecords', r), completeChanceryFiling: (f) => simpleAdd('chanceryFilings', f),
      completePerfection: (i) => simpleAdd('perfectionInstructions', i),
      addRealEstateAsset: (a) => simpleAdd('realEstateAssets', a), addPurchaseContract: (c) => simpleAdd('purchaseContracts', c),
      addCreditResolution: (r) => simpleAdd('creditResolutions', r), addCreditInstrument, executeClosing,
      addCollateralPool: (pool) => simpleAdd('collateralPools', pool), addCollateralItem: (item) => { simpleAdd('collateralItems', item); setCollateralPools(p => p.map(po => po.id === item.poolId ? { ...po, totalValue: po.totalValue + item.assessedValue } : po)); },
      proposeFiduciaryAction: (a) => simpleAdd('fiduciaryActions', a), voteFiduciaryAction: (id, vote) => setFiduciaryActions(p => p.map(a => a.id === id ? { ...a, votes: [...a.votes, vote] } : a)),
      executeFiduciaryAction: (id) => setFiduciaryActions(p => p.map(a => a.id === id ? { ...a, status: 'Executed', dateExecuted: new Date().toISOString() } : a)),
      completeReSitus: (r) => simpleAdd('resitusRecords', r), completeGiftTax,
      addCRMPerson: (p) => simpleAdd('crmPeople', p), 
      updateCRMPerson: (p) => setCrmPeople(prev => prev.map(pr => pr.id === p.id ? p : pr)), 
      deleteCRMPerson: (id) => setCrmPeople(p => p.filter(pr => pr.id !== id)),
      addInteraction: (pid, i) => setCrmPeople(p => p.map(pr => pr.id === pid ? { ...pr, interactions: [i, ...pr.interactions] } : pr)),
      updateIrsCredential, addIrsCredential, deleteIrsCredential, addAccount, addDocument: (doc) => simpleAdd('documents', doc),
      addMaradRecord: (r) => simpleAdd('maradRecords', r),
      addSettlement: (s) => simpleAdd('settlements', s)
  };

  return React.createElement(LedgerContext.Provider, { value: contextValue }, children);
};
