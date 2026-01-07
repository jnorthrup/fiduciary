
import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as types from '../types';
import * as mockData from './mockData';
import { simulateTransmission, searchIRSManual } from './irsApiService';
import { UseCaseLogger } from './useCaseLogger';
import { GoogleGenAI } from "@google/genai";

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
  secrets: types.ApiSecrets;
  settings: types.SystemSettings;
  changeGraph: types.ChangeSet[];
  canResume: boolean;

  is2FAOpen: boolean;
  requestAuthorization: (callback: () => void) => void;
  verify2FA: (code: string) => boolean;
  cancel2FA: () => void;

  setInitialOwner: (name: string, email: string) => void;
  loadJimProfile: () => void;
  loadSyntheticFuzz: () => void;
  resumePersistent: () => void;
  addUser: (user: types.User) => void;
  updateUser: (user: types.User) => void;
  deleteUser: (id: string) => void;
  addEntity: (parentId: string, type: types.EntityType, role: types.EntityRole, nameOverride?: string) => Promise<types.Entity>;
  updateEntity: (id: string, updates: Partial<types.Entity>) => void;
  deleteEntity: (id: string) => void;
  createFiling: (entityId: string, formType: types.IRSFormType) => void;
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
  addInteraction: (pid, i: types.Interaction) => void;
  
  updateIrsCredential: (id: string, updates: Partial<types.IRSAPICredential>) => void;
  addIrsCredential: (cred: types.IRSAPICredential) => void;
  deleteIrsCredential: (id: string) => void;
  addAccount: (account: types.Account) => void;
  addDocument: (doc: types.IRMDocument) => void;
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
  const [secrets, setSecrets] = useState<types.ApiSecrets>({ irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' });
  const [settings, setSettings] = useState<types.SystemSettings>({ fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' }, network: 'Testnet' });
  const [changeGraph, setChangeGraph] = useState<types.ChangeSet[]>([]);
  const [canResume, setCanResume] = useState(false);

  // --- SECURITY CONTEXT ---
  const [is2FAOpen, setIs2FAOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

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

  // Persistence Check
  useEffect(() => {
      const saved = localStorage.getItem('trust_ledger_state');
      if (saved) setCanResume(true);
  }, []);

  // --- ACTIONS ---

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
      setInitialOwner("John Doe", "james@localhost.local");
      generateSampleEnterprise();
  };

  const loadSyntheticFuzz = () => {
      UseCaseLogger.log('SYSTEM', 'Loaded Profile: Synthetic Fuzz');
      setInitialOwner("Synthetic Operator", "ai@fuzznet.local");
      generateSyntheticData();
  };

  const resumePersistent = () => {
      const saved = localStorage.getItem('trust_ledger_state');
      if (saved) {
          UseCaseLogger.log('SYSTEM', 'Resumed Persistent State');
          importData(saved);
      }
  };

  const addUser = (user: types.User) => {
      UseCaseLogger.log('USER', 'Added Team Member', { name: user.name, role: user.role });
      setUsers(prev => [...prev, user]);
  };
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
      UseCaseLogger.log('SYSTEM', 'Created Entity', { id: newEntity.id, name: newEntity.name, type: newEntity.type });
      setEntities(prev => [...prev, newEntity]);
      return newEntity;
  };

  const updateEntity = (id: string, updates: Partial<types.Entity>) => {
      UseCaseLogger.log('USER', 'Updated Entity', { id, updates });
      setEntities(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEntity = (id: string) => {
      UseCaseLogger.log('USER', 'Deleted Entity', { id });
      setEntities(prev => prev.filter(e => e.id !== id));
  };

  const createFiling = (entityId: string, formType: types.IRSFormType) => {
      UseCaseLogger.log('USER', 'Drafted Filing', { entityId, formType });
      const newFiling: types.ComplianceFiling = {
          id: uuidv4(),
          entityId,
          formType,
          status: 'Drafted',
          _version: '1'
      };
      setFilings(prev => [...prev, newFiling]);
  };

  const updateFilingStatus = (id: string, status: types.ComplianceFiling['status'], date?: string) => {
      setFilings(prev => prev.map(f => f.id === id ? { ...f, status, filingDate: date } : f));
  };

  const submitFilingViaAPI = async (filingId: string) => {
      const filing = filings.find(f => f.id === filingId);
      const entity = entities.find(e => e.id === filing?.entityId);
      if (!filing || !entity) return;

      UseCaseLogger.log('NETWORK', 'Submitting Filing via MeF', { filingId, form: filing.formType });
      updateFilingStatus(filingId, 'Transmitting');
      
      try {
          const log = await simulateTransmission(entity, filing.formType as types.IRSFormType, settings.fuzzing);
          setTransmissions(prev => [...prev, log]);
          const finalStatus = log.status === 'Accepted' ? 'Accepted' : 'Rejected';
          UseCaseLogger.log('NETWORK', 'MeF Response Received', { status: finalStatus, ack: log.submissionId });
          updateFilingStatus(filingId, finalStatus, log.timestamp);
      } catch (err) {
          UseCaseLogger.log('NETWORK', 'Transmission Failed', { error: err });
          updateFilingStatus(filingId, 'Rejected');
      }
  };

  const addTaxModule = (module: types.TaxModule) => setModules(prev => [...prev, module]);

  const performGroundingSearch = async (query: string) => {
      setIsSearching(true);
      UseCaseLogger.log('USER', 'Performed Search', { query });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      try {
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Search query: ${query}. Return relevant IRS manual or publication results.`,
              config: {
                  tools: [{ googleSearch: {} }],
                  // Removed responseMimeType enforcement to avoid "Failed to fetch" (400) with grounding
              }
          });
          
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks && chunks.length > 0) {
              const results: types.SearchResult[] = chunks
                .filter((c: any) => c.web)
                .map((c: any, i: number) => ({
                  id: `SEARCH-${i}`,
                  title: c.web.title,
                  snippet: 'Source: Google Search Grounding',
                  source: 'Pub' as const,
                  url: c.web.uri,
                  relevance: 1
              }));
              setSearchResults(results);
          } else {
              // Fallback to internal manual search if AI search returns no grounding chunks
              setSearchResults(await searchIRSManual(query));
          }
      } catch (e) {
          console.error("Grounding search error", e);
          setSearchResults(await searchIRSManual(query));
      } finally {
          setIsSearching(false);
      }
  };

  const importData = (json: string) => {
      try {
          const data = JSON.parse(json);
          setEntities(data.entities || []);
          setAccounts(data.accounts || []);
          setJournals(data.journals || []);
          setUsers(data.users || []);
          setModules(data.modules || []);
          // ... import rest ...
          UseCaseLogger.log('SYSTEM', 'Data Import Successful');
      } catch (e) {
          console.error("Import failed", e);
          UseCaseLogger.log('SYSTEM', 'Data Import Failed');
      }
  };

  const exportData = () => {
      UseCaseLogger.log('USER', 'Exported System Data');
      return JSON.stringify({
          entities, accounts, journals, users, modules, filings, // ... rest
      }, null, 2);
  };

  const resetData = () => {
      UseCaseLogger.log('SYSTEM', 'Reset System Data');
      setEntities([]);
      setAccounts([]);
      setJournals([]);
      // ... clear all
  };

  const updateSecrets = (updates: Partial<types.ApiSecrets>) => setSecrets(prev => ({ ...prev, ...updates }));
  const updateSettings = (updates: Partial<types.SystemSettings>) => setSettings(prev => ({ ...prev, ...updates }));

  const generateSyntheticData = () => {
      // Use Separate Fuzz Data (Disjoint from Jim Profile)
      setEntities(mockData.FUZZ_ENTITIES);
      setAccounts(mockData.FUZZ_ACCOUNTS);
      setJournals(mockData.FUZZ_JOURNALS);
      setModules([]); // Clear specific USR modules
      setFilings([]); // Clear specific USR filings
  };

  const generateSampleEnterprise = () => {
      // Use Jim Profile Data
      setEntities(mockData.JIM_ENTITIES);
      setAccounts(mockData.JIM_ACCOUNTS);
      setJournals(mockData.JIM_JOURNALS);
      setModules(mockData.JIM_MODULES);
      setFilings(mockData.JIM_FILINGS);
  };

  const simpleAdd = (key: string, item: any) => {
      UseCaseLogger.log('SYSTEM', `Added ${key} Record`, { id: item.id });
      // Generic adder for simple lists
      // In a real app with proper TS discrimination this would be safer
      // Here we map key to setter
      switch(key) {
          case 'canalRecords': setCanalRecords(prev => [...prev, item]); break;
          case 'escrows': setEscrows(prev => [...prev, item]); break;
          case 'ticks': setTicks(prev => [...prev, item]); break;
          case 'contractors': setContractors(prev => [...prev, item]); break;
          case 'employees': setEmployees(prev => [...prev, item]); break;
          case 'resolutions': setResolutions(prev => [...prev, item]); break;
          case 'parcelRecords': setParcelRecords(prev => [...prev, item]); break;
          case 'edgarResearchRecords': setEdgarResearchRecords(prev => [...prev, item]); break;
          case 'achRecords': setAchRecords(prev => [...prev, item]); break;
          case 'instrumentExchangeRecords': setInstrumentExchangeRecords(prev => [...prev, item]); break;
          case 'dtccPledgeRecords': setDtccPledgeRecords(prev => [...prev, item]); break;
          case 'creditResolutions': setCreditResolutions(prev => [...prev, item]); break;
          case 'purchaseContracts': setPurchaseContracts(prev => [...prev, item]); break;
          case 'realEstateAssets': setRealEstateAssets(prev => [...prev, item]); break;
          case 'fiduciaryActions': setFiduciaryActions(prev => [...prev, item]); break;
          case 'resitusRecords': setResitusRecords(prev => [...prev, item]); break;
          case 'giftTaxRecords': setGiftTaxRecords(prev => [...prev, item]); break;
          case 'crmPeople': setCrmPeople(prev => [...prev, item]); break;
          case 'agencyCertifications': setAgencyCertifications(prev => [...prev, item]); break;
          case 'fsForm1010s': setFsForm1010s(prev => [...prev, item]); break;
          case 'creditDefenseRecords': setCreditDefenseRecords(prev => [...prev, item]); break;
          case 'chanceryFilings': setChanceryFilings(prev => [...prev, item]); break;
          case 'perfectionInstructions': setPerfectionInstructions(prev => [...prev, item]); break;
          case 'collateralPools': setCollateralPools(prev => [...prev, item]); break;
          case 'collateralItems': setCollateralItems(prev => [...prev, item]); break;
          case 'legalInstruments': setLegalInstruments(prev => [...prev, item]); break;
          case 'documents': setDocuments(prev => [...prev, item]); break;
      }
  };

  const postJournal = (entityId: string, date: string, memo: string, type: string, lines: any[]) => {
      const entry: types.JournalEntry = {
          id: uuidv4(),
          entityId,
          date,
          memo,
          type,
          lines: lines.map(l => ({ ...l, id: uuidv4() })),
          locked: true,
          _version: '1'
      };
      
      UseCaseLogger.log('SYSTEM', 'Posted Journal Entry', { id: entry.id, type, amount: lines[0]?.amount });
      setJournals(prev => [...prev, entry]);
      
      // Update account balances
      setAccounts(prev => prev.map(acc => {
          const relevantLines = entry.lines.filter(l => l.accountCode === acc.code); // Assuming code match or ID match
          if (relevantLines.length === 0) return acc;
          
          let balanceChange = 0;
          relevantLines.forEach(l => {
              if (acc.type === types.AccountType.ASSET || acc.type === types.AccountType.EXPENSE) {
                  balanceChange += l.dc === types.DCFlag.Debit ? l.amount : -l.amount;
              } else {
                  balanceChange += l.dc === types.DCFlag.Credit ? l.amount : -l.amount;
              }
          });
          return { ...acc, balance: acc.balance + balanceChange };
      }));
  };

  const addAccount = (account: types.Account) => {
      UseCaseLogger.log('SYSTEM', 'Created Account', { id: account.id, name: account.name });
      setAccounts(prev => [...prev, account]);
  };

  const executeClosing = (closing: types.ClosingRecord, propId: string, instrId: string, entityId: string, amount: number) => {
      UseCaseLogger.log('SYSTEM', 'Executed Real Estate Closing', { propId });
      setClosingRecords(prev => [...prev, closing]);
      // Update Asset Status
      setRealEstateAssets(prev => prev.map(a => a.id === propId ? { ...a, status: 'Owned' } : a));
      // Update Instrument Status
      setCreditInstruments(prev => prev.map(i => i.id === instrId ? { ...i, status: 'Discharged' } : i));
      
      // Post Journal: Discharge Liability via Corpus (Zero-Liability)
      // Liability was booked at Instrument Acceptance. Now we close it out.
      postJournal(entityId, closing.closingDate, `Real Estate Closing: ${closing.recordingRef}`, 'INST_DISCHARGE', [
          { accountCode: '250000', dc: types.DCFlag.Debit, amount: amount, accountName: 'Credit Instruments Payable' },
          { accountCode: '300000', dc: types.DCFlag.Credit, amount: amount, accountName: 'Trust Corpus' }
      ]);
  };

  const addCreditInstrument = (instrument: types.CreditInstrument) => {
      UseCaseLogger.log('SYSTEM', 'Issued Credit Instrument', { id: instrument.id });
      setCreditInstruments(prev => [...prev, instrument]);
      
      if (instrument.status === 'Accepted') {
          // Rule: Upon acceptance, recognize Asset Acquisition and Credit Issuance (Liability)
          postJournal(
              instrument.entityId,
              instrument.issueDate,
              `Credit Instrument Acceptance: ${instrument.type}`,
              'ASSET_ACQ_CREDIT',
              [
                  { accountCode: '150000', dc: types.DCFlag.Debit, amount: instrument.faceAmount, accountName: 'Real Estate Asset' },
                  { accountCode: '250000', dc: types.DCFlag.Credit, amount: instrument.faceAmount, accountName: 'Credit Instruments Payable' }
              ]
          );
      }
  };

  const addCollateralItem = (item: types.CollateralItem) => {
      simpleAdd('collateralItems', item);
      // Update pool total
      setCollateralPools(prev => prev.map(p => {
          if (p.id === item.poolId) {
              return { ...p, totalValue: p.totalValue + item.assessedValue };
          }
          return p;
      }));
  };

  const runPayroll = (entityId: string, start: string, end: string, payDate: string, moduleId: string) => {
      // Mock calc
      const run: types.PayrollRun = {
          id: uuidv4(),
          entityId,
          periodStart: start,
          periodEnd: end,
          payDate,
          totalGross: 50000,
          totalEmployerTax: 3800,
          totalNetPay: 40000,
          status: 'Posted'
      };
      
      UseCaseLogger.log('SYSTEM', 'Ran Payroll', { runId: run.id, totalGross: 50000 });
      setPayrollRuns(prev => [...prev, run]);
      postJournal(entityId, payDate, `Payroll Run ${start}-${end}`, 'PAYROLL', [
          { accountCode: '510000', dc: types.DCFlag.Debit, amount: 50000, accountName: 'Salaries Expense' },
          { accountCode: '101000', dc: types.DCFlag.Credit, amount: 40000, accountName: 'Operating Cash' },
          { accountCode: '210000', dc: types.DCFlag.Credit, amount: 10000, accountName: 'Tax Liabilities' }
      ]);
  };

  const completeGiftTax = (doneeId: string, amount: number, desc: string, isSplit: boolean) => {
      // Store record (mock)
      const record: types.GiftTaxRecord = {
          id: uuidv4(),
          entityId: currentUser.id, // Assuming current user context or passed in entity
          doneeId,
          amount,
          description: desc,
          isSplit,
          date: new Date().toISOString().split('T')[0],
          status: 'Draft'
      };
      simpleAdd('giftTaxRecords', record);
  };

  // Add Credential Helper
  const addIrsCredential = (cred: types.IRSAPICredential) => setIrsCreds(prev => [...prev, cred]);
  const deleteIrsCredential = (id: string) => setIrsCreds(prev => prev.filter(c => c.id !== id));

  // Bundle context
  const contextValue: LedgerContextType = {
      entities, accounts, journals, wallets, users, currentUser, modules, filings,
      transmissions, apiSystemStatus, searchResults, isSearching, documents, canalRecords,
      crmPeople, escrows, ticks, fedWires, contractors, bsoRoles, bsoSubmissions, irsCreds,
      employees, payrollRuns, ssaStatements, resolutions, purchaseContracts, creditResolutions,
      creditInstruments, closingRecords, realEstateAssets, fiduciaryActions, resitusRecords,
      trustCertificates, giftTaxRecords, parcelRecords, edgarResearchRecords, achRecords,
      instrumentExchangeRecords, dtccPledgeRecords, fiduciaryReviews, agencyCertifications,
      fsForm1010s, legalInstruments, creditDefenseRecords, chanceryFilings, perfectionInstructions,
      collateralPools, collateralItems,
      secrets, settings, changeGraph, canResume,

      is2FAOpen, requestAuthorization, verify2FA, cancel2FA,

      setInitialOwner, loadJimProfile, loadSyntheticFuzz, resumePersistent,
      addUser, updateUser, deleteUser, addEntity, updateEntity, deleteEntity,
      createFiling, updateFilingStatus, submitFilingViaAPI, addTaxModule,
      performGroundingSearch, importData, exportData, resetData, updateSecrets, updateSettings,
      generateSyntheticData, generateSampleEnterprise,
      addCanalRecord: (r) => simpleAdd('canalRecords', r),
      postJournal,
      addEscrow: (e) => simpleAdd('escrows', e),
      updateEscrow: (e) => setEscrows(prev => prev.map(ex => ex.id === e.id ? { ...ex, ...e } : ex)),
      addTick: (t) => simpleAdd('ticks', t),
      updateTick: (t) => setTicks(prev => prev.map(tk => tk.id === t.id ? { ...tk, ...t } : tk)),
      onOriginate: (r) => simpleAdd('fedWires', r),
      addContractor: (c) => simpleAdd('contractors', c),
      updateContractor: (c) => setContractors(prev => prev.map(co => co.id === c.id ? c : co)),
      deleteContractor: (id) => setContractors(prev => prev.filter(c => c.id !== id)),
      runPayroll,
      addEmployee: (e) => simpleAdd('employees', e),
      updateEmployee: (e) => setEmployees(prev => prev.map(em => em.id === e.id ? e : em)),
      deleteEmployee: (id) => setEmployees(prev => prev.filter(e => e.id !== id)),
      addResolution: (r) => simpleAdd('resolutions', r),
      recordAsset: (p) => simpleAdd('parcelRecords', p),
      recordResearch: (r) => simpleAdd('edgarResearchRecords', r),
      originateACH: (r) => simpleAdd('achRecords', r),
      exchangeInstrument: (r) => simpleAdd('instrumentExchangeRecords', r),
      addDTCCRecord: (r) => simpleAdd('dtccPledgeRecords', r),
      updateDTCCRecord: (r) => setDtccPledgeRecords(prev => prev.map(d => d.id === r.id ? r : d)),
      completeReview: (r) => simpleAdd('fiduciaryReviews', r),
      completeCertification: (c) => simpleAdd('agencyCertifications', c),
      completeFSForm1010: (f) => simpleAdd('fsForm1010s', f),
      completeLegalInstrument: (i) => simpleAdd('legalInstruments', i),
      completeCreditDefense: (r) => simpleAdd('creditDefenseRecords', r),
      completeChanceryFiling: (f) => simpleAdd('chanceryFilings', f),
      completePerfection: (i) => simpleAdd('perfectionInstructions', i),
      
      addRealEstateAsset: (a) => simpleAdd('realEstateAssets', a),
      addPurchaseContract: (c) => simpleAdd('purchaseContracts', c),
      addCreditResolution: (r) => simpleAdd('creditResolutions', r),
      addCreditInstrument,
      executeClosing,
      
      addCollateralPool: (pool) => simpleAdd('collateralPools', pool),
      addCollateralItem,

      proposeFiduciaryAction: (a) => simpleAdd('fiduciaryActions', a),
      voteFiduciaryAction: (id, vote) => setFiduciaryActions(prev => prev.map(a => a.id === id ? { ...a, votes: [...a.votes, vote] } : a)),
      executeFiduciaryAction: (id) => setFiduciaryActions(prev => prev.map(a => a.id === id ? { ...a, status: 'Executed', dateExecuted: new Date().toISOString() } : a)),
      
      completeReSitus: (r) => simpleAdd('resitusRecords', r),
      completeGiftTax,
      
      addCRMPerson: (p) => simpleAdd('crmPeople', p),
      updateCRMPerson: (p) => setCrmPeople(prev => prev.map(pr => pr.id === p.id ? p : pr)),
      deleteCRMPerson: (id) => setCrmPeople(prev => prev.filter(p => p.id !== id)),
      addInteraction: (pid, i) => setCrmPeople(prev => prev.map(p => p.id === pid ? { ...p, interactions: [i, ...p.interactions] } : p)),
      
      updateIrsCredential: (id, updates) => setIrsCreds(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)),
      addIrsCredential,
      deleteIrsCredential,
      addAccount,
      addDocument: (doc) => simpleAdd('documents', doc)
  };

  return React.createElement(LedgerContext.Provider, { value: contextValue }, children);
};
