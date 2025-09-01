export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: September 1, 2025</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="mb-3">LOUMASS collects the following information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Email address, name, and profile information from your Google account</li>
              <li><strong>Gmail Data:</strong> Access to send emails on your behalf through Gmail API</li>
              <li><strong>Contact Information:</strong> Email addresses and names of your contacts that you upload</li>
              <li><strong>Campaign Data:</strong> Email content, templates, and campaign performance metrics</li>
              <li><strong>Analytics Data:</strong> Email opens, clicks, and engagement metrics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p className="mb-3">We use your information solely to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send email campaigns on your behalf through your connected Gmail account</li>
              <li>Track email engagement (opens, clicks, replies)</li>
              <li>Manage your contact lists and sequences</li>
              <li>Provide analytics and reporting on campaign performance</li>
              <li>Authenticate and maintain your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Gmail API Usage</h2>
            <p className="mb-3">Our use of information received from Gmail APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
            <p className="mb-3">We access Gmail solely to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send emails from your account as directed by you</li>
              <li>Read email metadata to track replies</li>
              <li>Compose and modify drafts as requested</li>
            </ul>
            <p className="mt-3"><strong>We never:</strong></p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Read your personal emails without your explicit action</li>
              <li>Share your Gmail data with third parties</li>
              <li>Use your email data for advertising purposes</li>
              <li>Store your Gmail password</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Storage and Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your data is stored securely in encrypted databases</li>
              <li>Gmail OAuth tokens are encrypted and stored securely</li>
              <li>We use industry-standard security measures to protect your data</li>
              <li>Access to your data is limited to authorized personnel only</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
            <p className="mb-3">We do not sell, trade, or share your personal information with third parties except:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Request correction of your data</li>
              <li>Request deletion of your account and data</li>
              <li>Revoke Gmail access at any time through Google account settings</li>
              <li>Export your contact lists and campaign data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
            <p>We retain your data only as long as your account is active. Upon account deletion, we remove all your personal data within 30 days, except where required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p>Our service is not intended for users under 18 years of age. We do not knowingly collect data from children.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any significant changes via email.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p>For questions about this privacy policy or your data, contact us at:</p>
            <p className="mt-2">
              Email: ljpiotti@aftershockfam.org<br />
              Website: https://loumassbeta.vercel.app
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}