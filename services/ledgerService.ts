
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  automationRules: types.AutomatedRule[];

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
  executeAutoRule: (trigger: types.TransactionTrigger, entityId: string, baseAmount: number, date: string, memo: string) => void;
  addAutoRule: (rule: types.AutomatedRule) => void;
  updateAutoRule: (rule: types.AutomatedRule) => void;
  deleteAutoRule: (id: string) => void;
  
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
  
  proposeFiduciaryAction: (a: types.FiduciaryAction) => void;
  voteFiduciaryAction: (id: string, vote: types.FiduciaryVote) => void;
  executeFiduciaryAction: (id: string) => void;
  
  completeReSitus: (r: types.ReSitusRecord) => void;
  completeGiftTax: (doneeId: string, amount: number, desc: string, isSplit: boolean) => void;
  
  addCRMPerson: (p: types.CRMPerson) => void;
  updateCRMPerson: (p: types.CRMPerson) => void;
  deleteCRMPerson: (id: string) => void;
  addInteraction: (personId: string, i: types.Interaction) => void;
  
  addIrsCredential: (c: types.IRSAPICredential) => void;
  updateIrsCredential: (id: string, updates: Partial<types.IRSAPICredential>) => void;
  deleteIrsCredential: (id: string) => void;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const useLedgerStore = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedgerStore must be used within a LedgerProvider');
  }
  return context;
};

