import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';

export const CookieNotice: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem('clientflow_cookie_acknowledged');
    if (!acknowledged) {
      setIsVisible(true);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem('clientflow_cookie_acknowledged', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex-1 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-900 mb-1">Essential Session Cookies</p>
          ClientFlow CRM uses strictly necessary session cookies to maintain your authenticated login
          state securely. No third-party tracking or advertising cookies are used. See our{' '}
          <Link to="/privacy" className="text-indigo-600 font-semibold hover:underline">
            Privacy Policy
          </Link>.
        </div>
        <button
          onClick={handleAcknowledge}
          className="text-slate-400 hover:text-slate-600 p-1 shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={handleAcknowledge}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
