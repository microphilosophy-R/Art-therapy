import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Clock, Video, Star, Shield, ChevronLeft, Calendar,
} from 'lucide-react';
import { getTherapist } from '../api/therapists';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { StarRating } from '../components/ui/StarRating';
import { PageLoader } from '../components/ui/Spinner';
import { formatPrice, getSpecialtyColor } from '../utils/formatters';
import { useAuthStore } from '../store/authStore';

export const TherapistProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'about' | 'reviews'>('about');

  const { data: therapist, isLoading } = useQuery({
    queryKey: ['therapist', id],
    queryFn: () => getTherapist(id!),
    enabled: !!id,
  });

  if (isLoading) return <PageLoader />;

  if (!therapist) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500">Therapist not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/therapists')}>
            Back to directory
          </Button>
        </div>
      </div>
    );
  }

  const { user, bio, specialties, sessionPrice, sessionLength, locationCity,
    rating, reviewCount, isAccepting, refundPolicy } = therapist;

  const handleBook = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/book/${id}` } });
    } else {
      navigate(`/book/${id}`);
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile header card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <Avatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    src={user.avatarUrl}
                    size="xl"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <h1 className="text-2xl font-bold text-stone-900">
                          {user.firstName} {user.lastName}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                          {rating !== undefined && (
                            <>
                              <StarRating rating={rating} />
                              <span className="text-sm text-stone-500">
                                {rating.toFixed(1)} ({reviewCount ?? 0} reviews)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {isAccepting ? (
                        <Badge variant="success">Accepting clients</Badge>
                      ) : (
                        <Badge variant="warning">Not accepting</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-stone-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" /> {locationCity}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" /> {sessionLength} min sessions
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Video className="h-4 w-4" /> Video available
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-teal-600" /> Verified therapist
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {specialties.map((s) => (
                        <span
                          key={s}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getSpecialtyColor(s)}`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <div className="border-b border-stone-200">
              <nav className="flex gap-6">
                {(['about', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'border-b-2 border-teal-600 text-teal-600'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === 'about' && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold text-stone-900 mb-3">About</h2>
                  <p className="text-stone-600 leading-relaxed text-sm">{bio}</p>

                  {refundPolicy && (
                    <div className="mt-6 p-4 rounded-lg bg-teal-50 border border-teal-100">
                      <h3 className="text-sm font-semibold text-teal-800 mb-1">
                        Cancellation Policy
                      </h3>
                      <p className="text-sm text-teal-700">{refundPolicy.policyDescription}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'reviews' && (
              <Card>
                <CardContent className="p-6">
                  {reviewCount && reviewCount > 0 ? (
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-4xl font-bold text-stone-900">
                        {rating?.toFixed(1)}
                      </span>
                      <div>
                        <StarRating rating={rating ?? 0} />
                        <p className="text-sm text-stone-500 mt-0.5">{reviewCount} reviews</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-stone-400">
                      <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No reviews yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column — booking card */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="text-center mb-5">
                  <span className="text-3xl font-bold text-stone-900">
                    {formatPrice(sessionPrice)}
                  </span>
                  <span className="text-stone-500 text-sm"> / session</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!isAccepting}
                  onClick={handleBook}
                >
                  <Calendar className="h-4 w-4" />
                  {isAccepting ? 'Book a Session' : 'Not Available'}
                </Button>

                {!isAuthenticated && isAccepting && (
                  <p className="text-xs text-center text-stone-400 mt-3">
                    You'll be asked to sign in before booking.
                  </p>
                )}

                <div className="mt-5 space-y-2 text-sm text-stone-500">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-teal-600 shrink-0" />
                    {sessionLength} minute session
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-teal-600 shrink-0" />
                    Video or in-person
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-teal-600 shrink-0" />
                    Secure Stripe payment
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
