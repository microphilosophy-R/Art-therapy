import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Heart, Shield, Clock, Star, Users } from 'lucide-react';
import { getTherapists } from '../api/therapists';
import { TherapistCard } from '../components/therapists/TherapistCard';
import { Button } from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

const HOW_IT_WORKS_ICONS = [Users, Clock, Heart];

export const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['therapists', 'featured'],
    queryFn: () => getTherapists({ limit: 3 }),
  });

  const quotes = t('home.testimonials.quotes', { returnObjects: true }) as string[];
  const names = t('home.testimonials.names', { returnObjects: true }) as string[];

  const howItWorksSteps = [
    {
      icon: HOW_IT_WORKS_ICONS[0],
      title: t('home.howItWorks.browse.title'),
      desc: t('home.howItWorks.browse.desc'),
    },
    {
      icon: HOW_IT_WORKS_ICONS[1],
      title: t('home.howItWorks.book.title'),
      desc: t('home.howItWorks.book.desc'),
    },
    {
      icon: HOW_IT_WORKS_ICONS[2],
      title: t('home.howItWorks.heal.title'),
      desc: t('home.howItWorks.heal.desc'),
    },
  ];

  return (
    <div className="bg-stone-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-teal-300 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur">
              <Heart className="h-4 w-4 fill-current" /> {t('home.badge')}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {t('home.title')}<br />
              <span className="text-teal-200">{t('home.titleSpan')}</span>
            </h1>
            <p className="text-lg md:text-xl text-teal-100 mb-8 leading-relaxed">
              {t('home.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => navigate('/therapists')}
                className="bg-white text-teal-700 hover:bg-teal-50"
              >
                {t('home.cta')} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => navigate('/register')}
                className="text-white border border-white/30 hover:bg-white/10"
              >
                {t('home.joinAsTherapist')}
              </Button>
            </div>
            <div className="flex items-center gap-6 mt-10 text-sm text-teal-200">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-current text-amber-300" /> {t('home.stats.rating')}
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4" /> {t('home.stats.verified')}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {t('home.stats.sessions')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-stone-900">{t('home.howItWorks.title')}</h2>
            <p className="text-stone-500 mt-2">{t('home.howItWorks.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorksSteps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-teal-50 text-teal-600 mb-4">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">
                  {t('home.howItWorks.step', { n: i + 1 })}
                </div>
                <h3 className="text-lg font-semibold text-stone-900 mb-2">{step.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured therapists */}
      <section className="py-20 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-stone-900">{t('home.featured.title')}</h2>
              <p className="text-stone-500 mt-1">{t('home.featured.subtitle')}</p>
            </div>
            <Link
              to="/therapists"
              className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              {t('home.featured.viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {isLoading ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(data?.data ?? []).map((therapist) => (
                <TherapistCard key={therapist.id} therapist={therapist} />
              ))}
              {(!data?.data || data.data.length === 0) && (
                <div className="col-span-3 text-center py-12 text-stone-400">
                  <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>{t('home.featured.empty')}</p>
                  <Link
                    to="/therapists"
                    className="mt-2 inline-block text-sm text-teal-600 hover:underline"
                  >
                    {t('home.featured.browseDirectory')}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-stone-900">{t('home.testimonials.title')}</h2>
            <p className="text-stone-500 mt-1">{t('home.testimonials.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quotes.map((quote, i) => (
              <div key={i} className="rounded-xl bg-stone-50 border border-stone-100 p-6">
                <div className="flex mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-stone-700 text-sm leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
                <p className="text-sm font-medium text-stone-900">&mdash; {names[i]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 bg-teal-700">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t('home.ctaBanner.title')}</h2>
          <p className="text-teal-100 mb-8">
            {t('home.ctaBanner.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/therapists')}
              className="bg-white text-teal-700 hover:bg-teal-50"
            >
              {t('home.ctaBanner.findTherapist')}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate('/register')}
              className="text-white border border-white/30 hover:bg-white/10"
            >
              {t('home.ctaBanner.createAccount')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
