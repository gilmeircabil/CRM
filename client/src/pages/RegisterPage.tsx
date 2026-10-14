import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Lock,
  Mail,
  User,
  Key,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [requiresKey, setRequiresKey] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { registerAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest<{
      isInitialSetup: boolean;
      isRegistrationOpen: boolean;
      requiresAdminKey: boolean;
    }>('/api/auth/registration-status')
      .then((data) => {
        setRequiresKey(data.requiresAdminKey);
        setIsRegistrationOpen(data.isRegistrationOpen);
        setIsInitialSetup(data.isInitialSetup);
      })
      .catch(() => {
        // Fallback default
      })
      .finally(() => {
        setIsLoadingStatus(false);
      });
  }, []);

  // Real-time password strength validation
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Anti-bot honeypot check
    if (honeypot) {
      setError('Registration request rejected.');
      return;
    }

    if (!isRegistrationOpen) {
      setError(
        'Public administrator registration is closed. Please ask an existing administrator to invite you.'
      );
      return;
    }

    if (!isPasswordValid) {
      setError('Please satisfy all password complexity requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (requiresKey && !adminKey.trim()) {
      setError('Admin Registration Key is required by server configuration.');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerAdmin(name, email, password, adminKey.trim() || undefined);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-200 mb-4">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Create Administrator Account
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isInitialSetup
            ? 'Initial Setup: Register the primary administrator'
            : 'Secure Administrator Registration'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          {/* Locked Registration Notice */}
          {!isLoadingStatus && !isRegistrationOpen && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-800 text-sm"
            >
              <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Public Registration Closed</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  An administrator account already exists. To register additional administrators, provide the Admin Registration Key or have an existing admin invite you.
                </p>
              </div>
            </div>
          )}

          {/* Initial Setup Mode Badge */}
          {isInitialSetup && (
            <div className="mb-5 p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center space-x-2.5 text-indigo-700 text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Initial Setup Mode: You are registering the root administrator.</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-sm animate-in fade-in"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Anti-bot honeypot field (hidden from real users) */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  required
                  disabled={!isRegistrationOpen}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Admin Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={!isRegistrationOpen}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourcompany.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={!isRegistrationOpen}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* Password Requirements Checklist */}
              {password.length > 0 && (
                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <p className="font-medium text-slate-600 mb-1.5">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-1">
                    <span className={`flex items-center space-x-1.5 ${hasLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {hasLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>8+ characters</span>
                    </span>
                    <span className={`flex items-center space-x-1.5 ${hasUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {hasUpper ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>Uppercase letter</span>
                    </span>
                    <span className={`flex items-center space-x-1.5 ${hasLower ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {hasLower ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>Lowercase letter</span>
                    </span>
                    <span className={`flex items-center space-x-1.5 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {hasNumber ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>Number (0-9)</span>
                    </span>
                    <span className={`flex items-center space-x-1.5 col-span-2 ${hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                      {hasSpecial ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>Special character (!@#$%^&*)</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={!isRegistrationOpen}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            {requiresKey && (
              <div>
                <label
                  htmlFor="register-admin-key"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Admin Registration Key <span className="text-indigo-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    id="register-admin-key"
                    name="adminKey"
                    type="password"
                    required={requiresKey}
                    disabled={!isRegistrationOpen}
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter environment registration key"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Configured via ADMIN_REGISTRATION_KEY in server environment.
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !isRegistrationOpen}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Registering...' : 'Register Administrator'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Legal & Accessibility Links */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-3">
          <Link to="/privacy" className="hover:text-indigo-600 transition-colors underline underline-offset-2">
            Privacy Policy
          </Link>
          <span className="text-slate-300">•</span>
          <Link to="/terms" className="hover:text-indigo-600 transition-colors underline underline-offset-2">
            Terms of Service
          </Link>
          <span className="text-slate-300">•</span>
          <Link to="/accessibility" className="hover:text-indigo-600 transition-colors underline underline-offset-2">
            Accessibility
          </Link>
        </div>
      </div>
    </div>
  );
};
