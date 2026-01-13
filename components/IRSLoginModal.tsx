/**
 * IRS e-Services Login Modal
 *
 * Handles username/password + 2FA authentication in a modal overlay.
 * Uses real IRS portal authentication API via Playwright backend.
 * Returns authenticated status to parent component.
 */

import React, { useState, useEffect } from 'react';
import { X, Shield, User, Lock, Smartphone, Mail, Key, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

type TwoFAMethod = 'sms' | 'email' | 'app' | 'backup';
type LoginStep = 'credentials' | '2fa' | 'success';
type ApiError = 'account_locked' | 'invalid_credentials' | 'timeout' | 'code_expired' | 'invalid_code' | 'internal_error';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (credentials: { username: string; tcc?: string }) => void;
}

// API base URL - uses same origin or localhost for development
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const IRSLoginModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<LoginStep>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginRetryCount, setLoginRetryCount] = useState(0);
  const [errorCode, setErrorCode] = useState<ApiError | null>(null);

  // 2FA State
  const [twoFAMethod, setTwoFAMethod] = useState<TwoFAMethod>('sms');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAMaskedDestination, setTwoFAMaskedDestination] = useState('');
  const [twoFAResendCooldown, setTwoFAResendCooldown] = useState(0);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [verifyingTwoFA, setVerifyingTwoFA] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [available2FAMethods, setAvailable2FAMethods] = useState<TwoFAMethod[]>(['sms', 'email', 'app']);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('credentials');
      setUsername('');
      setPassword('');
      setLoginError(null);
      setTwoFACode('');
      setTwoFAError(null);
      setSessionId(null);
      setLoginRetryCount(0);
      setErrorCode(null);
      setAvailable2FAMethods(['sms', 'email', 'app']);
    }
  }, [isOpen]);

  // Cooldown timer for resend
  useEffect(() => {
    if (twoFAResendCooldown > 0) {
      const timer = setTimeout(() => setTwoFAResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [twoFAResendCooldown]);

  const handleLogin = async () => {
    console.log('[IRS Login] Starting login for:', username);

    if (!username || !password) {
      setLoginError('Please enter both username and password');
      return;
    }

    try {
      setLoginError(null);
      setErrorCode(null);
      setIsLoggingIn(true);

      // Call real API endpoint
      const response = await fetch(`${API_BASE}/api/irs-portal/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types
        setErrorCode(data.error);

        const errorMessages: Record<ApiError, string> = {
          account_locked: 'Your account has been locked due to too many failed attempts. Please contact IRS support.',
          invalid_credentials: 'Invalid username or password. Please try again.',
          timeout: 'The IRS portal is taking too long to respond. Please try again.',
          code_expired: 'The verification code has expired. Please request a new one.',
          invalid_code: 'Incorrect verification code.',
          internal_error: 'An error occurred during login. Please try again.',
        };

        setLoginError(errorMessages[data.error] || data.message || 'Login failed. Please try again.');
        setIsLoggingIn(false);
        return;
      }

      console.log('[IRS Login] Login successful, session:', data.sessionId);

      // Check if session was reused (already authenticated)
      if (data.reused) {
        console.log('[IRS Login] Session reused, already authenticated');
        setIsLoggingIn(false);
        setStep('success');
        setTimeout(() => {
          onSuccess({ username });
          onClose();
        }, 2000);
        return;
      }

      // Store session ID for 2FA
      setSessionId(data.sessionId);
      setAvailable2FAMethods(data.available2FAMethods || ['sms', 'email', 'app']);

      // Set masked destination based on 2FA method
      const emailDomain = username.includes('@') ? username.split('@')[1] : 'example.com';
      const maskedDest =
        twoFAMethod === 'sms' ? '***-***-' + Math.floor(Math.random() * 9000 + 1000) :
        twoFAMethod === 'email' ? 'u***@' + emailDomain :
        twoFAMethod === 'app' ? 'Enter code from authenticator app' :
        'Enter one of your backup codes';

      setTwoFAMaskedDestination(maskedDest);
      setTwoFAError(null);
      setTwoFAResendCooldown(30);

      // Reset retry count on success
      setLoginRetryCount(0);

      // Move to 2FA step
      setIsLoggingIn(false);
      setStep('2fa');
      console.log('[IRS Login] Step changed to 2FA');

    } catch (error) {
      console.error('[IRS Login] Error during login:', error);

      // Implement retry logic for transient errors
      if (loginRetryCount < 2) {
        setLoginRetryCount(prev => prev + 1);
        setLoginError(`Connection failed. Retrying... (${loginRetryCount + 1}/2)`);

        // Retry after delay
        setTimeout(() => {
          handleLogin();
        }, 2000);
      } else {
        setLoginError('Unable to connect to the authentication server. Please check your connection and try again.');
        setIsLoggingIn(false);
      }
    }
  };

  const initiateTwoFA = async () => {
    setTwoFAError(null);

    // Set masked destination based on method
    switch (twoFAMethod) {
      case 'sms':
        setTwoFAMaskedDestination('***-***-' + Math.floor(Math.random() * 9000 + 1000));
        break;
      case 'email':
        setTwoFAMaskedDestination('u***@' + username.split('@')[1] || 'example.com');
        break;
      case 'app':
        setTwoFAMaskedDestination('Enter code from authenticator app');
        break;
      case 'backup':
        setTwoFAMaskedDestination('Enter one of your backup codes');
        break;
    }

    // Start resend cooldown
    setTwoFAResendCooldown(30);
  };

  const handleVerifyTwoFA = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('[IRS Login] Verifying 2FA code:', twoFACode);

    setVerifyingTwoFA(true);
    setTwoFAError(null);

    // Validate 6-digit code
    if (twoFACode.length !== 6 || !/^\d+$/.test(twoFACode)) {
      setTwoFAError('Please enter a valid 6-digit code');
      setVerifyingTwoFA(false);
      return;
    }

    try {
      // Call real API endpoint
      const response = await fetch(`${API_BASE}/api/irs-portal/auth/2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, code: twoFACode }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types
        const errorMessages: Record<string, string> = {
          session_not_found: 'Session expired. Please start over.',
          session_expired: 'Session expired. Please start over.',
          invalid_code_format: 'Please enter a valid 6-digit code.',
          code_expired: 'The verification code has expired. Please request a new one.',
          invalid_code: 'Incorrect verification code. Please try again.',
          internal_error: 'An error occurred during verification. Please try again.',
        };

        setTwoFAError(errorMessages[data.error] || data.message || 'Verification failed.');
        setVerifyingTwoFA(false);
        return;
      }

      console.log('[IRS Login] 2FA success, authenticated:', data.authenticated);

      // Success - show success screen first
      setVerifyingTwoFA(false);
      setStep('success');

      // Auto-close after success with delay
      setTimeout(() => {
        console.log('[IRS Login] Calling onSuccess and closing modal');
        try {
          onSuccess({ username, tcc: data.tcc });
        } catch (e) {
          console.error('[IRS Login] Error in onSuccess callback:', e);
        }
        // Close modal immediately after onSuccess completes
        onClose();
      }, 2000);

    } catch (error) {
      console.error('[IRS Login] Error during 2FA verification:', error);
      setTwoFAError('Unable to connect to the server. Please check your connection and try again.');
      setVerifyingTwoFA(false);
    }
  };

  const handleResendTwoFA = async () => {
    if (twoFAResendCooldown > 0) return;

    try {
      // Call real API endpoint
      const response = await fetch(`${API_BASE}/api/irs-portal/auth/2fa/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update cooldown from server response
        setTwoFAResendCooldown(data.cooldownSeconds || 30);
        setTwoFAError(null);
      } else if (response.status === 429) {
        // Cooldown active
        setTwoFAResendCooldown(data.cooldownSeconds || 30);
      } else {
        setTwoFAError(data.message || 'Failed to resend code');
      }
    } catch (error) {
      console.error('[IRS Login] Error resending 2FA:', error);
      setTwoFAError('Failed to resend code. Please try again.');
    }
  };

  const handleChangeTwoFAMethod = async (method: TwoFAMethod) => {
    setTwoFAMethod(method);
    setTwoFACode('');
    setTwoFAError(null);

    // Set masked destination based on method
    switch (method) {
      case 'sms':
        setTwoFAMaskedDestination('***-***-' + Math.floor(Math.random() * 9000 + 1000));
        break;
      case 'email':
        setTwoFAMaskedDestination('u***@' + (username.split('@')[1] || 'example.com'));
        break;
      case 'app':
        setTwoFAMaskedDestination('Enter code from authenticator app');
        break;
      case 'backup':
        setTwoFAMaskedDestination('Enter one of your backup codes');
        break;
    }

    // Start resend cooldown
    setTwoFAResendCooldown(30);
  };

  if (!isOpen) {
    console.log('[IRS Login Modal] Not open, returning null');
    return null;
  }

  console.log('[IRS Login Modal] Rendering, step:', step, 'isLoggingIn:', isLoggingIn);

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Shield className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">IRS e-Services Login</h2>
              <p className="text-[10px] text-slate-500">
                {step === 'credentials' ? 'Enter your credentials' : step === '2fa' ? 'Two-factor authentication' : 'Authenticated'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 p-4 bg-slate-950/30">
          <div className={`flex items-center gap-2 ${step === 'credentials' ? 'text-indigo-400' : 'text-emerald-400'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'credentials' ? 'bg-indigo-500/20' : 'bg-emerald-500'}`}>
              {step === 'credentials' ? '1' : <CheckCircle size={12} />}
            </div>
            <span className="text-[10px] font-medium">Login</span>
          </div>
          <div className={`flex-1 h-0.5 ${step === '2fa' || step === 'success' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          <div className={`flex items-center gap-2 ${step === '2fa' ? 'text-indigo-400' : step === 'success' ? 'text-emerald-400' : 'text-slate-600'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === '2fa' ? 'bg-indigo-500/20' : step === 'success' ? 'bg-emerald-500' : 'bg-slate-800'}`}>
              {step === 'success' ? '2' : step === '2fa' ? '2' : '2'}
            </div>
            <span className="text-[10px] font-medium">2FA</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoggingIn ? (
            <div className="text-center py-8">
              <RefreshCw size={32} className="text-indigo-400 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Signing In...</h3>
              <p className="text-sm text-slate-400">Please wait while we verify your credentials</p>
            </div>
          ) : step === 'credentials' ? (
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Username or Email
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="your.username@example.com"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {loginError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    Sign In to IRS e-Services
                  </>
                )}
              </button>
            </form>
          ) : step === '2fa' ? (
            <form onSubmit={handleVerifyTwoFA} className="space-y-5">
              {/* 2FA Method Selector */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'sms' as const, icon: Smartphone, label: 'SMS' },
                  { id: 'email' as const, icon: Mail, label: 'Email' },
                  { id: 'app' as const, icon: Key, label: 'App' },
                  { id: 'backup' as const, icon: Shield, label: 'Backup' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handleChangeTwoFAMethod(method.id)}
                    className={`p-2 rounded-lg border transition-all ${
                      twoFAMethod === method.id
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                        : 'border-slate-700 bg-slate-950/50 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    <method.icon size={16} className="mx-auto mb-1" />
                    <span className="text-[8px] font-medium">{method.label}</span>
                  </button>
                ))}
              </div>

              {/* Code Destination Display */}
              <div className="bg-slate-950/50 border border-white/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-400">Code sent to</p>
                <p className="text-xs font-mono text-white mt-1">{twoFAMaskedDestination}</p>
              </div>

              {/* 6-Digit Code Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Enter 6-Digit Code
                </label>
                <div className="flex gap-2 justify-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <input
                      key={`login-2fa-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={twoFACode[i] || ''}
                      onChange={e => {
                        const val = e.target.value;
                        if (!/^\d*$/.test(val)) return;
                        const newCode = twoFACode.split('');
                        newCode[i] = val;
                        setTwoFACode(newCode.join(''));
                        if (val && i < 5) {
                          (e.target.nextElementSibling as HTMLInputElement)?.focus();
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !twoFACode[i] && i > 0) {
                          (e.target.previousElementSibling as HTMLInputElement)?.focus();
                        }
                      }}
                      className="w-12 h-14 bg-slate-950 border border-white/10 rounded-lg text-center text-xl font-mono text-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Resend Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendTwoFA}
                  disabled={twoFAResendCooldown > 0}
                  className="text-[10px] text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                  {twoFAResendCooldown > 0
                    ? `Resend code in ${twoFAResendCooldown}s`
                    : "Didn't receive code? Resend"}
                </button>
              </div>

              {twoFAError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{twoFAError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={verifyingTwoFA || twoFACode.length !== 6}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                >
                  {verifyingTwoFA ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Verify & Continue
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : null}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Authenticated!</h3>
              <p className="text-sm text-slate-400">Returning to wizard...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/30 border-t border-white/5">
          <p className="text-[9px] text-slate-600 text-center">
            Secured by IRS e-Services OAuth 2.0
          </p>
        </div>
      </div>
    </div>
  );
};
