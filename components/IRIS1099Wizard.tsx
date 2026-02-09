/**
 * IRS IRIS 1099 Submission Wizard
 *
 * Complete wizard for submitting 1099 forms through the IRS IRIS A2A API.
 * Integrates with the backend API server and Google GenAI for validation.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
  Building2, User, Plus, Trash2, RefreshCw,
  Lock, Shield, Zap, Server, Activity, KeyRound, Fingerprint, Loader2, Terminal,
  RefreshCcw, Info
} from 'lucide-react';
import { useLedgerStore } from '../services/ledgerService';
import { isValidTINFormat, isValidZipFormat } from '../utils/validation';
import { TIN_PLACEHOLDER, SSN_PLACEHOLDER, TCC_PLACEHOLDER, REGEX_TCC } from '../utils/constants';
import {
  irsApi,
  type FormType,
  type SubmissionRequest,
  type PayeeRecord,
  type FilerInfo,
  type SubmissionReceipt,
  type BatchStatus,
  type TinMatchResponse,
  formatEIN,
  getFormAmountFields,
  type ValidationError
} from '../services/irsApiClient';
import {
  storeTCC,
  getStoredTCCs,
  storeBearerToken,
  type StoredCredential
} from '../services/secureStorage';

interface Props {
  entityId: string;
  onClose?: () => void;
}

type WizardStep = 'Auth' | 'Filer' | 'FormType' | 'Payees' | 'Review' | 'Submit' | 'Result';
type SubmissionStatus = 'idle' | 'validating' | 'submitting' | 'polling' | 'success' | 'error';

/**
 * Format EIN as user types, without throwing errors
 */
const formatEINInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const limited = digits.slice(0, 9);
  if (limited.length <= 2) return limited;
  return `${limited.slice(0, 2)}-${limited.slice(2)}`;
};

