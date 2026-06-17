export const TERMS_VERSION = 'June 14, 2026';

const Section = ({ title, children }) => (
  <section className="mb-8">
    <h2 className="text-base font-bold text-white mb-3 uppercase tracking-wide">{title}</h2>
    <div className="space-y-3 text-sm text-slate-400 leading-relaxed">{children}</div>
  </section>
);

export function TermsContent() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <p className="text-xs text-slate-500 mb-8">Last updated: {TERMS_VERSION}</p>

      <Section title="1. Acceptance of Terms">
        <p>
          By creating an account or using Vantage ("the App", "VBSTAT"), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the App.
        </p>
        <p>
          These terms apply to all users, including coaches, athletes, statisticians, and any other individuals who access the App on any device.
        </p>
      </Section>

      <Section title="2. Description of the App">
        <p>
          Vantage is a volleyball statistics and match tracking application available as a Progressive Web App (PWA). Features include:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Live match stat tracking on a contact-by-contact basis</li>
          <li>Team roster, season, and opponent management</li>
          <li>Player and team analytics including rotation analysis, win probability, and VER efficiency ratings</li>
          <li>Serve receive pattern design and rotation optimization tools</li>
          <li>Practice tools including serve tracking and serve receive drills</li>
          <li>All-time records tracking for individual players, teams, and programs</li>
          <li>FamilyScope live sharing — a real-time, read-only view for parents and fans</li>
          <li>Cloud backup and multi-device data sync</li>
          <li>Data export in CSV, PDF, and JSON formats</li>
        </ul>
        <p>
          Some features require a paid subscription plan. Plan details are described in Section 4.
        </p>
      </Section>

      <Section title="3. Accounts and Authentication">
        <p>
          Vantage requires you to create an account with a valid email address and password. Account authentication is handled by Supabase, a third-party authentication provider. By creating an account, you:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Represent that you are at least 18 years of age and are using the App in a coaching, athletic staff, or educational capacity</li>
          <li>Agree to provide accurate and current information during signup</li>
          <li>Are responsible for maintaining the confidentiality of your password</li>
          <li>Are responsible for all activity that occurs under your account</li>
        </ul>
        <p>
          You may request deletion of your account by contacting us at vantagevb@gmail.com. Upon deletion, your authentication record and cloud-stored data will be removed. Data stored locally on your device must be cleared separately.
        </p>
      </Section>

      <Section title="4. Paid Plans and Payments">
        <p>
          Vantage offers a free baseline tier and paid subscription plans that unlock additional features and team capacity. Paid plans are billed on a per-season basis.
        </p>
        <p>
          Payments are processed by Stripe, Inc. By purchasing a plan, you agree to provide accurate billing information and authorize us to charge your payment method. All prices are listed in USD and are exclusive of any applicable taxes.
        </p>
        <p>
          <span className="text-white font-semibold">Refund policy:</span> Paid plans grant immediate access to premium features upon purchase. Because of this, all sales are final and no refunds are issued except where required by applicable law. If you believe you were charged in error, contact us within 14 days at vantagevb@gmail.com.
        </p>
        <p>
          Plan access expires at the end of the season period for which it was purchased. You must repurchase to renew access for a subsequent season. We are not responsible for loss of access due to expiry you were aware of or notified about.
        </p>
        <p>
          We reserve the right to change plan pricing. Existing paid plans are not affected by price changes until their expiry date.
        </p>
      </Section>

      <Section title="5. Data Storage and Privacy">
        <p>
          Your use of the App is also governed by our <a href="/privacy" className="text-orange-400 underline">Privacy Policy</a>, which is incorporated into these Terms by reference.
        </p>
        <p>
          Vantage stores data in two places:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><span className="text-white font-semibold">On your device</span> — all match contacts, rosters, stats, and settings are stored in your device's local browser storage (IndexedDB). This is the primary data store and works offline.</li>
          <li><span className="text-white font-semibold">In the cloud (Supabase)</span> — your account profile, subscription status, cloud backups you initiate, and FamilyScope shared snapshots are stored on Supabase servers located in the United States.</li>
        </ul>
        <p>
          Data stored on Supabase is protected by row-level security — only your account can read or write your own data, except for FamilyScope share links which are intentionally accessible to anyone with the link.
        </p>
        <p>
          We do not sell, rent, or share your personal data or coaching data with third parties, except as required by law or to operate the App (Supabase for auth/storage, Stripe for payments).
        </p>
        <p>
          <span className="text-white font-semibold">Student data:</span> When recording statistics involving minors (e.g., high school athletes), you are responsible for ensuring your use complies with all applicable laws — including FERPA, COPPA, and your institution's data policies — regarding student data. We do not knowingly collect data about individual students; player names and jersey numbers are entered by you and stored under your account.
        </p>
      </Section>

      <Section title="6. FamilyScope Live Sharing">
        <p>
          FamilyScope allows you to share a live, read-only view of a match with parents and fans via a unique link or QR code. When FamilyScope is active:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Live score, rally-by-rally updates, and box score data are transmitted to Supabase and made available to anyone who holds the share link</li>
          <li>The share link is publicly accessible — treat it like a semi-public URL</li>
          <li>You can regenerate the link at any time to revoke access for previous recipients</li>
          <li>You are responsible for deciding what data to share and with whom</li>
        </ul>
        <p>
          Do not include sensitive or private information (such as player addresses or medical information) in any field that may appear in a FamilyScope share.
        </p>
      </Section>

      <Section title="7. Intellectual Property">
        <p>
          The App, including its design, code, statistical algorithms (including the Vantage Stat Engine and VER metric), graphics, and all associated content, is proprietary and protected by applicable intellectual property laws. You may not:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Copy, modify, distribute, sell, or lease any part of the App</li>
          <li>Reverse engineer or attempt to extract the source code of the App</li>
          <li>Reproduce the App's statistical models or algorithms for commercial use without written permission</li>
        </ul>
        <p>
          Data you enter into the App (team names, player names, stats) remains your own. You retain full ownership of the data you create and may export it at any time.
        </p>
      </Section>

      <Section title="8. Acceptable Use">
        <p>You agree to use the App only for lawful purposes. You may not use the App to:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Record or distribute information about minors in a manner that violates applicable privacy laws</li>
          <li>Misrepresent statistics for fraudulent purposes (e.g., falsifying recruiting data)</li>
          <li>Circumvent or interfere with any security features of the App</li>
          <li>Share your account credentials with others</li>
          <li>Attempt to access another user's data</li>
        </ul>
      </Section>

      <Section title="9. Data Loss and Backup">
        <p>
          Local device data can be lost due to events outside our control, including browser data being cleared, device failure, app reinstallation, or storage quota being exceeded. Cloud backups reduce this risk but are not a guarantee against all loss scenarios.
        </p>
        <p>
          The App provides automatic rolling backups (up to 5 snapshots) stored locally, optional cloud backup to Supabase, and a manual JSON export feature. <span className="text-white font-semibold">We strongly recommend exporting regular JSON backups and storing them in a safe location.</span>
        </p>
        <p>
          The developers are not liable for any loss of data, including data lost due to account deletion, plan expiry, or service interruption.
        </p>
      </Section>

      <Section title="10. Disclaimer of Warranties">
        <p>
          THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, THE DEVELOPERS DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Warranties of merchantability or fitness for a particular purpose</li>
          <li>Accuracy or completeness of statistical calculations or analytics</li>
          <li>Uninterrupted or error-free operation of the App or its cloud services</li>
          <li>Compatibility with any specific device, browser, or operating system version</li>
        </ul>
        <p>
          Statistical outputs — including win probability estimates, efficiency ratings (VER), and rotation analysis — are for informational and coaching purposes only. They are not guarantees of performance and should not be the sole basis for player evaluation or selection decisions.
        </p>
      </Section>

      <Section title="11. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Loss of data or statistics</li>
          <li>Loss of revenue or business opportunity</li>
          <li>Decisions made based on App analytics or statistics</li>
          <li>Service interruptions affecting FamilyScope live sharing or cloud sync</li>
          <li>Any other damages arising from use or inability to use the App</li>
        </ul>
        <p>
          In no event shall our total liability to you for all claims exceed the amount you paid for your current plan in the twelve months preceding the claim.
        </p>
      </Section>

      <Section title="12. Third-Party Services">
        <p>
          Vantage integrates with the following third-party services, each governed by their own terms of service and privacy policies:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><span className="text-white font-semibold">Supabase</span> — provides account authentication, cloud data storage, and real-time FamilyScope sharing. Data processed by Supabase is subject to Supabase's Privacy Policy.</li>
          <li><span className="text-white font-semibold">Stripe</span> — processes all subscription payments. Payment card data is handled entirely by Stripe and is never stored by us. Use of Stripe is subject to Stripe's Services Agreement.</li>
          <li><span className="text-white font-semibold">MaxPreps</span> — the App supports optional stat export in a MaxPreps-compatible format. Exported files must be manually uploaded by you. The App does not communicate directly with MaxPreps servers.</li>
        </ul>
      </Section>

      <Section title="13. Changes to These Terms">
        <p>
          We reserve the right to update or modify these Terms at any time. Changes will be reflected by an updated "Last updated" date at the top of this page. For material changes, we will make reasonable efforts to notify registered users via email or an in-app notice.
        </p>
        <p>
          Your continued use of the App after changes are posted constitutes acceptance of the updated terms. We encourage you to review these terms periodically.
        </p>
      </Section>

      <Section title="14. Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of Illinois, United States, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the App shall be subject to the exclusive jurisdiction of the courts of competent jurisdiction in Illinois.
        </p>
      </Section>

      <Section title="15. Contact">
        <p>
          If you have questions about these Terms, your account, billing, or data deletion requests, contact us at:
        </p>
        <p className="text-white font-medium mt-1">vantagevb@gmail.com</p>
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
