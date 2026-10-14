import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
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
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-400">Last updated: October 14, 2026</p>
          </div>
        </div>

        <div className="prose prose-sm prose-slate max-w-none space-y-6 text-xs text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">1. Who We Are</h2>
            <p>
              ClientFlow CRM ("we", "us", "our") provides customer relationship management and sales
              pipeline automation software. This Privacy Policy discloses our data collection,
              storage, and handling practices in compliance with applicable data protection regulations [VERIFY].
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account Credentials:</strong> Name, professional email address, and encrypted
                password hash (managed via bcrypt).
              </li>
              <li>
                <strong>Customer & Deal Records:</strong> Names, company affiliations, job titles, business
                emails, telephone numbers, pipeline valuations, and office addresses entered into the CRM.
              </li>
              <li>
                <strong>Operational History:</strong> Internal team notes, telephone call logs, meeting
                minutes, and task deadlines.
              </li>
              <li>
                <strong>Technical Sessions:</strong> First-party session identifier cookies (<code>clientflow.sid</code>)
                required solely to provide authenticated session continuity.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">3. Purpose and Legal Basis for Processing</h2>
            <div className="overflow-x-auto my-3">
              <table className="w-full text-left border border-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="p-2.5">Purpose</th>
                    <th className="p-2.5">Data Processed</th>
                    <th className="p-2.5">Legal Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5">Authentication & Access Control</td>
                    <td className="p-2.5">Email, bcrypt hash, session token</td>
                    <td className="p-2.5 font-medium">Contract / Legitimate Interest</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Sales Pipeline & Task Management</td>
                    <td className="p-2.5">Customer contacts, deal stages, tasks</td>
                    <td className="p-2.5 font-medium">Legitimate Business Operations</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Security & Fraud Prevention</td>
                    <td className="p-2.5">Audit timestamps, IP rate limiter stats</td>
                    <td className="p-2.5 font-medium">Legal Obligation / Legitimate Interest</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">4. Third-Party Sharing and Trackers</h2>
            <p>
              We do not sell, rent, or trade your personal or CRM information. No third-party marketing
              pixels, tracking beacons, or cross-site tracking scripts are loaded on ClientFlow CRM.
              Data is transmitted solely to secure database servers hosting your instance.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">5. Data Security & Storage</h2>
            <p>
              All traffic is protected in transit via HTTPS/TLS encryption. Sensitive password data is
              hashed with 10 salt rounds of bcrypt and excluded from client-facing API responses.
              Input sanitization guards against NoSQL injection.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">6. Your Rights and Deletion Requests</h2>
            <p>
              Depending on your jurisdiction, you may hold rights to inspect, export, rectify, or request
              permanent erasure of your account and related customer records. Administrators can archive
              or remove contacts directly via the CRM interface or contact your system administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
