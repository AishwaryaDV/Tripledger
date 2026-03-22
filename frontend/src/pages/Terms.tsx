// src/pages/Terms.tsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = 'March 2025'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
)

const Terms = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">

        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground mb-8 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Terms & Conditions</h1>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-8">

          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using Tripledger ("the app", "we", "us"), you agree to be bound by
              these Terms & Conditions. If you do not agree, please do not use the app.
            </p>
          </Section>

          <Section title="2. What Tripledger Does">
            <p>
              Tripledger is an expense-splitting tool that helps groups of people track shared
              expenses, calculate balances, and coordinate repayments. It is a record-keeping tool
              only — we do not process, hold, or transfer any money on your behalf.
            </p>
          </Section>

          <Section title="3. Your Account">
            <p>
              You are responsible for maintaining the confidentiality of your login credentials.
              You agree to provide accurate information when signing up and to keep your account
              details up to date. You must be at least 13 years old to use Tripledger.
            </p>
          </Section>

          <Section title="4. Data & Privacy">
            <p>
              We collect and store the data you provide — including your name, email, and expense
              records — to operate the app. We do not sell your personal data to third parties.
            </p>
            <p>
              Expense data entered within a circle is visible to all members of that circle. Be
              mindful of what you share.
            </p>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Use the app for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to other users' data</li>
              <li>Abuse, harass, or impersonate other users</li>
              <li>Reverse-engineer or scrape the app</li>
            </ul>
          </Section>

          <Section title="6. No Financial Advice">
            <p>
              Tripledger provides balance calculations for informational purposes only. We are not
              a financial institution and nothing in the app constitutes financial, legal, or tax
              advice. Actual payment arrangements are solely between you and the other members of
              your circle.
            </p>
          </Section>

          <Section title="7. Availability">
            <p>
              We aim to keep Tripledger available at all times but cannot guarantee uninterrupted
              access. We may update, suspend, or discontinue features at any time without prior
              notice.
            </p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              To the fullest extent permitted by law, Tripledger and its creators are not liable
              for any indirect, incidental, or consequential damages arising from your use of the
              app, including disputes between users over payments.
            </p>
          </Section>

          <Section title="9. Changes to These Terms">
            <p>
              We may update these terms from time to time. Continued use of the app after changes
              are posted constitutes your acceptance of the updated terms.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Questions about these terms? Reach us at{' '}
              <a
                href="mailto:hello@tripledger.app"
                className="text-blue-500 hover:text-blue-600 hover:underline transition-colors"
              >
                hello@tripledger.app
              </a>
            </p>
          </Section>

        </div>

        <div className="mt-12 pt-6 border-t text-xs text-muted-foreground">
          © {new Date().getFullYear()} Tripledger. All rights reserved.
        </div>

      </div>
    </div>
  )
}

export default Terms
