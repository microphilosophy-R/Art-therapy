import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getTherapists } from '../api/therapists';
import { TherapistCard } from '../components/therapists/TherapistCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { PageLoader } from '../components/ui/Spinner';
import type { TherapistFilters } from '../types';

const SPECIALTIES = [
  'Anxiety', 'Depression', 'Trauma', 'Grief', 'PTSD',
  'Addiction', 'Relationships', 'Self-esteem', 'Children', 'Adolescents',
];

const SESSION_FORMATS = [
  { value: '', label: 'Any format' },
  { value: 'VIDEO', label: 'Video only' },
  { value: 'IN_PERSON', label: 'In-person only' },
];

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export const TherapistDirectory = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TherapistFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const queryFilters: TherapistFilters = {
    ...filters,
    search: search || undefined,
    specialties: selectedSpecialties.length ? selectedSpecialties : undefined,
    limit: 12,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['therapists', queryFilters],
    queryFn: () => getTherapists(queryFilters),
  });

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const clearFilters = () => {
    setFilters({});
    setSelectedSpecialties([]);
    setSearch('');
  };

  const hasFilters =
    search || selectedSpecialties.length || filters.medium || filters.sortBy;

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-semibold text-stone-900">{t('therapists.directory.title')}</h1>
          <p className="text-stone-500 mt-1">
            {t('therapists.directory.subtitle')}
          </p>

          {/* Search bar */}
          <div className="mt-6 flex gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder={t('therapists.directory.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t('therapists.directory.filters')}
              {hasFilters && (
                <span className="ml-1 h-2 w-2 rounded-full bg-teal-500" />
              )}
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('therapists.directory.clearAll')}
              </Button>
            )}
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Select
                  label={t('therapists.directory.sessionFormat')}
                  value={filters.medium ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      medium: (e.target.value as 'VIDEO' | 'IN_PERSON') || undefined,
                    }))
                  }
                  options={SESSION_FORMATS}
                />
                <Select
                  label={t('therapists.directory.sortBy')}
                  value={filters.sortBy ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, sortBy: e.target.value || undefined }))
                  }
                  options={SORT_OPTIONS}
                />
                <div>
                  <Input
                    label={t('therapists.directory.maxPrice')}
                    type="number"
                    min={0}
                    placeholder={t('therapists.directory.maxPricePlaceholder')}
                    value={filters.maxPrice ?? ''}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        maxPrice: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-600 uppercase tracking-wide mb-2">
                  {t('therapists.directory.specialties')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSpecialty(s)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedSpecialties.includes(s)
                          ? 'bg-teal-600 text-white'
                          : 'bg-white border border-stone-300 text-stone-600 hover:border-teal-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <PageLoader />
        ) : (
          <>
            <p className="text-sm text-stone-500 mb-6">
              {isFetching ? t('therapists.directory.updating') : t('therapists.directory.found', { count: data?.total ?? 0 })}
            </p>

            {data?.data && data.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.data.map((therapist) => (
                  <TherapistCard key={therapist.id} therapist={therapist} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Search className="h-12 w-12 mx-auto text-stone-300 mb-4" />
                <p className="text-stone-500 font-medium">{t('therapists.directory.noResults')}</p>
                <p className="text-stone-400 text-sm mt-1">
                  {t('therapists.directory.noResultsHint')}
                </p>
                {hasFilters && (
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    {t('therapists.directory.clearFilters')}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
