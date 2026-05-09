export const metadata = { title: 'End User License Agreement — Izmaan Ecosystem' }

export default function EulaPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-gray-700">
      <h1 className="text-3xl font-semibold text-gray-900 mb-2">End User License Agreement</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance</h2>
        <p>By accessing or using Izmaan Ecosystem ("the Application"), you agree to be bound by this End User License Agreement ("EULA"). If you do not agree, do not use the Application.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">2. License Grant</h2>
        <p>We grant you a limited, non-exclusive, non-transferable, revocable licence to access and use the Application solely for your internal business purposes.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Restrictions</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Copy, modify, or distribute the Application or its source code.</li>
          <li>Reverse engineer or attempt to extract the source code.</li>
          <li>Use the Application for any unlawful purpose.</li>
          <li>Share your account credentials with third parties.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">4. QuickBooks Integration</h2>
        <p>The Application connects to your QuickBooks Online account via the Intuit OAuth 2.0 API. You are responsible for ensuring your use of QuickBooks data complies with Intuit's Terms of Service. We access only the data necessary to generate customer statements.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Intellectual Property</h2>
        <p>All rights, title, and interest in the Application remain with us. This EULA grants you no ownership rights.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Disclaimer of Warranties</h2>
        <p>The Application is provided "as is" without warranties of any kind, express or implied. We do not warrant that the Application will be uninterrupted, error-free, or that financial data displayed will be accurate in all circumstances.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">7. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Application.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">8. Termination</h2>
        <p>This licence is effective until terminated. It terminates automatically if you breach any term. Upon termination, you must cease all use of the Application.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">9. Governing Law</h2>
        <p>This EULA is governed by the laws of the Republic of South Africa.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Contact</h2>
        <p>For any queries regarding this EULA, contact: <a href="mailto:anneli@maroi.co.za" className="text-blue-600 underline">anneli@maroi.co.za</a></p>
      </section>
    </div>
  )
}
