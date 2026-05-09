export const metadata = { title: 'Privacy Policy — Izmaan Ecosystem' }

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-gray-700">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Overview</h2>
        <p>Izmaan Ecosystem ("we", "our", "us") is a business intelligence platform that connects to QuickBooks Online to generate customer account statements. This policy explains what data we collect, how we use it, and your rights.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Data We Collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account information:</strong> Your name and email address via Clerk authentication.</li>
          <li><strong>QuickBooks data:</strong> Customer records, transaction history, and account balances fetched on demand from your connected QuickBooks Online company.</li>
          <li><strong>OAuth tokens:</strong> QuickBooks access and refresh tokens stored securely in an encrypted Redis store to maintain your connection.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">3. How We Use Your Data</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To authenticate you and maintain your session.</li>
          <li>To retrieve and display customer statements from your QuickBooks account.</li>
          <li>We do not sell, share, or use your data for advertising purposes.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Data Storage &amp; Security</h2>
        <p>OAuth tokens are stored in an encrypted Upstash Redis instance. All data is transmitted over HTTPS. We apply rate limiting and authentication checks on all API endpoints.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Third-Party Services</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Clerk</strong> — authentication and user management (<a href="https://clerk.com/privacy" className="text-blue-600 underline">clerk.com/privacy</a>)</li>
          <li><strong>Intuit QuickBooks</strong> — accounting data provider (<a href="https://www.intuit.com/privacy/statement/" className="text-blue-600 underline">intuit.com/privacy</a>)</li>
          <li><strong>Vercel</strong> — hosting infrastructure (<a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 underline">vercel.com/legal/privacy-policy</a>)</li>
          <li><strong>Upstash</strong> — token storage (<a href="https://upstash.com/trust/privacy.pdf" className="text-blue-600 underline">upstash.com/trust/privacy.pdf</a>)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Data Retention</h2>
        <p>OAuth tokens are retained until you disconnect QuickBooks from the Settings page, at which point they are deleted. We do not store QuickBooks statement data — it is fetched on demand and never persisted.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Your Rights</h2>
        <p>You may disconnect your QuickBooks account at any time via the Settings page. To request deletion of your account data, contact us at the email below.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Contact</h2>
        <p>For privacy-related queries, contact: <a href="mailto:anneli@maroi.co.za" className="text-blue-600 underline">anneli@maroi.co.za</a></p>
      </section>
    </div>
  )
}
