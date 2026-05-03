export const TERMS_VERSION = 'May 2, 2026';

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
          By downloading, installing, or using Vantage ("the App", "VBSTAT"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, do not use the App.
        </p>
        <p>
          These terms apply to all users of the App, including coaches, athletes, statisticians, and any other individuals who access the App on any device.
        </p>
      </Section>

      <Section title="2. Description of the App">
        <p>
          Vantage is a free, offline-first volleyball statistics and match tracking application. The App allows users to:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Record live match statistics on a contact-by-contact basis</li>
          <li>Manage team rosters, seasons, and opponent records</li>
          <li>Track player and team performance metrics including serve, pass, attack, block, and defense stats</li>
          <li>Generate analytics including rotation analysis, win probability, and player efficiency ratings</li>
          <li>Export data in CSV, PDF, and JSON formats</li>
          <li>Use practice tools including serve-receive and serve tracking drills</li>
        </ul>
        <p>
          The App is designed for use in competitive and recreational volleyball environments and is intended for lawful stat-tracking purposes only.
        </p>
      </Section>

      <Section title="3. Data Storage and Privacy">
        <p>
          <span className="text-white font-semibold">All data is stored entirely on your device.</span> Vantage does not transmit, upload, or sync any user data to external servers, cloud services, or third parties. The App operates fully offline and requires no internet connection for core functionality.
        </p>
        <p>
          Data you enter — including team names, player names, match records, and statistics — is stored in your device's local browser storage (IndexedDB). This data is:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Accessible only on the device and browser where it was entered</li>
          <li>Not accessible to the developers of this App</li>
          <li>Not shared with any third party</li>
          <li>Subject to deletion if you clear your browser data or uninstall the App</li>
        </ul>
        <p>
          Because all data is local, <span className="text-white font-semibold">you are solely responsible for backing up your data.</span> We strongly recommend exporting regular JSON backups using the backup feature in Settings.
        </p>
      </Section>

      <Section title="4. No Account Required">
        <p>
          Vantage does not require user registration, email addresses, passwords, or any form of account creation. No personally identifiable information is collected by or transmitted to the developers.
        </p>
      </Section>

      <Section title="5. Intellectual Property">
        <p>
          The App, including its design, code, statistical algorithms (including the Shua Stat Engine and VER metric), graphics, and all associated content, is proprietary and protected by applicable intellectual property laws. You may not:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Copy, modify, distribute, sell, or lease any part of the App</li>
          <li>Reverse engineer or attempt to extract the source code of the App</li>
          <li>Reproduce the App's statistical models or algorithms for commercial use without written permission</li>
        </ul>
        <p>
          Data you enter into the App (team names, player names, stats) remains your own. You retain full ownership of the data you create.
        </p>
      </Section>

      <Section title="6. Acceptable Use">
        <p>You agree to use the App only for lawful purposes. You may not use the App to:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Record or distribute information about minors in a manner that violates applicable privacy laws</li>
          <li>Misrepresent statistics for fraudulent purposes (e.g., falsifying recruiting data)</li>
          <li>Circumvent or interfere with any security features of the App</li>
        </ul>
        <p>
          When recording statistics involving minors (e.g., high school athletes), you are responsible for ensuring your use complies with all applicable laws and your institution's policies regarding student data.
        </p>
      </Section>

      <Section title="7. Data Loss and Backup">
        <p>
          Because data is stored locally on your device, it can be lost due to events outside our control, including but not limited to:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Browser data being cleared manually or automatically</li>
          <li>Device failure, loss, or replacement</li>
          <li>App uninstallation or reinstallation</li>
          <li>OS updates that clear browser storage</li>
          <li>Storage quota being exceeded on the device</li>
        </ul>
        <p>
          The App provides an auto-backup system (up to 5 rolling snapshots) and a manual JSON export feature. <span className="text-white font-semibold">You are solely responsible for maintaining backups of your data.</span> The developers are not liable for any loss of data.
        </p>
      </Section>

      <Section title="8. Disclaimer of Warranties">
        <p>
          THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, THE DEVELOPERS DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Warranties of merchantability or fitness for a particular purpose</li>
          <li>Accuracy or completeness of statistical calculations or analytics</li>
          <li>Uninterrupted or error-free operation of the App</li>
          <li>Compatibility with any specific device, browser, or operating system version</li>
        </ul>
        <p>
          Statistical outputs, including win probability estimates, efficiency ratings (VER), and rotation analysis, are provided for informational and coaching purposes only. They are not guarantees of performance and should not be used as the sole basis for player evaluation or selection decisions.
        </p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Loss of data or statistics</li>
          <li>Loss of revenue or business opportunity</li>
          <li>Decisions made based on App analytics or statistics</li>
          <li>Any other damages arising from use or inability to use the App</li>
        </ul>
        <p>
          This limitation applies regardless of the theory of liability and even if the developers have been advised of the possibility of such damages.
        </p>
      </Section>

      <Section title="10. Third-Party Integrations">
        <p>
          The App supports optional export to MaxPreps via a pipe-delimited stat format. This integration requires you to provide your MaxPreps team UUID, which is stored locally on your device. The App does not communicate directly with MaxPreps servers — exported files must be manually uploaded by the user. Your use of MaxPreps is governed by MaxPreps's own terms of service.
        </p>
        <p>
          Exported PDF and CSV files are generated entirely on your device and are not transmitted anywhere by the App.
        </p>
      </Section>

      <Section title="11. Changes to These Terms">
        <p>
          We reserve the right to update or modify these Terms and Conditions at any time. Changes will be reflected by an updated "Last updated" date at the top of this page. Your continued use of the App after any changes constitutes acceptance of the new terms.
        </p>
        <p>
          We encourage you to review these terms periodically. Since the App operates offline and has no account system, we cannot notify you of changes directly.
        </p>
      </Section>

      <Section title="12. Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes arising from these Terms or your use of the App shall be subject to the exclusive jurisdiction of the courts of competent jurisdiction.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          If you have questions about these Terms and Conditions or the App, you can reach us at:
        </p>
        <p className="text-white font-medium mt-1">joshhollander11@gmail.com</p>
      </Section>

      <div className="border-t border-slate-800 pt-6 mt-4">
        <p className="text-xs text-slate-600 text-center">
          Vantage — Powered by the Shua Stat Engine<br />
          All data stored locally on this device. No account required.
        </p>
      </div>
    </div>
  );
}