// --- DEFAULT AUTOMATION RULES ---
const DEFAULT_RULES: types.AutomatedRule[] = [
    {
        id: 'RULE-PAY',
        trigger: 'PAYROLL_RUN',
        name: 'Standard Payroll Posting',
        description: 'Auto-posts Gross Wage Exp, Employer Tax Exp, and Cash Withdrawal.',
        lines: [
            { accountCode: '510000', accountName: 'Salaries Expense', dc: types.DCFlag.Debit, formula: 'FULL_AMOUNT', value: 0 },
            { accountCode: '520000', accountName: 'Payroll Tax Expense', dc: types.DCFlag.Debit, formula: 'PERCENTAGE', value: 0.0765 }, // Employer share
            { accountCode: '210000', accountName: 'Tax Liabilities', dc: types.DCFlag.Credit, formula: 'PERCENTAGE', value: 0.0765 },
            { accountCode: '101000', accountName: 'Operating Cash', dc: types.DCFlag.Credit, formula: 'FULL_AMOUNT', value: 0 }
        ]
    },
    {
        id: 'RULE-TAX',
        trigger: 'TAX_PAYMENT',
        name: 'Estimated Tax Payment',
        description: 'Moves cash to tax clearing account.',
        lines: [
            { accountCode: '210000', accountName: 'Tax Liabilities', dc: types.DCFlag.Debit, formula: 'FULL_AMOUNT', value: 0 },
            { accountCode: '101000', accountName: 'Operating Cash', dc: types.DCFlag.Credit, formula: 'FULL_AMOUNT', value: 0 }
        ]
    },
    {
        id: 'RULE-MATERIAL',
        trigger: 'MATERIAL_PURCHASE',
        name: 'COGS / Material Purchase',
        description: 'Records expense and sales tax for materials.',
        lines: [
            { accountCode: '500000', accountName: 'Materials Expense', dc: types.DCFlag.Debit, formula: 'FULL_AMOUNT', value: 0 },
            { accountCode: '101000', accountName: 'Operating Cash', dc: types.DCFlag.Credit, formula: 'FULL_AMOUNT', value: 0 }
        ]
    },
    {
        id: 'RULE-CONTRACTOR',
        trigger: 'CONTRACTOR_INVOICE',
        name: '1099 Contractor Pmt',
        description: 'Records labor expense for outside services.',
        lines: [
            { accountCode: '510000', accountName: 'Contract Labor Expense', dc: types.DCFlag.Debit, formula: 'FULL_AMOUNT', value: 0 },
            { accountCode: '101000', accountName: 'Operating Cash', dc: types.DCFlag.Credit, formula: 'FULL_AMOUNT', value: 0 }
        ]
    },
    {
        id: 'RULE-RE-CLOSE',
        trigger: 'REAL_ESTATE_CLOSE',
        name: 'Property Acquisition',
        description: 'Capitalizes asset and credits trust corpus (Zero-Liability).',
        lines: [
            { accountCode: '150000', accountName: 'Real Estate Asset', dc: types.DCFlag.Debit, formula: 'FULL_AMOUNT', value: 0 },
            { accountCode: '300000', accountName: 'Trust Corpus', dc: types.DCFlag.Credit, formula: 'FULL_AMOUNT', value: 0 }
        ]
    }
];

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
  const [legalInstruments, setLegalInstruments] = useState<types.LegalInstrument[]>([]);
  const [creditDefenseRecords, setCreditDefenseRecords] = useState<types.CreditDefenseRecord[]>(mockData.SEED_CREDIT_DEFENSE);
  const [chanceryFilings, setChanceryFilings] = useState<types.ChanceryFiling[]>([]);
  const [perfectionInstructions, setPerfectionInstructions] = useState<types.PerfectionInstruction[]>([]);
  const [secrets, setSecrets] = useState<types.ApiSecrets>({ irsEtin: '', irsAppId: '', bsoUserId: '', hmacKey: '' });
  const [settings, setSettings] = useState<types.SystemSettings>({ fuzzing: { enabled: false, intensity: 'Low', latencyMode: 'Realistic' }, network: 'Testnet' });
  const [changeGraph, setChangeGraph] = useState<types.ChangeSet[]>([]);
  const [canResume, setCanResume] = useState(false);
  const [automationRules, setAutomationRules] = useState<types.AutomatedRule[]>(DEFAULT_RULES);

  // --- SECURITY CONTEXT ---
  const [is2FAOpen, setIs2FAOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const requestAuthorization = (callback: () => void) => {
      UseCaseLogger.log('SYSTEM', '2FA Requested for Action');
      setPendingCallback(() => callback);
      setIs2FAOpen(true);
  };

  const verify2FA = (code: string): boolean => {
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

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
      const saved = localStorage.getItem('trust_ledger_state');
      if (saved) setCanResume(true);
  }, []);

  // Debounced Save Effect
  useEffect(() => {
      if (entities.length > 0) {
          const stateToSave = {
              entities, accounts, journals, users, currentUser, modules, filings,
              transmissions, canalRecords, crmPeople, escrows, ticks, fedWires, 
              contractors, bsoRoles, bsoSubmissions, irsCreds, employees, payrollRuns,
              secrets, settings, automationRules
          };
          const handler = setTimeout(() => {
              localStorage.setItem('trust_ledger_state', JSON.stringify(stateToSave));
              setCanResume(true);
          }, 2000);
          return () => clearTimeout(handler);
      }
  }, [entities, accounts, journals, users, filings, transmissions, automationRules]);

  const resumePersistent = () => {
      const saved = localStorage.getItem('trust_ledger_state');
      if (saved) {
          try {
              const data = JSON.parse(saved);
              setEntities(data.entities || []);
              setAccounts(data.accounts || []);
              setJournals(data.journals || []);
              setUsers(data.users || []);
              if (data.currentUser) setCurrentUser(data.currentUser);
              setModules(data.modules || []);
              setFilings(data.filings || []);
              setTransmissions(data.transmissions || []);
              setCanalRecords(data.canalRecords || []);
              setCrmPeople(data.crmPeople || []);
              setEscrows(data.escrows || []);
              setTicks(data.ticks || []);
              setFedWires(data.fedWires || []);
              setContractors(data.contractors || []);
              setBsoRoles(data.bsoRoles || []);
              setBsoSubmissions(data.bsoSubmissions || []);
              setIrsCreds(data.irsCreds || []);
              setEmployees(data.employees || []);
              setPayrollRuns(data.payrollRuns || []);
              if(data.secrets) setSecrets(data.secrets);
              if(data.settings) setSettings(data.settings);
              if(data.automationRules) setAutomationRules(data.automationRules);
              
              UseCaseLogger.log('SYSTEM', 'Resumed Persistent State');
          } catch (e) {
              console.error("Failed to load state", e);
              UseCaseLogger.log('SYSTEM', 'State Load Failed');
          }
      }
  };

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
      setInitialOwner("James R. Northrup Jr.", "james@sovereign-node.local");
      generateSampleEnterprise();
  };

  const loadSyntheticFuzz = () => {
      UseCaseLogger.log('SYSTEM', 'Loaded Profile: Synthetic Fuzz');
      setInitialOwner("Synthetic Operator", "ai@fuzznet.local");
      generateSyntheticData();
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
          UseCaseLogger.log('SYSTEM', 'Data Import Successful');
      } catch (e) {
          console.error("Import failed", e);
          UseCaseLogger.log('SYSTEM', 'Data Import Failed');
      }
  };

  const exportData = () => {
      UseCaseLogger.log('USER', 'Exported System Data');
      return JSON.stringify({
          entities, accounts, journals, users, modules, filings,
          transmissions, canalRecords, crmPeople, escrows, ticks, 
          fedWires, contractors, bsoRoles, bsoSubmissions, irsCreds, 
          employees, payrollRuns, secrets, settings, automationRules
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
      setEntities(mockData.FUZZ_ENTITIES);
      setAccounts(mockData.FUZZ_ACCOUNTS);
      setJournals(mockData.FUZZ_JOURNALS);
      setModules([]); 
      setFilings([]); 
  };

  const generateSampleEnterprise = () => {
      setEntities(mockData.JIM_ENTITIES);
      setAccounts(mockData.JIM_ACCOUNTS);
      setJournals(mockData.JIM_JOURNALS);
      setModules(mockData.JIM_MODULES);
      setFilings(mockData.JIM_FILINGS);
  };

  const simpleAdd = (key: string, item: any) => {
      UseCaseLogger.log('SYSTEM', `Added ${key} Record`, { id: item.id });
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
          case 'creditInstruments': setCreditInstruments(prev => [...prev, item]); break;
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
          case 'irsCreds': setIrsCreds(prev => [...prev, item]); break;
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
      
      setAccounts(prev => prev.map(acc => {
          const relevantLines = entry.lines.filter(l => l.accountCode === acc.code); 
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

  const executeAutoRule = (trigger: types.TransactionTrigger, entityId: string, baseAmount: number, date: string, memo: string) => {
      const rule = automationRules.find(r => r.trigger === trigger);
      if (!rule) {
          UseCaseLogger.log('SYSTEM', `No auto-rule found for trigger: ${trigger}`);
          return;
      }

      const lines = rule.lines.map(line => {
          let amount = 0;
          if (line.formula === 'FULL_AMOUNT') amount = baseAmount;
          if (line.formula === 'PERCENTAGE') amount = baseAmount * line.value;
          if (line.formula === 'FIXED') amount = line.value;
          
          // Fetch account details from entity accounts or use placeholder
          const account = accounts.find(a => a.entityId === entityId && a.code === line.accountCode);
          
          return {
              accountCode: line.accountCode,
              accountName: account?.name || line.accountName,
              dc: line.dc,
              amount: parseFloat(amount.toFixed(2))
          };
      });

      postJournal(entityId, date, `${rule.name}: ${memo}`, trigger, lines);
  };

  const addAutoRule = (rule: types.AutomatedRule) => setAutomationRules(prev => [...prev, rule]);
  const updateAutoRule = (rule: types.AutomatedRule) => setAutomationRules(prev => prev.map(r => r.id === rule.id ? rule : r));
  const deleteAutoRule = (id: string) => setAutomationRules(prev => prev.filter(r => r.id !== id));

  const executeClosing = (closing: types.ClosingRecord, propId: string, instrId: string, entityId: string, amount: number) => {
      UseCaseLogger.log('SYSTEM', 'Executed Real Estate Closing', { propId });
      setClosingRecords(prev => [...prev, closing]);
      setRealEstateAssets(prev => prev.map(a => a.id === propId ? { ...a, status: 'Owned' } : a));
      setCreditInstruments(prev => prev.map(i => i.id === instrId ? { ...i, status: 'Discharged' } : i));
      
      // Try using Auto Rule first
      const rule = automationRules.find(r => r.trigger === 'REAL_ESTATE_CLOSE');
      if (rule) {
          executeAutoRule('REAL_ESTATE_CLOSE', entityId, amount, closing.closingDate, `Real Estate Closing: ${closing.recordingRef}`);
      } else {
          // Fallback to hardcoded logic if rule is deleted
          postJournal(entityId, closing.closingDate, `Real Estate Closing: ${closing.recordingRef}`, 'ASSET_ACQ', [
              { accountCode: '150000', dc: types.DCFlag.Debit, amount: amount, accountName: 'Real Estate Asset' },
              { accountCode: '300000', dc: types.DCFlag.Credit, amount: amount, accountName: 'Trust Corpus' }
          ]);
      }
  };

  const runPayroll = (entityId: string, start: string, end: string, payDate: string, moduleId: string) => {
      const totalGross = 50000; // Mock calculation base
      const run: types.PayrollRun = {
          id: uuidv4(),
          entityId,
          periodStart: start,
          periodEnd: end,
          payDate,
          totalGross,
          totalEmployerTax: totalGross * 0.0765,
          totalNetPay: totalGross * (1 - 0.2), // Mock tax
          status: 'Posted'
      };
      
      UseCaseLogger.log('SYSTEM', 'Ran Payroll', { runId: run.id, totalGross });
      setPayrollRuns(prev => [...prev, run]);
      
      // Use Automation Rule
      executeAutoRule('PAYROLL_RUN', entityId, totalGross, payDate, `Payroll ${start}-${end}`);
  };

  const completeGiftTax = (doneeId: string, amount: number, desc: string, isSplit: boolean) => {
      const record: types.GiftTaxRecord = {
          id: uuidv4(),
          entityId: currentUser.id, 
          doneeId,
          amount,
          description: desc,
          isSplit,
          date: new Date().toISOString().split('T')[0],
          status: 'Draft'
      };
      simpleAdd('giftTaxRecords', record);
  };

  const contextValue: LedgerContextType = {
      entities, accounts, journals, wallets, users, currentUser, modules, filings,
      transmissions, apiSystemStatus, searchResults, isSearching, documents, canalRecords,
      crmPeople, escrows, ticks, fedWires, contractors, bsoRoles, bsoSubmissions, irsCreds,
      employees, payrollRuns, ssaStatements, resolutions, purchaseContracts, creditResolutions,
      creditInstruments, closingRecords, realEstateAssets, fiduciaryActions, resitusRecords,
      trustCertificates, giftTaxRecords, parcelRecords, edgarResearchRecords, achRecords,
      instrumentExchangeRecords, dtccPledgeRecords, fiduciaryReviews, agencyCertifications,
      fsForm1010s, legalInstruments, creditDefenseRecords, chanceryFilings, perfectionInstructions,
      secrets, settings, changeGraph, canResume, automationRules,

      is2FAOpen, requestAuthorization, verify2FA, cancel2FA,

      setInitialOwner, loadJimProfile, loadSyntheticFuzz, resumePersistent,
      addUser, updateUser, deleteUser, addEntity, updateEntity, deleteEntity,
      createFiling, updateFilingStatus, submitFilingViaAPI, addTaxModule,
      performGroundingSearch, importData, exportData, resetData, updateSecrets, updateSettings,
      generateSyntheticData, generateSampleEnterprise,
      addCanalRecord: (r) => simpleAdd('canalRecords', r),
      postJournal,
      executeAutoRule,
      addAutoRule, updateAutoRule, deleteAutoRule,
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
      addCreditInstrument: (i) => simpleAdd('creditInstruments', i),
      executeClosing,
      
      proposeFiduciaryAction: (a) => simpleAdd('fiduciaryActions', a),
      voteFiduciaryAction: (id, vote) => setFiduciaryActions(prev => prev.map(a => a.id === id ? { ...a, votes: [...a.votes, vote] } : a)),
      executeFiduciaryAction: (id) => setFiduciaryActions(prev => prev.map(a => a.id === id ? { ...a, status: 'Executed', dateExecuted: new Date().toISOString() } : a)),
      
      completeReSitus: (r) => simpleAdd('resitusRecords', r),
      completeGiftTax,
      
      addCRMPerson: (p) => simpleAdd('crmPeople', p),
      updateCRMPerson: (p) => setCrmPeople(prev => prev.map(pr => pr.id === p.id ? p : pr)),
      deleteCRMPerson: (id) => setCrmPeople(prev => prev.filter(p => p.id !== id)),
      addInteraction: (pid, i) => setCrmPeople(prev => prev.map(p => p.id === pid ? { ...p, interactions: [i, ...p.interactions] } : p)),
      
      addIrsCredential: (c) => simpleAdd('irsCreds', c),
      updateIrsCredential: (id, updates) => setIrsCreds(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)),
      deleteIrsCredential: (id) => setIrsCreds(prev => prev.filter(c => c.id !== id))
  };

  return React.createElement(LedgerContext.Provider, { value: contextValue }, children);
};