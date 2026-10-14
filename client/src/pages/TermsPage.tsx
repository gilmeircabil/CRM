import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
            <p className="text-xs text-slate-400">Last updated: October 14, 2026</p>
          </div>
        </div>

        <div className="prose prose-sm prose-slate max-w-none space-y-6 text-xs text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">1. Agreement to Terms</h2>
            <p>
              By accessing or using ClientFlow CRM, you agree to be bound by these Terms of Service. If
              you are using this software on behalf of an organization, you represent that you have
              authority to bind that organization to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">2. Acceptable Use and Responsibilities</h2>
            <p>
              You agree to use ClientFlow CRM exclusively for lawful business management purposes. You
              must not attempt to bypass authentication mechanisms, perform unauthorized security scans,
              upload malicious scripts or binaries, or tamper with multi-tenant data boundaries.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">3. User Accounts and Role Hierarchy</h2>
            <p>
              User accounts are individual to assigned staff. Administrators are responsible for creating,
              assigning, and deactivating staff access appropriately. Deactivated staff will immediately
              lose access to CRM customer data.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">4. Data Ownership & Content</h2>
            <p>
              Your organization maintains sole ownership over all customer lists, deal data, meeting logs,
              and task records entered into the application. We claim no ownership over your imported or
              recorded CRM records.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">5. Limitation of Liability</h2>
            <p>
              ClientFlow CRM is provided on an "as is" and "as available" basis. To the maximum extent
              permitted by applicable law, in no event will the software providers be liable for indirect,
              incidental, or consequential commercial damages resulting from business decisions made using
              CRM analytics [VERIFY].
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
