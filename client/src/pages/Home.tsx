import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Heart, Shield, Clock, Star, Users } from 'lucide-react';
import { getTherapists } from '../api/therapists';
import { TherapistCard } from '../components/therapists/TherapistCard';
import { Button } from '../components/ui/Button';
import { PageLoader } from '../components/ui/Spinner';

const MOCK_TESTIMONIALS = [
  {
    name: 'Sarah M.',
    quote: 'Art therapy helped me process emotions I could not express in words. Life-changing.',
    rating: 5,
  },
  {
    name: 'James T.',
    quote: 'My therapist created a safe space where creativity became my path to healing.',
    rating: 5,
  },
  {
    name: 'Aisha K.',
    quote: 'Booking was so easy and the sessions have transformed my relationship with anxiety.',
    rating: 5,
  },
];

const HOW_IT_WORKS = [
  {
    icon: Users,
    title: 'Browse Therapists',
    desc: 'Explore certified art therapists filtered by specialty, location, and price.',
  },
  {
    icon: Clock,
    title: 'Book a Session',
    desc: 'Choose your preferred date, time, and format — video or in-person.',
  },
  {
    icon: Heart,
    title: 'Begin Healing',
    desc: 'Connect with your therapist and start your creative healing journey.',
  },
];

export const Home = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['therapists', 'featured'],
    queryFn: () => getTherapists({ limit: 3 }),
  });

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
              <Heart className="h-4 w-4 fill-current" /> Healing through creativity
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Find Your Art<br />
              <span className="text-teal-200">Therapy Journey</span>
            </h1>
            <p className="text-lg md:text-xl text-teal-100 mb-8 leading-relaxed">
              Connect with certified art therapists who guide healing through creative expression.
              Book sessions online or in person.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={() => navigate('/therapists')}
                className="bg-white text-teal-700 hover:bg-teal-50"
              >
                Find a Therapist <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => navigate('/register')}
                className="text-white border border-white/30 hover:bg-white/10"
              >
                Join as Therapist
              </Button>
            </div>
            <div className="flex items-center gap-6 mt-10 text-sm text-teal-200">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-current text-amber-300" /> 4.9 avg rating
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4" /> Verified therapists
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> 500+ sessions
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-stone-900">How It Works</h2>
            <p className="text-stone-500 mt-2">Your path to healing in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-teal-50 text-teal-600 mb-4">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-1">
                  Step {i + 1}
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
              <h2 className="text-3xl font-bold text-stone-900">Featured Therapists</h2>
              <p className="text-stone-500 mt-1">Highly rated professionals ready to help</p>
            </div>
            <Link
              to="/therapists"
              className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {isLoading ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(data?.data ?? []).map((t) => (
                <TherapistCard key={t.id} therapist={t} />
              ))}
              {(!data?.data || data.data.length === 0) && (
                <div className="col-span-3 text-center py-12 text-stone-400">
                  <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Therapists will appear here once the backend is connected.</p>
                  <Link
                    to="/therapists"
                    className="mt-2 inline-block text-sm text-teal-600 hover:underline"
                  >
                    Browse directory
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
            <h2 className="text-3xl font-bold text-stone-900">Stories of Healing</h2>
            <p className="text-stone-500 mt-1">What our clients say</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-xl bg-stone-50 border border-stone-100 p-6">
                <div className="flex mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-amber-400 fill-current" />
                  ))}
                </div>
                <p className="text-stone-700 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-sm font-medium text-stone-900">&mdash; {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 bg-teal-700">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Your Journey?</h2>
          <p className="text-teal-100 mb-8">
            Join hundreds of people who have found healing through art therapy.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/therapists')}
              className="bg-white text-teal-700 hover:bg-teal-50"
            >
              Find a Therapist
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => navigate('/register')}
              className="text-white border border-white/30 hover:bg-white/10"
            >
              Create Account
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
