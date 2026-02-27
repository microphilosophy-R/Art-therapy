import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Heart, Shield, Clock, Star, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTherapists } from '../api/therapists';
import { listTherapyPlans } from '../api/therapyPlans';
import { TherapistCard } from '../components/therapists/TherapistCard';
import { TherapyPlanCard } from '../components/therapyPlans/TherapyPlanCard';
import { Button } from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

export const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: featuredPlans, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['therapy-plans', 'featured'],
    queryFn: () => listTherapyPlans({ limit: 4, timeFilter: 'upcoming' }),
  });

  const { data: salons, isLoading: isSalonsLoading } = useQuery({
    queryKey: ['therapy-plans', 'salons'],
    queryFn: () => listTherapyPlans({ type: 'ART_SALON', limit: 4, timeFilter: 'upcoming' }),
  });

  const { data: retreats, isLoading: isRetreatsLoading } = useQuery({
    queryKey: ['therapy-plans', 'retreats'],
    queryFn: () => listTherapyPlans({ type: 'WELLNESS_RETREAT', limit: 4, timeFilter: 'upcoming' }),
  });

  const { data: groups, isLoading: isGroupsLoading } = useQuery({
    queryKey: ['therapy-plans', 'groups'],
    queryFn: () => listTherapyPlans({ type: 'GROUP_CONSULT', limit: 4, timeFilter: 'upcoming' }),
  });

  const { data: therapists, isLoading: isTherapistsLoading } = useQuery({
    queryKey: ['therapists', 'featured'],
    queryFn: () => getTherapists({ limit: 4 }),
  });

  const { data: gallery, isLoading: isGalleryLoading } = useQuery({
    queryKey: ['therapy-plans', 'gallery'],
    queryFn: () => listTherapyPlans({ timeFilter: 'past', limit: 4 }),
  });

  const quotes = t('home.testimonials.quotes', { returnObjects: true }) as string[];
  const names = t('home.testimonials.names', { returnObjects: true }) as string[];

  const renderPlanSection = (
    title: string,
    subtitle: string,
    data: any[] | undefined,
    isLoading: boolean,
    emptyMessage: string,
    bgColor: string = "bg-white",
  ) => {
    const isEmpty = !data || data.length === 0;
    const paddingClass = isEmpty ? "py-8" : "py-20";

    return (
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className={`${paddingClass} ${bgColor}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-stone-900">{title}</h2>
              <p className="text-stone-500 mt-1">{subtitle}</p>
            </div>
            <Link
              to="/therapy-plans"
              className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              {t('home.viewAll', 'View all')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {isLoading ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(data ?? []).map((plan) => (
                <div key={plan.id}>
                  <TherapyPlanCard plan={plan} perspective="public" />
                </div>
              ))}
              {(!data || data.length === 0) && (
                <div className="col-span-full text-center py-12 text-stone-400">
                  <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>{emptyMessage}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.section>
    );
  };

  return (
    <div className="bg-stone-50">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 text-white"
      >
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
      </motion.section>

      {/* Featured Plans */}
      {renderPlanSection(
        t('home.sections.featuredPlans.title', 'Featured Plans'),
        t('home.sections.featuredPlans.subtitle', 'Discover our latest and most popular therapy plans.'),
        featuredPlans?.data,
        isFeaturedLoading,
        "No featured plans available at the moment.",
        "bg-stone-50"
      )}

      {/* Salons */}
      {renderPlanSection(
        t('home.sections.salons.title', 'Art Salons'),
        t('home.sections.salons.subtitle', 'Single-day open sessions focused on mindfulness and being present.'),
        salons?.data,
        isSalonsLoading,
        "No upcoming salons.",
        "bg-white"
      )}

      {/* Wellness Retreats */}
      {renderPlanSection(
        t('home.sections.retreats.title', 'Wellness Retreats'),
        t('home.sections.retreats.subtitle', 'Immersive multi-day experiences integrating art therapy and nature.'),
        retreats?.data,
        isRetreatsLoading,
        "No upcoming retreats.",
        "bg-stone-50"
      )}

      {/* Group Consultations */}
      {renderPlanSection(
        t('home.sections.groups.title', 'Group Consultations'),
        t('home.sections.groups.subtitle', 'Supportive small group sessions guided by licensed professionals.'),
        groups?.data,
        isGroupsLoading,
        "No upcoming group consults.",
        "bg-white"
      )}

      {/* Personal Consultations (Therapists) */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className={`bg-stone-50 ${(!therapists?.data || therapists.data?.length === 0) ? 'py-8' : 'py-20'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-stone-900">{t('home.sections.personal.title', 'Personal Consultations')}</h2>
              <p className="text-stone-500 mt-1">{t('home.sections.personal.subtitle', 'Connect 1-on-1 with our featured therapists.')}</p>
            </div>
            <Link
              to="/therapists"
              className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              {t('home.viewAllProviders', 'View all providers')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {isTherapistsLoading ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(therapists?.data ?? []).map((therapist) => (
                <TherapistCard key={therapist.id} therapist={therapist} />
              ))}
              {(!therapists?.data || therapists.data?.length === 0) && (
                <div className="col-span-full text-center py-12 text-stone-400">
                  <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>{t('home.featured.empty')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.section>

      {/* Gallery (Past Plans) */}
      {renderPlanSection(
        t('home.sections.gallery.title', 'Gallery'),
        t('home.sections.gallery.subtitle', 'View past successful salons and wellness retreats.'),
        gallery?.data,
        isGalleryLoading,
        "No past plans in the gallery yet.",
        "bg-white"
      )}

      {/* Testimonials */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="py-20 bg-white"
      >
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
      </motion.section>

      {/* CTA banner */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="py-20 bg-teal-700"
      >
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
      </motion.section>
    </div>
  );
};
