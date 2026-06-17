export const PRIVACY_VERSION = 'June 15, 2026';

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-base font-bold text-white mb-3 uppercase tracking-wide">{title}</h2>
    <div className="space-y-3 text-sm text-slate-400 leading-relaxed">{children}</div>
  </section>
);

export function PrivacyPolicyContent() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <p className="text-xs text-slate-500 mb-8">Last updated: {PRIVACY_VERSION}</p>

      <Section title="1. Who We Are">
        <p>
          Vantage ("we", "us", "our") is a volleyball statistics and coaching application available at vantagevb.net. This Privacy Policy explains what information we collect, how we use it, and your rights regarding it.
        </p>
        <p>
          If you have questions or requests regarding your data, contact us at:{' '}
          <a href="mailto:vantagevb@gmail.com" className="text-orange-400 underline">vantagevb@gmail.com</a>
        </p>
      </Section>

      <Section title="2. Who This App Is For">
        <p>
          Vantage is designed exclusively for coaches, athletic staff, and educators who are 18 years of age or older. This App is not directed at children under the age of 13, and we do not knowingly collect personal information from anyone under 13.
        </p>
        <p>
          If you believe a child under 13 has provided personal information through this App, contact us immediately at vantagevb@gmail.com and we will delete it.
        </p>
      </Section>

      <Section title="3. Information We Collect">
        <p>We collect only what is necessary to provide the App's features:</p>

        <p className="text-white font-semibold mt-2">Account Information</p>
        <p>
          When you create an account, we collect your email address and a hashed password. This is processed and stored by Supabase, our authentication provider. We do not store your raw password.
        </p>

        <p className="text-white font-semibold mt-2">Coaching Data You Enter</p>
        <p>
          All team names, player names, jersey numbers, match statistics, rotation configurations, and related coaching data are entered by you. This data is stored locally on your device (in your browser's IndexedDB storage) and, if you use cloud backup or FamilyScope, also on Supabase servers. We do not access, analyze, or sell this data.
        </p>

        <p className="text-white font-semibold mt-2">Subscription and Billing Information</p>
        <p>
          If you purchase a paid plan, payments are processed by Stripe, Inc. We receive confirmation of your subscription status from Stripe but do not store your payment card number, bank account details, or full billing address. Stripe's handling of payment data is governed by{' '}
          <span className="text-slate-300">Stripe's Privacy Policy</span>.
        </p>

        <p className="text-white font-semibold mt-2">Technical and Device Information</p>
        <p>
          The App may access standard browser APIs (such as screen orientation, storage quota, and wake lock) to function correctly. We do not collect device identifiers, IP addresses, or browsing history. Your browser may expose some technical metadata (browser type, OS version) through standard web requests to Supabase, which is governed by Supabase's Privacy Policy.
        </p>
      </Section>

      <Section title="4. Information We Do NOT Collect">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>We do not use advertising networks or sell data to advertisers</li>
          <li>We do not use third-party analytics platforms (e.g., Google Analytics)</li>
          <li>We do not collect location data or GPS coordinates</li>
          <li>We do not collect biometric data</li>
          <li>We do not track your activity across other websites or apps</li>
          <li>We do not use cookies beyond what your browser sets locally for app session state</li>
        </ul>
      </Section>

      <Section title="5. How We Use Your Information">
        <p>We use the information we collect only to:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Authenticate your account and maintain your session</li>
          <li>Store and sync your coaching data when you use cloud backup or FamilyScope</li>
          <li>Manage your subscription and grant access to paid features</li>
          <li>Respond to support requests you send to vantagevb@gmail.com</li>
          <li>Send transactional emails (account confirmation, password reset) via Supabase</li>
        </ul>
        <p>We do not use your data to train AI or machine learning models.</p>
      </Section>

      <Section title="6. How Your Data Is Stored">
        <p className="text-white font-semibold">On Your Device (Primary Storage)</p>
        <p>
          All match contacts, rosters, statistics, and app settings are stored in your browser's local IndexedDB storage. This data never leaves your device unless you explicitly use cloud backup or FamilyScope. It is not accessible to us. Clearing your browser data or uninstalling the app will permanently delete this local data.
        </p>

        <p className="text-white font-semibold mt-2">In the Cloud (Supabase)</p>
        <p>
          Your account profile and subscription status are stored on Supabase servers located in the United States. Cloud backups and FamilyScope shared snapshots are also stored on Supabase and are protected by row-level security — only your authenticated account can read or write your own data, except for FamilyScope links which are intentionally accessible to anyone who holds the link.
        </p>
      </Section>

      <Section title="7. Student Athlete Data">
        <p>
          Vantage is a tool for coaches to record their own observations. When you enter player names, jersey numbers, or statistics involving minors (such as high school athletes), you are the data controller for that information — not us.
        </p>
        <p>
          We do not independently identify, contact, or process data about individual student athletes. You are responsible for ensuring your use of the App complies with all applicable laws and institutional policies governing student data, including FERPA (Family Educational Rights and Privacy Act) and any applicable state privacy laws.
        </p>
        <p>
          We recommend using jersey numbers rather than full names where possible, and using the FamilyScope feature only to share information you are authorized to disclose.
        </p>
      </Section>

      <Section title="8. Third-Party Services">
        <p>Vantage uses the following third-party services. Each governs its own data practices:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <span className="text-white font-semibold">Supabase</span> — account authentication, cloud storage, and FamilyScope real-time sharing. Data processed by Supabase is subject to Supabase's Privacy Policy and is stored in the United States.
          </li>
          <li>
            <span className="text-white font-semibold">Stripe</span> — subscription payment processing. Payment card data is handled entirely by Stripe and is never transmitted to or stored by us.
          </li>
        </ul>
        <p>We do not share your data with any other third parties except as required by law.</p>
      </Section>

      <Section title="9. Data Retention and Deletion">
        <p className="text-white font-semibold">Local data</p>
        <p>
          Data in your device's IndexedDB storage persists until you clear your browser data, uninstall the app, or use the in-app "Clear All Data" function. We have no ability to access or delete this data on your behalf.
        </p>

        <p className="text-white font-semibold mt-2">Cloud data</p>
        <p>
          Your Supabase account record and any cloud backups are retained while your account is active. To request deletion of your account and all associated cloud data, email vantagevb@gmail.com. We will process deletion requests within 30 days.
        </p>

        <p className="text-white font-semibold mt-2">FamilyScope snapshots</p>
        <p>
          FamilyScope shared snapshots are stored on Supabase for the duration of an active match share session. You can revoke a share link at any time from within the App, which removes the snapshot from Supabase.
        </p>
      </Section>

      <Section title="10. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><span className="text-white font-semibold">Access</span> — request a copy of the personal data we hold about you</li>
          <li><span className="text-white font-semibold">Correction</span> — correct inaccurate account information</li>
          <li><span className="text-white font-semibold">Deletion</span> — request deletion of your account and cloud data</li>
          <li><span className="text-white font-semibold">Export</span> — export all your coaching data at any time using the in-app JSON export feature</li>
          <li><span className="text-white font-semibold">Portability</span> — your exported JSON data can be imported into a new device or retained independently of the App</li>
        </ul>
        <p>To exercise any of these rights, contact vantagevb@gmail.com.</p>
      </Section>

      <Section title="11. Security">
        <p>
          We take reasonable technical measures to protect your data. Supabase enforces row-level security so that no user can access another user's cloud data. Passwords are hashed and never stored in plain text.
        </p>
        <p>
          However, no method of electronic storage or transmission is 100% secure. We encourage you to use a strong, unique password and to export regular JSON backups of your coaching data.
        </p>
      </Section>

      <Section title="12. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. For material changes, we will make reasonable efforts to notify you via email or an in-app notice.
        </p>
        <p>
          Your continued use of the App after changes are posted constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="13. Governing Law">
        <p>
          This Privacy Policy is governed by the laws of the State of Illinois, United States. Any disputes arising from this policy shall be subject to the exclusive jurisdiction of the courts of competent jurisdiction in Illinois.
        </p>
      </Section>

      <Section title="14. Contact Us">
        <p>For any privacy-related questions, data requests, or concerns:</p>
        <p className="text-white font-medium mt-1">vantagevb@gmail.com</p>
        <p className="mt-2">
          You may also review our{' '}
          <a href="/terms" className="text-orange-400 underline">Terms of Service</a>.
        </p>
      </Section>

      <div className="border-t border-slate-800 pt-6 mt-4">
        <p className="text-xs text-slate-600 text-center">
          Vantage — Powered by Vantage Analytics<br />
          © 2026 Vantage. All rights reserved.
        </p>
      </div>
    </div>
  );
}
