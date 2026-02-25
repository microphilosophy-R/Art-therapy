import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptPrivacy, getProfile } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

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

export function PrivacyTerms() {
  const { t } = useTranslation();
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

  const sections: Section[] = [
    {
      id: 'hipaa',
      title: t('privacy.s1.title'),
      content: (
        <>
          <p className="font-semibold text-stone-800 bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs uppercase tracking-wide">
            {t('privacy.s1.header')}
          </p>
          <p>{t('privacy.s1.body1')}</p>
          <p>{t('privacy.s1.phi')}</p>
          <p><strong>{t('privacy.s1.permittedLabel')}</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{t('privacy.s1.permitted1Label')}</strong> {t('privacy.s1.permitted1')}</li>
            <li><strong>{t('privacy.s1.permitted2Label')}</strong> {t('privacy.s1.permitted2')}</li>
            <li><strong>{t('privacy.s1.permitted3Label')}</strong> {t('privacy.s1.permitted3')}</li>
          </ul>
          <p>{t('privacy.s1.authRequired')}</p>
          <p>{t('privacy.s1.psychotherapy')}</p>
        </>
      ),
    },
    {
      id: 'confidentiality',
      title: t('privacy.s2.title'),
      content: (
        <>
          <p>{t('privacy.s2.body1')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>{t('privacy.s2.item1Label')}</strong> {t('privacy.s2.item1')}</li>
            <li><strong>{t('privacy.s2.item2Label')}</strong> {t('privacy.s2.item2')}</li>
            <li><strong>{t('privacy.s2.item3Label')}</strong> {t('privacy.s2.item3')}</li>
            <li><strong>{t('privacy.s2.item4Label')}</strong> {t('privacy.s2.item4')}</li>
            <li><strong>{t('privacy.s2.item5Label')}</strong> {t('privacy.s2.item5')}</li>
          </ul>
          <p className="text-stone-500 text-xs">{t('privacy.s2.note')}</p>
        </>
      ),
    },
    {
      id: 'consent',
      title: t('privacy.s3.title'),
      content: (
        <>
          <p>{t('privacy.s3.body1')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('privacy.s3.item1')}</li>
            <li>{t('privacy.s3.item2')}</li>
            <li>{t('privacy.s3.item3')}</li>
            <li>{t('privacy.s3.item4')}</li>
            <li>{t('privacy.s3.item5')}</li>
          </ul>
          <p>{t('privacy.s3.body2')}</p>
        </>
      ),
    },
    {
      id: 'telehealth',
      title: t('privacy.s4.title'),
      content: (
        <>
          <p>{t('privacy.s4.body1')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>{t('privacy.s4.item1Label')}</strong> {t('privacy.s4.item1')}</li>
            <li><strong>{t('privacy.s4.item2Label')}</strong> {t('privacy.s4.item2')}</li>
            <li><strong>{t('privacy.s4.item3Label')}</strong> {t('privacy.s4.item3')}</li>
            <li><strong>{t('privacy.s4.item4Label')}</strong> {t('privacy.s4.item4')}</li>
            <li><strong>{t('privacy.s4.item5Label')}</strong> {t('privacy.s4.item5')}</li>
            <li><strong>{t('privacy.s4.item6Label')}</strong> {t('privacy.s4.item6')}</li>
          </ul>
        </>
      ),
    },
    {
      id: 'data',
      title: t('privacy.s5.title'),
      content: (
        <>
          <p><strong>{t('privacy.s5.collectLabel')}</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacy.s5.collect1')}</li>
            <li>{t('privacy.s5.collect2')}</li>
            <li>{t('privacy.s5.collect3')}</li>
            <li>{t('privacy.s5.collect4')}</li>
            <li>{t('privacy.s5.collect5')}</li>
            <li>{t('privacy.s5.collect6')}</li>
          </ul>
          <p><strong>{t('privacy.s5.rightsLabel')}</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{t('privacy.s5.right1Label')}</strong> {t('privacy.s5.right1')}</li>
            <li><strong>{t('privacy.s5.right2Label')}</strong> {t('privacy.s5.right2')}</li>
            <li><strong>{t('privacy.s5.right3Label')}</strong> {t('privacy.s5.right3')}</li>
            <li><strong>{t('privacy.s5.right4Label')}</strong> {t('privacy.s5.right4')}</li>
            <li><strong>{t('privacy.s5.right5Label')}</strong> {t('privacy.s5.right5')}</li>
            <li><strong>{t('privacy.s5.right6Label')}</strong> {t('privacy.s5.right6')}</li>
          </ul>
          <p>{t('privacy.s5.retention')}</p>
          <p>{t('privacy.s5.contact')}</p>
        </>
      ),
    },
    {
      id: 'payment-privacy',
      title: t('privacy.s6.title'),
      content: (
        <>
          <p>{t('privacy.s6.body1')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('privacy.s6.item1')}</li>
            <li>{t('privacy.s6.item2')} <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline inline-flex items-center gap-0.5">stripe.com/privacy <ExternalLink className="h-3 w-3" /></a>.</li>
            <li>{t('privacy.s6.item3')}</li>
            <li>{t('privacy.s6.item4')}</li>
            <li>{t('privacy.s6.item5')}</li>
          </ul>
        </>
      ),
    },
    {
      id: 'breach',
      title: t('privacy.s7.title'),
      content: (
        <>
          <p>{t('privacy.s7.body1')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacy.s7.item1')}</li>
            <li>{t('privacy.s7.item2')}</li>
            <li>{t('privacy.s7.item3')}</li>
          </ul>
          <p>{t('privacy.s7.contact')}</p>
        </>
      ),
    },
    {
      id: 'minors',
      title: t('privacy.s8.title'),
      content: (
        <>
          <p>{t('privacy.s8.body1')}</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t('privacy.s8.item1')}</li>
            <li>{t('privacy.s8.item2')}</li>
            <li>{t('privacy.s8.item3')}</li>
          </ul>
          <p>{t('privacy.s8.body2')}</p>
        </>
      ),
    },
    {
      id: 'contact',
      title: t('privacy.s9.title'),
      content: (
        <>
          <p><strong>{t('privacy.s9.privacyOfficerLabel')}</strong> {t('privacy.s9.privacyOfficer')}<br />{t('privacy.s9.privacyEmail')}</p>
          <p><strong>{t('privacy.s9.securityLabel')}</strong> {t('privacy.s9.securityEmail')}</p>
          <p>{t('privacy.s9.complaintIntro')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>{t('privacy.s9.ocrLabel')}</strong>{' '}
              <a href="https://www.hhs.gov/ocr/complaints" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline inline-flex items-center gap-0.5">
                www.hhs.gov/ocr/complaints <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <strong>{t('privacy.s9.ftcLabel')}</strong>{' '}
              <a href="https://reportfraud.ftc.gov" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline inline-flex items-center gap-0.5">
                reportfraud.ftc.gov <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
          <p className="text-stone-400 text-xs">{t('privacy.s9.noRetaliation')}</p>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-50 mb-4">
            <Shield className="h-6 w-6 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900">{t('privacy.title')}</h1>
          <p className="text-stone-500 mt-2">{t('privacy.effectiveDate')}</p>
          <p className="text-stone-500 mt-1 text-sm">
            {t('privacy.intro')}
          </p>
        </div>

        {/* Consent banner */}
        {isAuthenticated && !profile?.privacyConsentAt && (
          <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-medium text-amber-900">{t('privacy.notAccepted')}</p>
              <p className="text-sm text-amber-700 mt-0.5">{t('privacy.notAcceptedDesc')}</p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              loading={consentMutation.isPending}
              onClick={() => consentMutation.mutate()}
            >
              {t('privacy.acceptBtn')}
            </Button>
          </div>
        )}

        {isAuthenticated && profile?.privacyConsentAt && (
          <div className="mb-8 rounded-xl bg-teal-50 border border-teal-200 p-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-teal-600 shrink-0" />
            <p className="text-sm text-teal-800">
              {t('privacy.acceptedOn', {
                date: new Date(profile.privacyConsentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              })}{' '}
              {t('privacy.acceptedNote')}{' '}
              <Link to="/profile" className="underline">{t('privacy.acceptedSettingsLink')}</Link>.
            </p>
          </div>
        )}

        {/* Legal disclaimer */}
        <div className="mb-6 rounded-lg bg-stone-100 border border-stone-200 p-4 text-xs text-stone-500">
          <p><strong>{t('privacy.legalNoteLabel')}</strong> {t('privacy.legalNote')}</p>
        </div>

        {/* Sections */}
        <Accordion sections={sections} />

        {/* Footer accept */}
        {isAuthenticated && !profile?.privacyConsentAt && (
          <div className="mt-8 text-center">
            <p className="text-sm text-stone-500 mb-4">{t('privacy.consentLabel')}</p>
            <Button
              loading={consentMutation.isPending}
              onClick={() => consentMutation.mutate()}
            >
              {t('privacy.acceptFull')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
