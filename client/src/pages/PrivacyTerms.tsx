import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptPrivacy, getProfile } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

const EFFECTIVE_DATE = 'February 25, 2026';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

function Accordion({ sections }: { sections: Section[] }) {
  const [open, setOpen] = useState<string | null>(sections[0]?.id ?? null);
  return (
    <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden">
      {sections.map((s) => (
        <div key={s.id}>
          <button
            onClick={() => setOpen(open === s.id ? null : s.id)}
            className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-stone-50 transition-colors text-left"
          >
            <span className="font-medium text-stone-900">{s.title}</span>
            {open === s.id
              ? <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" />
              : <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />}
          </button>
          {open === s.id && (
            <div className="px-5 pb-5 bg-white text-sm text-stone-600 space-y-3">
              {s.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const sections: Section[] = [
  {
    id: 'hipaa',
    title: '1. Notice of Privacy Practices (HIPAA)',
    content: (
      <>
        <p className="font-semibold text-stone-800 bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs uppercase tracking-wide">
          THIS NOTICE DESCRIBES HOW HEALTH INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED, AND HOW YOU CAN ACCESS THIS INFORMATION. PLEASE REVIEW IT CAREFULLY.
        </p>
        <p>ArtTherapy connects clients with licensed therapists who are "covered entities" under the Health Insurance Portability and Accountability Act (HIPAA). As a technology platform facilitating those services, ArtTherapy acts as a Business Associate and maintains a Business Associate Agreement (BAA) with each therapist on the platform.</p>
        <p><strong>Protected Health Information (PHI)</strong> includes any individually identifiable health information such as your name, contact information, appointment records, session notes, and payment records tied to your care.</p>
        <p><strong>Permitted uses of your PHI:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Treatment:</strong> Sharing relevant information with your therapist to facilitate care</li>
          <li><strong>Payment:</strong> Processing session payments and maintaining financial records</li>
          <li><strong>Healthcare Operations:</strong> Quality improvement, platform security, and auditing</li>
        </ul>
        <p><strong>Uses requiring your written authorization:</strong> Marketing, sale of PHI, and disclosure of psychotherapy notes (private session notes maintained separately by your therapist).</p>
        <p><strong>Special protection for psychotherapy notes:</strong> Under HIPAA, private process notes that your therapist keeps separately from the treatment record receive heightened protection. These cannot be disclosed without your explicit written authorization, even for billing purposes.</p>
      </>
    ),
  },
  {
    id: 'confidentiality',
    title: '2. Limits of Confidentiality',
    content: (
      <>
        <p>Your therapist is legally and ethically required to maintain strict confidentiality. However, the following situations may require disclosure of your information without your consent:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Mandatory reporting:</strong> All therapists on this platform are mandated reporters. If there is reasonable suspicion of child abuse, elder abuse, or abuse of a vulnerable adult, your therapist is required by state law to report it to the appropriate authorities.</li>
          <li><strong>Duty to warn/protect:</strong> If you make a credible, serious, and imminent threat of harm to an identifiable third party, your therapist may be legally required to warn that person and/or notify law enforcement (per the <em>Tarasoff</em> standard and applicable state law).</li>
          <li><strong>Court orders:</strong> A valid court order or subpoena may compel disclosure of records. Your therapist will notify you unless legally prohibited from doing so.</li>
          <li><strong>Imminent self-harm:</strong> If you present a serious and imminent risk of harm to yourself, your therapist may take steps to protect your safety, including contacting emergency services.</li>
          <li><strong>Supervision and consultation:</strong> Your therapist may consult with supervisors or peers for professional development. Confidentiality is maintained by those parties.</li>
        </ul>
        <p className="text-stone-500 text-xs">State law governs the specific scope of these exceptions and may impose additional obligations. You will be informed of applicable exceptions at the start of your therapeutic relationship.</p>
      </>
    ),
  },
  {
    id: 'consent',
    title: '3. Informed Consent to Treatment',
    content: (
      <>
        <p>By booking a session through ArtTherapy, you acknowledge that:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Therapy is a voluntary activity. You have the right to refuse or withdraw from treatment at any time without penalty.</li>
          <li>Your therapist will discuss their therapeutic approach, credentials, and the expected course of treatment at the beginning of your first session.</li>
          <li>Therapy may involve discussing difficult emotions and experiences, which can temporarily feel uncomfortable. This is a normal part of the therapeutic process.</li>
          <li>Art therapy specifically uses creative expression (drawing, painting, collage, sculpture, etc.) alongside or instead of traditional talk therapy as a means of emotional exploration and healing.</li>
          <li>You have the right to ask questions about the treatment approach and to participate in setting goals for therapy.</li>
        </ul>
        <p>Therapists on this platform hold valid licenses in their respective states. You can verify a therapist's credentials through your state's licensing board website.</p>
      </>
    ),
  },
  {
    id: 'telehealth',
    title: '4. Telehealth & Video Session Consent',
    content: (
      <>
        <p>If you choose video sessions, you acknowledge the following:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Technology risks:</strong> Video sessions carry inherent technical risks including connection interruptions and potential (though rare) breaches of electronic security. Your therapist uses encrypted, HIPAA-compliant video platforms.</li>
          <li><strong>Jurisdiction and licensing:</strong> Your therapist must be licensed in the state where you are physically located at the time of each session. By booking a video session, you confirm you will be in a state where your therapist is licensed.</li>
          <li><strong>Emergency protocol:</strong> Video sessions limit a therapist's ability to directly intervene in a physical emergency. At the start of each session, confirm your physical location and local emergency contact (911) is available to you. Your therapist will have a local emergency resource plan for your area.</li>
          <li><strong>Session interruption:</strong> If the video connection fails, your therapist will attempt to reconnect via phone. Confirm your phone number is up to date in your profile.</li>
          <li><strong>Recording:</strong> Sessions are not recorded by the platform. Recording sessions without your therapist's explicit consent is prohibited.</li>
          <li><strong>Privacy of your environment:</strong> Choose a private, quiet location for video sessions to protect your own confidentiality.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data',
    title: '5. Data Collection, Storage & Your Rights',
    content: (
      <>
        <p><strong>What we collect:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account information: name, email, phone number, optional profile fields (nickname, age, gender)</li>
          <li>Appointment records: dates, times, session format, therapist information</li>
          <li>Session notes: created and maintained by your therapist, accessible to your care team only</li>
          <li>Payment records: transaction amounts, dates, and status (we never store full card numbers)</li>
          <li>Forms and feedback: responses to any forms sent by your therapist</li>
          <li>Technical data: IP address, device type, and usage logs for security and fraud prevention</li>
        </ul>
        <p><strong>Your rights under HIPAA and applicable law:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Right to access:</strong> Request a copy of your health records</li>
          <li><strong>Right to amend:</strong> Request corrections to inaccurate records</li>
          <li><strong>Right to restrict:</strong> Request limitations on certain uses of your PHI</li>
          <li><strong>Right to accounting:</strong> Receive a list of disclosures of your PHI</li>
          <li><strong>Right to portability:</strong> Receive your data in a structured, commonly used format</li>
          <li><strong>Right to erasure:</strong> Request deletion of your account (subject to legal retention obligations)</li>
        </ul>
        <p><strong>Data retention:</strong> Health and therapy records are retained for a minimum of 6 years from the date of creation or last effective date, or as required by applicable state law, whichever is longer. Payment records are retained per PCI DSS requirements.</p>
        <p><strong>To exercise your rights,</strong> contact us at privacy@arttherapy.dev. We will respond within 30 days.</p>
      </>
    ),
  },
  {
    id: 'payment-privacy',
    title: '6. Payment Data & PCI DSS',
    content: (
      <>
        <p>All payment processing is handled by <strong>Stripe</strong>, a PCI DSS Level 1 certified payment processor — the highest level of certification available in the payments industry.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>ArtTherapy never stores, processes, or transmits your raw credit or debit card numbers, CVV codes, or card expiration dates on its own servers.</li>
          <li>Stripe's privacy policy governs how your payment data is handled. You can review it at <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline inline-flex items-center gap-0.5">stripe.com/privacy <ExternalLink className="h-3 w-3" /></a>.</li>
          <li>ArtTherapy collects a 15% platform fee per session. The remainder is transferred directly to your therapist's connected payment account.</li>
          <li>Transaction records visible in your account (amount, date, therapist name) are retained as required by law and our refund policy.</li>
          <li>Your therapist can only see session confirmation details — they never have access to your card information.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'breach',
    title: '7. Data Breach Notification',
    content: (
      <>
        <p>ArtTherapy maintains comprehensive security policies and technical controls to protect your information. In the event of a data breach involving your PHI:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>We will notify affected users within <strong>60 days</strong> of discovering a breach, as required by the HIPAA Breach Notification Rule (45 CFR §§ 164.400–414).</li>
          <li>Notification will be sent to the email address on file and will describe what happened, what information was involved, what we are doing, and what you can do to protect yourself.</li>
          <li>If the breach affects 500 or more individuals in a state, we will also notify prominent media outlets in that state and the U.S. Department of Health and Human Services.</li>
        </ul>
        <p>To report a suspected security issue, contact us at security@arttherapy.dev.</p>
      </>
    ),
  },
  {
    id: 'minors',
    title: '8. Minors & Special Populations',
    content: (
      <>
        <p>ArtTherapy requires users to be at least 13 years of age. Users between 13 and 17 must have a parent or legal guardian provide consent for their account and therapy services.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>When a minor is in therapy, the therapist will discuss at the outset of treatment which information (if any) will be shared with the parent/guardian and what confidentiality protections apply.</li>
          <li>Generally, parents/guardians have the right to access a minor's health records, subject to state law and the therapist's clinical judgment.</li>
          <li>If a minor reaches the age of majority (typically 18), they acquire full control over their health information.</li>
        </ul>
        <p>We do not knowingly collect personal data from children under 13. If you believe we have inadvertently collected such data, please contact privacy@arttherapy.dev immediately.</p>
      </>
    ),
  },
  {
    id: 'contact',
    title: '9. Contact & Complaints',
    content: (
      <>
        <p><strong>Privacy Officer:</strong> ArtTherapy Privacy Team<br />Email: privacy@arttherapy.dev</p>
        <p><strong>Security concerns:</strong> security@arttherapy.dev</p>
        <p>If you believe your privacy rights have been violated, you have the right to file a complaint with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>U.S. Dept. of Health and Human Services — Office for Civil Rights (OCR):</strong>{' '}
            <a href="https://www.hhs.gov/ocr/complaints" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline inline-flex items-center gap-0.5">
              www.hhs.gov/ocr/complaints <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            <strong>Federal Trade Commission (FTC):</strong>{' '}
            <a href="https://reportfraud.ftc.gov" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline inline-flex items-center gap-0.5">
              reportfraud.ftc.gov <ExternalLink className="h-3 w-3" />
            </a>
          </li>
        </ul>
        <p className="text-stone-400 text-xs">Filing a complaint will not result in retaliation.</p>
      </>
    ),
  },
];

export function PrivacyTerms() {
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: isAuthenticated,
  });

  const consentMutation = useMutation({
    mutationFn: acceptPrivacy,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });

  return (
    <div className="min-h-screen bg-stone-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-50 mb-4">
            <Shield className="h-6 w-6 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900">Privacy Policy & Terms of Service</h1>
          <p className="text-stone-500 mt-2">Effective date: {EFFECTIVE_DATE}</p>
          <p className="text-stone-500 mt-1 text-sm">
            These terms govern the collection and use of your health information in accordance with HIPAA, APA ethical guidelines, and applicable telehealth law.
          </p>
        </div>

        {/* Consent banner */}
        {isAuthenticated && !profile?.privacyConsentAt && (
          <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-medium text-amber-900">You have not yet accepted these terms</p>
              <p className="text-sm text-amber-700 mt-0.5">Please review the policy below and accept to unlock all features.</p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              loading={consentMutation.isPending}
              onClick={() => consentMutation.mutate()}
            >
              Accept Terms
            </Button>
          </div>
        )}

        {isAuthenticated && profile?.privacyConsentAt && (
          <div className="mb-8 rounded-xl bg-teal-50 border border-teal-200 p-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-teal-600 shrink-0" />
            <p className="text-sm text-teal-800">
              You accepted these terms on{' '}
              <strong>{new Date(profile.privacyConsentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
              You can review or update your consent in your{' '}
              <Link to="/profile" className="underline">account settings</Link>.
            </p>
          </div>
        )}

        {/* Legal disclaimer */}
        <div className="mb-6 rounded-lg bg-stone-100 border border-stone-200 p-4 text-xs text-stone-500">
          <p><strong>Important:</strong> This policy provides legal information, not legal advice. It is based on HIPAA (45 CFR Parts 160 &amp; 164), the APA Ethics Code (2017), the APA Guidelines on Telepsychology (2013), HITECH, PCI DSS, and U.S. federal and state telehealth regulations. For specific legal advice regarding your situation, consult a licensed healthcare attorney. Therapists practicing on this platform must comply with their respective state licensing board requirements.</p>
        </div>

        {/* Sections */}
        <Accordion sections={sections} />

        {/* Footer accept */}
        {isAuthenticated && !profile?.privacyConsentAt && (
          <div className="mt-8 text-center">
            <p className="text-sm text-stone-500 mb-4">By clicking below you confirm you have read and understood these terms.</p>
            <Button
              loading={consentMutation.isPending}
              onClick={() => consentMutation.mutate()}
            >
              I Accept the Privacy Policy & Terms
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