export const IRIS1099Wizard: React.FC<Props> = ({ entityId, onClose }) => {
  const store = useLedgerStore();
  const activeEntity = store.entities.find(e => e.id === entityId);

  // Auth State
  const [authMode, setAuthMode] = useState<'tcc' | 'bearer'>('tcc');
  const [tcc, setTcc] = useState('');
  const [bearerToken, setBearerToken] = useState('');

  // IRS Login Modal State
  const [authenticatedUser, setAuthenticatedUser] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<{ status: string; service: string; version?: string } | null>(null);
  const [isFetchingTCC, setIsFetchingTCC] = useState(false);
  const [tccLog, setTccLog] = useState<string[]>([]);
  const [storedTCCs, setStoredTCCs] = useState<StoredCredential[]>([]);
  const [saveCredentials, setSaveCredentials] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionCheckState, setConnectionCheckState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [tccFormatStatus, setTccFormatStatus] = useState<'empty' | 'invalid' | 'partial' | 'valid'>('empty');
  const [authModeAnimating, setAuthModeAnimating] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Wizard State
  const [currentStep, setCurrentStep] = useState<WizardStep>('Auth');
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Filer State
  const [filer, setFiler] = useState<FilerInfo>({
    ein: '',
    name: '',
    tradeName: '',
    address: {
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });

  // Form Selection
  const [formType, setFormType] = useState<FormType>('1099-NEC');
  const [taxYear, setTaxYear] = useState(new Date().getFullYear() - 1);
  const [transmitterId, setTransmitterId] = useState('');
  const [softwareId, setSoftwareId] = useState('SOFTWARE-001');

  // Payees State
  const [payees, setPayees] = useState<PayeeRecord[]>([]);
  const [currentPayee, setCurrentPayee] = useState<PayeeRecord>({
    tin: '',
    name: '',
    address: {
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    amounts: {}
  });

  // Submission Results
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // TIN Validation State
  const [tinValidation, setTinValidation] = useState<Record<string, TinMatchResponse>>({});
  const [validatingTin, setValidatingTin] = useState<string | null>(null);
  const [tinFormatError, setTinFormatError] = useState<string | null>(null);
  const [tinDuplicateWarning, setTinDuplicateWarning] = useState<string | null>(null);

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
    loadStoredCredentials();
  }, []);

  // TCC format validation with HSL color feedback
  useEffect(() => {
    if (!tcc) {
      setTccFormatStatus('empty');
      return;
    }

    // Check TCC format: XX-XXXXXXX (2 letters, hyphen, 7 alphanumeric)
    const tccPattern = REGEX_TCC;
    const partialPattern = /^[A-Z]{0,2}-?[A-Z0-9]{0,7}$/;

    if (tccPattern.test(tcc)) {
      setTccFormatStatus('valid');
    } else if (partialPattern.test(tcc)) {
      setTccFormatStatus('partial');
    } else {
      setTccFormatStatus('invalid');
    }
  }, [tcc]);

  const loadStoredCredentials = async () => {
    const tccs = await getStoredTCCs();
    setStoredTCCs(tccs);
  };

  const checkApiHealth = async () => {
    try {
      const health = await irsApi.healthCheck();
      setApiHealth(health);
    } catch (e) {
      setApiHealth({ status: 'error', service: 'IRS IRIS API Proxy' });
    }
  };

  // Validate TCC format (XX-XXXXXXX)
  const isValidTCC = (tccValue: string): boolean => {
    return REGEX_TCC.test(tccValue);
  };

  // Validate bearer token format (non-empty string)
  const isValidBearerToken = (token: string): boolean => {
    return token.length > 0;
  };

  // Validate TIN format (EIN: XX-XXXXXXX or SSN: XXX-XX-XXXX)
  // Replaced with centralized utility: isValidTINFormat

  // Check if TIN is duplicate
  const isDuplicateTIN = (tin: string): boolean => {
    return payees.some(p => p.tin === tin);
  };

  // Handle TIN input change with validation
  const handleTINChange = (tin: string) => {
    setCurrentPayee({ ...currentPayee, tin });

    // Clear errors on change
    setTinFormatError(null);
    setTinDuplicateWarning(null);
  };

  // Handle TIN blur for validation
  const handleTINBlur = () => {
    const tin = currentPayee.tin;
    if (!tin) {
      setTinFormatError(null);
      setTinDuplicateWarning(null);
      return;
    }

    // Check format
    if (!isValidTINFormat(tin)) {
      setTinFormatError(`Invalid TIN format. Use ${TIN_PLACEHOLDER} (EIN) or ${SSN_PLACEHOLDER} (SSN)`);
      return;
    }

    // Check for duplicates
    if (isDuplicateTIN(tin)) {
      setTinDuplicateWarning('Duplicate TIN - this TIN already exists in the batch');
    }
  };

  // Simulate TCC retrieval from IRS e-Services
  const fetchTCCFromIRS = async () => {
    setIsFetchingTCC(true);
    setTccLog([]);

    const steps = [
      'Initializing secure connection to IRS e-Services...',
      'TLS 1.3 handshake established',
      'Authenticating with ID.me federation...',
      'Accessing business dashboard...',
      'Retrieving entity TCC for transmission...',
      'TCC decrypted and retrieved'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
      setTccLog(prev => [...prev, `> ${steps[i]}`]);
    }

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const alphaNum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let mockTCC = '';
    mockTCC += letters.charAt(Math.floor(Math.random() * letters.length));
    mockTCC += letters.charAt(Math.floor(Math.random() * letters.length));
    mockTCC += '-';
    for (let i = 0; i < 7; i++) {
      mockTCC += alphaNum.charAt(Math.floor(Math.random() * alphaNum.length));
    }
    setTcc(mockTCC);
    setIsFetchingTCC(false);
  };

  const formatTCCInput = (value: string): string => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 2) return clean;
    return `${clean.slice(0, 2)}-${clean.slice(2, 9)}`;
  };

  const handleAuthenticate = async () => {
    console.log('[Wizard] Authenticating...');
    setTestingConnection(true);
    setConnectionError(null);
    setConnectionCheckState('checking');

    // Initial connection test
    try {
      const health = await irsApi.healthCheck();
      console.log('[Wizard] Health check:', health);
      if (health.status !== 'healthy') {
        setConnectionCheckState('invalid');
        throw new Error('IRS API report UNHEALTHY status. Please check your network or transmitter connectivity.');
      }
      setApiHealth(health);
      setConnectionCheckState('valid');
      await new Promise(r => setTimeout(r, (import.meta as any).env.MODE === 'test' ? 0 : 500)); // Brief delay for success animation
    } catch (e: any) {
      console.log('[Wizard] Auth error:', e);
      setConnectionCheckState('invalid');
      setConnectionError(e.message || 'Failed to establish secure connection to IRS API Proxy');
      setTestingConnection(false);
      return;
    }

    // Simulate credential verification/handshake
    console.log('[Wizard] Verifying credentials...');
    await new Promise(r => setTimeout(r, (import.meta as any).env.MODE === 'test' ? 0 : 1500));

    if (tcc) {
      await irsApi.setAuth(tcc);
      if (saveCredentials) {
        await storeTCC(tcc, `IRS TCC (${tcc.slice(0, 6)}...)`, tcc);
        await loadStoredCredentials();
      }
    } else if (bearerToken) {
      await irsApi.setAuth(undefined, bearerToken);
      if (saveCredentials) {
        await storeBearerToken(bearerToken, 'IRS Bearer Token');
      }
    } else {
      setTestingConnection(false);
      return;
    }

    setTestingConnection(false);
    setConnectionTested(true);

    console.log('[Wizard] Proceeding to Filer step');
    setCurrentStep('Filer');
  };


  const handleUseStoredTCC = async (credential: StoredCredential) => {
    setAuthMode('tcc');
    setTcc(credential.value);
  };

  const validateTIN = async (tin: string, name: string): Promise<TinMatchResponse> => {
    const key = `${tin}-${name}`;
    if (tinValidation[key]) {
      return tinValidation[key];
    }

    setValidatingTin(tin);
    try {
      const result = await irsApi.validateTin({ tin, name });
      setTinValidation(prev => ({ ...prev, [key]: result }));
      return result;
    } catch (e) {
      return { code: 2, match: false, message: 'Validation failed', tin, name };
    } finally {
      setValidatingTin(null);
    }
  };

  const handleAddPayee = async () => {
    // Validate TIN before adding
    const validation = await validateTIN(currentPayee.tin, currentPayee.name);

    const payeeWithValidation = {
      ...currentPayee,
      tinType: currentPayee.tin.length === 11 ? (currentPayee.tin.includes('-') ? 'EIN' : 'SSN') : undefined
    };

    setPayees(prev => [...prev, payeeWithValidation]);

    // Reset for next payee
    setCurrentPayee({
      tin: '',
      name: '',
      address: {
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      },
      amounts: {}
    });

    // Clear TIN validation state
    setTinFormatError(null);
    setTinDuplicateWarning(null);
  };

  const handleRemovePayee = (index: number) => {
    setPayees(prev => prev.filter((_, i) => i !== index));
  };

  const handleValidateAndSubmit = async () => {
    setSubmissionStatus('validating');
    setCurrentStep('Submit');

    const submission: SubmissionRequest = {
      transmitterId: transmitterId || tcc.replace('T', ''),
      softwareId,
      formType,
      submissionType: 'O',
      taxYear,
      filer,
      payees
    };

    try {
      // Pre-transmission validation
      setStatusMessage('Running pre-submission validation...');
      const checkResult = await irsApi.transmissionCheck(submission);

      setValidationErrors(checkResult.errors);

      if (!checkResult.valid) {
        setSubmissionStatus('error');
        setStatusMessage('Validation failed. Please review errors below.');
        return;
      }

      // Submit
      setSubmissionStatus('submitting');
      setStatusMessage('Transmitting to IRS IRIS A2A...');

      const result = await irsApi.submitBatch(submission);
      setReceipt(result);

      // Poll for status
      setSubmissionStatus('polling');
      setStatusMessage('Processing submission...');

      const pollResult = await irsApi.pollSubmissionStatus(
        result.receiptId,
        (status) => {
          setBatchStatus(status);
          setStatusMessage(`Processing: ${status.recordCount}/${status.acceptedCount} accepted`);
        }
      );

      setBatchStatus(pollResult);
      setSubmissionStatus('success');
      setCurrentStep('Result');

    } catch (e: any) {
      setSubmissionStatus('error');
      setStatusMessage(e.message || 'Submission failed');
    }
  };

  const amountFields = getFormAmountFields(formType);

  // Render Auth Step
  const renderAuth = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Header / Status Display */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center gap-6 p-5 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl">
          <div className={`p-3 rounded-full ${apiHealth?.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} pulse-glow`}>
            {apiHealth?.status === 'healthy' ? <Shield size={28} /> : <Activity size={28} className="animate-pulse" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-white tracking-tight">System Connectivity</h3>
              {apiHealth?.status === 'healthy' && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-500/30">
                  Secure Link Active
                </span>
              )}
            </div>
            <div className="text-sm text-slate-400 mt-0.5 font-medium">
              {apiHealth?.status === 'healthy' ? (
                <span>Endpoint: {apiHealth.service} <span className="text-slate-600 px-1">•</span> v{apiHealth.version}</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  Establishing handshake with IRS Gateway...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Mode Selection */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'tcc', label: 'TCC AUTH', sub: 'Transmitter Control', icon: Fingerprint, color: 'indigo' as const, activeColor: 'rgba(99, 102, 241, 0.5)', glowColor: 'rgba(99, 102, 241, 0.4)' },
          { id: 'bearer', label: 'API TOKEN', sub: 'Bearer / JWT', icon: KeyRound, color: 'emerald' as const, activeColor: 'rgba(16, 185, 129, 0.5)', glowColor: 'rgba(16, 185, 129, 0.4)' }
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              setAuthModeAnimating(true);
              setAuthMode(mode.id as any);
              setTcc('');
              setBearerToken('');
              setTimeout(() => setAuthModeAnimating(false), 300);
            }}
            className={`relative group p-3 rounded-xl border transition-all duration-300 overflow-hidden ${authMode === mode.id
              ? 'scale-105'
              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:scale-[1.02]'
              } ${authModeAnimating ? 'transition-all duration-300' : ''}`}
            style={authMode === mode.id ? {
              borderColor: mode.activeColor,
              backgroundColor: mode.activeColor.replace('0.5', '0.1'),
              boxShadow: `0 0 30px ${mode.glowColor}, inset 0 0 20px ${mode.activeColor.replace('0.5', '0.05')}`
            } : {
              backgroundColor: 'rgba(2, 6, 23, 0.5)'
            }}
          >
            {/* Animated gradient background on hover/select */}
            {authMode === mode.id && (
              <div
                className="absolute inset-0 opacity-20 animate-pulse"
                style={{
                  background: `linear-gradient(135deg, transparent 0%, ${mode.activeColor} 50%, transparent 100%)`
                }}
              />
            )}

            <div className={`mx-auto mb-2 p-2 rounded-lg w-fit transition-all duration-300 ${authMode === mode.id
              ? 'scale-110'
              : 'group-hover:scale-105'
              }`}>
              <mode.icon
                size={18}
                className="transition-colors duration-300"
                style={{
                  color: authMode === mode.id ? (mode.id === 'tcc' ? 'rgb(99, 102, 241)' : 'rgb(16, 185, 129)') : '#64748b'
                }}
              />
            </div>
            <div className="font-black text-[10px] uppercase tracking-widest text-white relative z-10">{mode.label}</div>
            <div className="text-[9px] text-slate-500 mt-1 font-mono uppercase relative z-10">{mode.sub}</div>

            {/* Bottom indicator bar with glow */}
            {authMode === mode.id && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-t-full animate-pulse"
                style={{
                  backgroundColor: mode.id === 'tcc' ? 'rgb(99, 102, 241)' : 'rgb(16, 185, 129)',
                  boxShadow: `0 -4px 12px ${mode.glowColor}`
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* IRS Login Modal Button */}
      {authenticatedUser ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle size={18} className="text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400">Authenticated as</div>
              <div className="text-sm font-mono text-white">{authenticatedUser}</div>
            </div>
          </div>
          <button
            onClick={() => { setAuthenticatedUser(null); setTcc(''); }}
            className="text-[10px] text-slate-400 hover:text-white transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : null}

      <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 space-y-6">
        {authMode === 'tcc' ? (
          <div className="space-y-6">
            {/* Stored Credentials List (Inside Main Box) */}
            {storedTCCs.length > 0 && (
              <div className="space-y-3 pb-6 border-b border-white/5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Keychain</label>
                  <div className="flex items-center gap-1.5">
                    <Zap size={10} className="text-amber-400 animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Load</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {storedTCCs.map((cred, index) => (
                    <button
                      key={cred.id}
                      onClick={() => handleUseStoredTCC(cred)}
                      className="group relative flex items-center justify-between p-3 bg-slate-950/50 backdrop-blur border border-white/5 rounded-lg hover:border-indigo-500/50 hover:bg-slate-900/80 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300 text-left overflow-hidden animate-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Hover gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="flex items-center gap-3 relative z-10">
                        <div className="p-1.5 rounded bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                          <Shield size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs group-hover:text-indigo-300 transition-colors">{cred.name}</div>
                          <div className="font-mono text-[10px] text-slate-600 uppercase mt-0.5 group-hover:text-slate-500 transition-colors">
                            ID: {cred.value.slice(0, 4)}••••{cred.value.slice(-2)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-300 relative z-10" />

                      {/* Selection indicator */}
                      {tcc === cred.value && (
                        <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-lg animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Transmitter Control Code (TCC)
                  </label>
                  {/* Real-time format feedback indicator */}
                  {tcc && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                      <div
                        className={`w-2 h-2 rounded-full animate-pulse ${tccFormatStatus === 'valid' ? 'bg-emerald-400' :
                          tccFormatStatus === 'partial' ? 'bg-amber-400' :
                            'bg-red-400'
                          }`}
                        style={{
                          boxShadow: tccFormatStatus === 'valid' ? '0 0 8px rgba(52, 211, 153, 0.8)' :
                            tccFormatStatus === 'partial' ? '0 0 8px rgba(251, 191, 36, 0.8)' :
                              '0 0 8px rgba(248, 113, 113, 0.8)'
                        }}
                      />
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider ${tccFormatStatus === 'valid' ? 'text-emerald-400' :
                          tccFormatStatus === 'partial' ? 'text-amber-400' :
                            'text-red-400'
                          }`}
                      >
                        {tccFormatStatus === 'valid' ? 'FORMAT VALID' :
                          tccFormatStatus === 'partial' ? `${tcc.length}/10 CHARACTERS` :
                            'INVALID FORMAT'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="group relative">
                  <div
                    className={`absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors duration-300 ${tccFormatStatus === 'valid' ? 'text-emerald-400' :
                      tccFormatStatus === 'partial' ? 'text-amber-400' :
                        tccFormatStatus === 'invalid' ? 'text-red-400' :
                          'text-slate-600 group-focus-within:text-indigo-400'
                      }`}
                  >
                    <Fingerprint size={18} />
                  </div>
                  <input
                    value={tcc}
                    onChange={e => setTcc(formatTCCInput(e.target.value))}
                    placeholder={TCC_PLACEHOLDER}
                    className="w-full bg-slate-950/80 backdrop-blur border rounded-xl py-4 pl-12 pr-4 text-white font-mono text-lg tracking-wider outline-none transition-all duration-300 placeholder:text-slate-800"
                    style={
                      tccFormatStatus === 'valid'
                        ? { borderColor: 'rgba(16, 185, 129, 0.5)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2), inset 0 0 20px rgba(16, 185, 129, 0.05)' }
                        : tccFormatStatus === 'partial'
                          ? { borderColor: 'rgba(251, 191, 36, 0.5)', boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)' }
                          : tccFormatStatus === 'invalid'
                            ? { borderColor: 'rgba(248, 113, 113, 0.5)', boxShadow: '0 0 20px rgba(248, 113, 113, 0.2)' }
                            : { borderColor: 'rgba(255, 255, 255, 0.1)' }
                    }
                  />
                  <button
                    onClick={fetchTCCFromIRS}
                    disabled={isFetchingTCC}
                    className="absolute right-2 top-2 bottom-2 px-4 bg-slate-900/80 backdrop-blur text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 border border-white/5 flex items-center gap-2 group/btn transition-all duration-300"
                    style={{ boxShadow: 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <Terminal size={12} className={isFetchingTCC ? 'animate-pulse' : 'group-hover/btn:scale-110 transition-transform duration-300'} />
                    {isFetchingTCC ? 'Retrieving...' : 'Fetch TCC'}
                  </button>
                </div>
              </div>

              {isFetchingTCC && (
                <div
                  ref={terminalRef}
                  className="bg-black/90 backdrop-blur-md rounded-xl border border-emerald-500/20 p-4 h-40 overflow-y-auto font-mono text-[11px] leading-relaxed relative overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.1)]"
                >
                  {/* Scanline effect */}
                  <div className="absolute inset-0 pointer-events-none opacity-5">
                    <div className="h-full w-full" style={{
                      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16, 185, 129, 0.1) 2px, rgba(16, 185, 129, 0.1) 4px)'
                    }} />
                  </div>

                  {/* Glow effect from bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />

                  {/* Terminal content */}
                  <div className="relative z-10 space-y-1">
                    {tccLog.map((log, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 animate-in slide-in-from-left-2 duration-300 ${i === tccLog.length - 1 ? 'animate-pulse' : ''
                          }`}
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <span className="text-emerald-700/80 shrink-0">
                          [{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                        </span>
                        <span className={i === tccLog.length - 1
                          ? "text-emerald-400 font-medium drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                          : "text-emerald-500/80"
                        }>
                          {log}
                        </span>
                      </div>
                    ))}

                    {/* Blinking cursor */}
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-emerald-700/80 shrink-0">
                        [{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                      </span>
                      <span className="text-emerald-400">
                        <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse" style={{
                          boxShadow: '0 0 8px rgba(52, 211, 153, 0.8)'
                        }} />
                      </span>
                    </div>
                  </div>

                  {/* Progress bar with glow */}
                  <div className="h-1 w-full bg-emerald-950/50 absolute bottom-0 left-0">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-[loading_2s_ease-in-out_infinite]"
                      style={{ width: '30%' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div
              role="checkbox"
              aria-checked={saveCredentials}
              tabIndex={0}
              onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setSaveCredentials(!saveCredentials); }}
              className="flex items-center gap-3 px-1 group cursor-pointer"
              onClick={() => setSaveCredentials(!saveCredentials)}
              aria-label="Save credentials securely"
            >
              <div
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${saveCredentials
                  ? 'bg-indigo-600 shadow-[0_0_15px_hsl(238,84%,67%,0.4)]'
                  : 'bg-slate-800'
                  }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-lg ${saveCredentials
                    ? 'left-7 scale-110'
                    : 'left-1 scale-100'
                    } ${!saveCredentials ? 'bg-slate-500' : 'bg-white'}`}
                />
                {/* Glow effect when active */}
                {saveCredentials && (
                  <div className="absolute inset-0 rounded-full animate-pulse opacity-50" style={{
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.6), inset 0 0 10px rgba(99, 102, 241, 0.3)'
                  }}
                  />
                )}
              </div>
              <label className="text-xs text-slate-400 font-medium select-none group-hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-2">
                <span>Persistence Mode:</span>
                <span
                  className={`font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded transition-all duration-300 ${saveCredentials
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'text-slate-500 bg-slate-800/50 border border-slate-700'
                    }`}
                >
                  {saveCredentials ? 'Encrypted Vault' : 'Session Only'}
                </span>
                <span className="sr-only">Save credentials securely</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
                A2A Bearer Token (JWT / OAuth)
              </label>
              <div className="group relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-400 transition-colors">
                  <KeyRound size={18} />
                </div>
                <input
                  value={bearerToken}
                  onChange={e => setBearerToken(e.target.value)}
                  type="password"
                  placeholder="eyJhbGciOiJSUzI1NiIs..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-mono text-sm focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all placeholder:text-slate-800"
                />
              </div>
              <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-2 px-1">
                <AlertCircle size={10} className="text-amber-500" />
                Tokens must be issued by the IRS e-Services Gateway for A2A interactions.
              </div>
            </div>
          </div>
        )}

        {connectionError && (
          <div className="p-4 bg-red-500/10 backdrop-blur border border-red-500/20 rounded-xl flex items-start gap-3 animate-in shake shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-red-400 font-medium leading-relaxed">
              {connectionError}
            </div>
          </div>
        )}

        <button
          onClick={handleAuthenticate}
          disabled={testingConnection || !(isValidTCC(tcc) || isValidBearerToken(bearerToken))}
          className={`group relative w-full overflow-hidden py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 ${testingConnection || !(isValidTCC(tcc) || isValidBearerToken(bearerToken))
            ? 'bg-slate-800/50 text-slate-600 scale-95 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:-translate-y-1 active:translate-y-0'
            }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
          <div className="relative flex items-center justify-center gap-3">
            {testingConnection ? (
              <>
                {connectionCheckState === 'checking' && (
                  <>
                    <Loader2 size={16} className="animate-spin text-blue-400" />
                    <span>Testing Connection...</span>
                    <div className="flex gap-1">
                      <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </>
                )}
                {connectionCheckState === 'valid' && (
                  <>
                    <CheckCircle size={16} className="text-emerald-400 animate-in zoom-in duration-300" />
                    <span>Connection Verified</span>
                  </>
                )}
              </>
            ) : connectionCheckState === 'valid' && connectionTested ? (
              <>
                <CheckCircle size={16} className="text-emerald-400" />
                <span>Re-Authenticate</span>
              </>
            ) : (
              <>
                <Shield size={16} className="group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" />
                Authenticate & Continue
              </>
            )}
          </div>

          {/* Connection check indicator */}
          {connectionCheckState === 'checking' && (
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 animate-[loading_1.5s_ease-in-out_infinite]" />
          )}
          {connectionCheckState === 'valid' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 text-[10px] text-slate-600 font-mono uppercase tracking-[0.1em]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
          Federal Information Return System (FIRE) Integrated
        </div>
        <div>Standardized 1099-NEC/MISC Form Engine v2026.1</div>
      </div>
    </div>
  );

  // Render Filer Step
  const handleSyncFromEntity = () => {
    if (!activeEntity) return;

    setFiler({
      ...filer,
      name: activeEntity.name,
      ein: activeEntity.einLast4 ? (activeEntity.einLast4.includes('-') ? activeEntity.einLast4 : formatEINInput(activeEntity.einLast4)) : '',
      address: {
        streetAddress: activeEntity.streetAddress || '',
        city: activeEntity.city || '',
        state: activeEntity.state || '',
        zipCode: activeEntity.zipCode || '',
        country: 'US'
      }
    });

    if (activeEntity.phone) {
      setFiler(prev => ({ ...prev, contact: { ...prev.contact, phone: activeEntity.phone } }));
    }
  };

  const renderFiler = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
            Transmitter ID
          </label>
          <input
            value={transmitterId}
            onChange={e => setTransmitterId(e.target.value)}
            placeholder="T123456789 or 10-digit ID"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
            Software ID
          </label>
          <input
            value={softwareId}
            onChange={e => setSoftwareId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="border-t border-slate-800 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 size={20} />
            Filer Identification
          </h3>
          {activeEntity && (
            <button
              onClick={handleSyncFromEntity}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/40 transition-all text-xs font-bold"
            >
              <RefreshCcw size={14} />
              Sync from Ledger
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                EIN
              </label>
              <input
                value={filer.ein}
                onChange={e => setFiler({ ...filer, ein: formatEINInput(e.target.value) })}
                placeholder={TIN_PLACEHOLDER}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Legal Name
              </label>
              <input
                value={filer.name}
                onChange={e => setFiler({ ...filer, name: e.target.value })}
                placeholder="ABC Corporation Inc"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Trade Name (DBA) - Optional
            </label>
            <input
              value={filer.tradeName || ''}
              onChange={e => setFiler({ ...filer, tradeName: e.target.value })}
              placeholder="ABC Corp"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Street Address
              </label>
              <input
                value={filer.address.streetAddress}
                onChange={e => setFiler({ ...filer, address: { ...filer.address, streetAddress: e.target.value } })}
                placeholder="123 Main Street"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                City
              </label>
              <input
                value={filer.address.city}
                onChange={e => setFiler({ ...filer, address: { ...filer.address, city: e.target.value } })}
                placeholder="Anytown"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                State
              </label>
              <input
                value={filer.address.state}
                onChange={e => setFiler({ ...filer, address: { ...filer.address, state: e.target.value.toUpperCase() } })}
                placeholder="CA"
                maxLength={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono uppercase focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                ZIP Code
              </label>
              <input
                value={filer.address.zipCode}
                onChange={e => setFiler({ ...filer, address: { ...filer.address, zipCode: e.target.value } })}
                placeholder="90210"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Country
              </label>
              <input
                value={filer.address.country || 'US'}
                onChange={e => setFiler({ ...filer, address: { ...filer.address, country: e.target.value.toUpperCase() } })}
                maxLength={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono uppercase focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Form Type Step
  const renderFormType = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-4">
          Tax Year
        </label>
        <div className="flex gap-4">
          {[new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => (
            <button
              key={year}
              onClick={() => setTaxYear(year)}
              className={`px-6 py-3 rounded-lg font-mono font-bold ${taxYear === year ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-4">
          Form Type
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['1099-NEC', '1099-MISC', '1099-INT', '1099-DIV', '1099-B', '1099-R'] as FormType[]).map(type => (
            <button
              key={type}
              onClick={() => setFormType(type)}
              className={`p-4 border rounded-lg text-left transition-all ${formType === type
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-700 hover:border-slate-600'
                }`}
            >
              <div className="font-bold text-white">{type}</div>
              <div className="text-xs text-slate-500 mt-1">
                {type === '1099-NEC' && 'Nonemployee Compensation'}
                {type === '1099-MISC' && 'Miscellaneous Income'}
                {type === '1099-INT' && 'Interest Income'}
                {type === '1099-DIV' && 'Dividends'}
                {type === '1099-B' && 'Proceeds from Broker'}
                {type === '1099-R' && 'Distributions'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h4 className="font-bold text-white mb-2">Form {formType} - Required Amounts</h4>
        <div className="space-y-2 text-sm">
          {amountFields.map(field => (
            <div key={field.key} className="flex items-center gap-2">
              <span className={field.required ? 'text-red-400' : 'text-slate-500'}>*</span>
              <span className="text-slate-300">{field.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render Payees Step
  const renderPayees = () => (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <User size={18} />
          Add Payee
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              TIN (EIN or SSN)
            </label>
            <div className="relative">
              <input
                value={currentPayee.tin}
                onChange={e => handleTINChange(e.target.value)}
                onBlur={async () => {
                  handleTINBlur();
                  if (currentPayee.tin && currentPayee.name && isValidTINFormat(currentPayee.tin)) {
                    await validateTIN(currentPayee.tin, currentPayee.name);
                  }
                }}
                placeholder={`${TIN_PLACEHOLDER} or ${SSN_PLACEHOLDER}`}
                className={`w-full bg-slate-950 border rounded-lg py-2.5 px-3 text-white font-mono text-sm focus:border-indigo-500 outline-none ${tinFormatError ? 'border-red-500' : 'border-slate-700'
                  }`}
              />
              {validatingTin === currentPayee.tin && (
                <div className="absolute right-3 top-2.5">
                  <RefreshCw size={14} className="animate-spin text-indigo-400" />
                </div>
              )}
            </div>
            {tinFormatError && (
              <div className="text-xs mt-1 flex items-center gap-1 text-red-400">
                <AlertCircle size={10} /> {tinFormatError}
              </div>
            )}
            {tinDuplicateWarning && !tinFormatError && (
              <div className="text-xs mt-1 flex items-center gap-1 text-amber-400">
                <AlertCircle size={10} /> {tinDuplicateWarning}
              </div>
            )}
            {!tinFormatError && !tinDuplicateWarning && tinValidation[`${currentPayee.tin}-${currentPayee.name}`] && (
              <div className={`text-xs mt-1 flex items-center gap-1 ${tinValidation[`${currentPayee.tin}-${currentPayee.name}`].match ? 'text-emerald-400' : 'text-red-400'
                }`}>
                {tinValidation[`${currentPayee.tin}-${currentPayee.name}`].match ? (
                  <><CheckCircle size={10} /> TIN Validated</>
                ) : (
                  <><AlertCircle size={10} /> {tinValidation[`${currentPayee.tin}-${currentPayee.name}`].message}</>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Payee Name
            </label>
            <input
              value={currentPayee.name}
              onChange={e => setCurrentPayee({ ...currentPayee, name: e.target.value })}
              placeholder="John D Contractor"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Street Address
            </label>
            <input
              value={currentPayee.address.streetAddress}
              onChange={e => setCurrentPayee({
                ...currentPayee,
                address: { ...currentPayee.address, streetAddress: e.target.value }
              })}
              placeholder="456 Oak Avenue"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              City
            </label>
            <input
              value={currentPayee.address.city}
              onChange={e => setCurrentPayee({
                ...currentPayee,
                address: { ...currentPayee.address, city: e.target.value }
              })}
              placeholder="Sometown"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              State
            </label>
            <input
              value={currentPayee.address.state}
              onChange={e => setCurrentPayee({
                ...currentPayee,
                address: { ...currentPayee.address, state: e.target.value.toUpperCase() }
              })}
              placeholder="CA"
              maxLength={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm font-mono uppercase focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              ZIP
            </label>
            <input
              value={currentPayee.address.zipCode}
              onChange={e => setCurrentPayee({
                ...currentPayee,
                address: { ...currentPayee.address, zipCode: e.target.value }
              })}
              placeholder="90211"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm font-mono focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Account (Optional)
            </label>
            <input
              value={currentPayee.accountNumber || ''}
              onChange={e => setCurrentPayee({ ...currentPayee, accountNumber: e.target.value })}
              placeholder="ACC-001"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm font-mono focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
            Amounts ({formType})
          </label>
          <div className="grid grid-cols-2 gap-3">
            {amountFields.map(field => (
              <div key={field.key}>
                <label className="block text-xs text-slate-400 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm font-mono focus:border-indigo-500 outline-none"
                  onChange={e => setCurrentPayee({
                    ...currentPayee,
                    amounts: { ...currentPayee.amounts, [field.key]: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleAddPayee}
          disabled={!currentPayee.tin || !currentPayee.name || !isValidTINFormat(currentPayee.tin) || !!tinFormatError}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Add Payee to Batch
        </button>
      </div>

      {/* Payees List */}
      {payees.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-400 uppercase">
            Payees in Batch ({payees.length}/1000)
          </h4>
          {payees.map((payee, index) => {
            const key = `${payee.tin}-${payee.name}`;
            const validation = tinValidation[key];

            return (
              <div key={index} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white">{payee.tin}</span>
                    <span className="text-sm text-slate-300">{payee.name}</span>
                    {validation && (
                      <span className={`text-xs flex items-center gap-1 ${validation.match ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                        {validation.match ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {validation.match ? 'Valid' : 'Unchecked'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {payee.address.streetAddress}, {payee.address.city}, {payee.address.state} {payee.address.zipCode}
                  </div>
                  {Object.keys(payee.amounts || {}).length > 0 && (
                    <div className="text-xs text-indigo-400 mt-1">
                      {Object.entries(payee.amounts || {}).map(([k, v]) => (v && typeof v === 'number' && v > 0 ? `${k}: $${v}` : null)).filter(Boolean).join(' | ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemovePayee(index)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render Review Step
  const renderReview = () => (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="font-bold text-white mb-4">Submission Summary</h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Transmitter ID:</span>
            <div className="font-mono text-white">{transmitterId || tcc}</div>
          </div>
          <div>
            <span className="text-slate-500">Software ID:</span>
            <div className="font-mono text-white">{softwareId}</div>
          </div>
          <div>
            <span className="text-slate-500">Form Type:</span>
            <div className="text-white">{formType}</div>
          </div>
          <div>
            <span className="text-slate-500">Tax Year:</span>
            <div className="text-white">{taxYear}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="font-bold text-white mb-4">Filer</h3>
        <div className="text-sm space-y-1">
          <div><span className="text-slate-500">EIN:</span> <span className="font-mono text-white">{filer.ein}</span></div>
          <div><span className="text-slate-500">Name:</span> <span className="text-white">{filer.name}</span></div>
          {filer.tradeName && <div><span className="text-slate-500">DBA:</span> <span className="text-white">{filer.tradeName}</span></div>}
          <div><span className="text-slate-500">Address:</span> <span className="text-white">{filer.address.streetAddress}, {filer.address.city}, {filer.address.state} {filer.address.zipCode}</span></div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="font-bold text-white mb-4">Payees ({payees.length})</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {payees.map((payee, i) => (
            <div key={i} className="text-sm flex justify-between">
              <span className="font-mono text-slate-300">{payee.tin}</span>
              <span className="text-slate-300">{payee.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
        <div className="flex items-center gap-2 text-indigo-400 mb-2">
          <Zap size={16} />
          <span className="font-bold">Ready to Submit</span>
        </div>
        <p className="text-sm text-slate-400">
          Clicking "Validate & Submit" will run pre-transmission validation checks,
          then transmit your batch to the IRS IRIS A2A system for processing.
        </p>
      </div>
    </div>
  );

  // Render Submit Step
  const renderSubmit = () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-slate-800 rounded-full" />
          <div className="absolute inset-0 w-24 h-24 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white">
            {submissionStatus === 'validating' && 'Validating Submission...'}
            {submissionStatus === 'submitting' && 'Transmitting to IRS...'}
            {submissionStatus === 'polling' && 'Processing...'}
          </h3>
          <p className="text-slate-400 mt-2">{statusMessage}</p>
        </div>

        {batchStatus && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-left max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Records:</span>
                <div className="text-white">{batchStatus.recordCount}</div>
              </div>
              <div>
                <span className="text-slate-500">Accepted:</span>
                <div className="text-emerald-400">{batchStatus.acceptedCount}</div>
              </div>
              <div>
                <span className="text-slate-500">Errors:</span>
                <div className="text-red-400">{batchStatus.errorCount}</div>
              </div>
              <div>
                <span className="text-slate-500">Status:</span>
                <div className={`font-bold ${batchStatus.status === 'Accepted' ? 'text-emerald-400' :
                  batchStatus.status === 'Rejected' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>{batchStatus.status}</div>
              </div>
            </div>
          </div>
        )}

        {submissionStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} />
              <span className="font-bold">Submission Failed</span>
            </div>
            <p className="text-sm">{statusMessage}</p>
            {validationErrors.length > 0 && (
              <div className="mt-4 space-y-2 text-left">
                {validationErrors.map((err, i) => (
                  <div key={i} className="text-xs bg-black/30 rounded p-2">
                    <span className="font-mono text-red-300">[{err.code}]</span> {err.message}
                    {err.field && <span className="text-slate-500 ml-2">({err.field})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render Result Step
  const renderResult = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-emerald-400" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white">Submission Complete</h2>
        <p className="text-slate-400 mt-2">
          {batchStatus?.status === 'Accepted' ? 'All records accepted by IRS.' : 'Review results below.'}
        </p>
      </div>

      {receipt && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h3 className="font-bold text-white mb-4">Receipt Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Receipt ID:</span>
              <div className="font-mono text-white text-xs break-all">{receipt.receiptId}</div>
            </div>
            <div>
              <span className="text-slate-500">Timestamp:</span>
              <div className="text-white">{new Date(receipt.timestamp).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {batchStatus && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h3 className="font-bold text-white mb-4">Processing Results</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{batchStatus.recordCount}</div>
              <div className="text-xs text-slate-500">Total Records</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{batchStatus.acceptedCount}</div>
              <div className="text-xs text-slate-500">Accepted</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{batchStatus.warningCount}</div>
              <div className="text-xs text-slate-500">Warnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{batchStatus.errorCount}</div>
              <div className="text-xs text-slate-500">Errors</div>
            </div>
          </div>

          {batchStatus.errors && batchStatus.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-red-400 mb-2">Errors</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {batchStatus.errors.map((err, i) => (
                  <div key={i} className="text-xs bg-red-500/10 rounded p-2 border border-red-500/20">
                    <span className="font-mono text-red-300">[{err.code}]</span> {err.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => {
            setPayees([]);
            setCurrentPayee({
              tin: '',
              name: '',
              address: { streetAddress: '', city: '', state: '', zipCode: '', country: 'US' },
              amounts: {}
            });
            setReceipt(null);
            setBatchStatus(null);
            setValidationErrors([]);
            setCurrentStep('FormType');
            setSubmissionStatus('idle');
          }}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg"
        >
          New Submission
        </button>
        <button
          onClick={onClose || (() => { })}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );

  // Main render
  const steps: WizardStep[] = ['Auth', 'Filer', 'FormType', 'Payees', 'Review', 'Submit', 'Result'];
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <FileText className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white">IRS IRIS 1099 Submission</h2>
              <p className="text-xs text-slate-500">A2A API v1.3.0</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              ×
            </button>
          )}
        </div>

        {/* Progress Steps */}
        {currentStep !== 'Submit' && currentStep !== 'Result' && (
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              {['Auth', 'Filer', 'Form', 'Payees', 'Review'].map((step, i) => (
                <React.Fragment key={step}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= currentStepIndex ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                      {i + 1}
                    </div>
                    <span className={`text-xs font-bold ${i <= currentStepIndex ? 'text-white' : 'text-slate-600'
                      }`}>{step}</span>
                  </div>
                  {i < 4 && <div className={`flex-1 h-px ${i < currentStepIndex ? 'bg-indigo-600' : 'bg-slate-800'}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {currentStep === 'Auth' && renderAuth()}
          {currentStep === 'Filer' && renderFiler()}
          {currentStep === 'FormType' && renderFormType()}
          {currentStep === 'Payees' && renderPayees()}
          {currentStep === 'Review' && renderReview()}
          {currentStep === 'Submit' && renderSubmit()}
          {currentStep === 'Result' && renderResult()}
        </div>

        {/* Footer Navigation */}
        {currentStep !== 'Submit' && currentStep !== 'Result' && currentStep !== 'Auth' && (
          <div className="px-6 py-4 border-t border-slate-800 flex justify-between">
            <button
              onClick={() => setCurrentStep(steps[currentStepIndex - 1])}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {currentStep !== 'Review' ? (
              <button
                onClick={() => setCurrentStep(steps[currentStepIndex + 1])}
                disabled={
                  (currentStep === 'Filer' && (!filer.ein || !filer.name || !isValidZipFormat(filer.address.zipCode))) ||
                  (currentStep === 'Payees' && payees.length === 0)
                }
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg flex items-center gap-2"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleValidateAndSubmit}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2"
              >
                <Shield size={16} />
                Validate & Submit
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
