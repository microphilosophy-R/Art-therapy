import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getMyCertificates, applyCertificate, UserCertificate, CertificateType } from '../../api/member';

const CERT_LABELS: Record<CertificateType, string> = {
  THERAPIST: 'Therapy Class Host',
  ARTIFICER: 'Artisan Seller',
  COUNSELOR: 'Mental Counselor',
};

const CERT_LINKS: Record<CertificateType, { label: string; to: string }> = {
  THERAPIST: { label: 'Create Therapy Plan', to: '/therapy-plans/create' },
  ARTIFICER: { label: 'Manage Products', to: '/dashboard/member' },
  COUNSELOR: { label: 'Consult Settings', to: '/profile' },
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  REVOKED: 'bg-stone-100 text-stone-500 border-stone-200',
};

export const MemberDashboard = () => {
  const { user } = useAuthStore();
  const [certs, setCerts] = useState<UserCertificate[]>([]);
  const [applying, setApplying] = useState<CertificateType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyCertificates().then(setCerts).catch(() => {});
  }, []);

  const certMap = Object.fromEntries(certs.map((c) => [c.type, c]));

  const handleApply = async (type: CertificateType) => {
    setApplying(type);
    setError(null);
    try {
      const cert = await applyCertificate(type);
      setCerts((prev) => [...prev.filter((c) => c.type !== type), cert]);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to apply');
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">
          Welcome, {user?.firstName}
        </h1>
        <p className="text-stone-500 mb-8 text-sm">
          Apply for certificates to unlock features.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {(Object.keys(CERT_LABELS) as CertificateType[]).map((type) => {
            const cert = certMap[type];
            const link = CERT_LINKS[type];
            return (
              <div key={type} className="bg-white rounded-xl border border-stone-200 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-900">{CERT_LABELS[type]}</p>
                  {cert ? (
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded border ${STATUS_STYLE[cert.status]}`}>
                      {cert.status}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400 mt-1 inline-block">Not applied</span>
                  )}
                  {cert?.rejectionReason && (
                    <p className="text-xs text-rose-500 mt-1">{cert.rejectionReason}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {cert?.status === 'APPROVED' && (
                    <Link to={link.to} className="text-sm px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700">
                      {link.label}
                    </Link>
                  )}
                  {(!cert || cert.status === 'REJECTED' || cert.status === 'REVOKED') && (
                    <button
                      onClick={() => handleApply(type)}
                      disabled={applying === type}
                      className="text-sm px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                    >
                      {applying === type ? 'Applying…' : 'Apply'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
