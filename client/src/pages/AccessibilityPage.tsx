import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const AccessibilityPage: React.FC = () => {
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
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Accessibility Statement</h1>
            <p className="text-xs text-slate-400">Last updated: October 14, 2026</p>
          </div>
        </div>

        <div className="prose prose-sm prose-slate max-w-none space-y-6 text-xs text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Our Commitment</h2>
            <p>
              ClientFlow CRM is committed to providing an accessible, usable experience for all users,
              including individuals with disabilities. We continually review and optimize our interface
              towards conformance with the <strong>Web Content Accessibility Guidelines (WCAG) 2.2 Level AA</strong> standards.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Measures to Support Accessibility</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>High-contrast visual hierarchy and legible typography with minimum 4.5:1 text-to-background contrast ratios.</li>
              <li>Visible focus indicators and keyboard operability for navigation, modals, and data tables.</li>
              <li>Clear form labels linked directly to corresponding inputs for assistive screen readers.</li>
              <li>Dialogs supporting immediate dismissal via the Escape key and backdrop containment.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Feedback and Inquiries</h2>
            <p>
              If you experience any accessibility barrier while using ClientFlow CRM, please notify our
              team at <code>accessibility@clientflow.com</code> [VERIFY]. We strive to review and address
              reported accessibility feedback promptly.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
