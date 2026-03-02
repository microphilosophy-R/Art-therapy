import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ExternalLink, Pencil, ShoppingBag, Globe, Briefcase, Calendar } from 'lucide-react';
import { getMyArtistProfile, getArtistProducts } from '../../../api/artist';
import { listTherapyPlans } from '../../../api/therapyPlans';
import { getTherapist } from '../../../api/therapists';
import { Button } from '../../../components/ui/Button';
import { PageLoader } from '../../../components/ui/Spinner';
import { useAuthStore } from '../../../store/authStore';
import { getPosterUrl } from '../../../utils/therapyPlanUtils';

interface ShowcaseTabProps {
    onEditProfile: () => void;
}

export const ShowcaseTab: React.FC<ShowcaseTabProps> = ({ onEditProfile }) => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const isArtist = !!user?.approvedCertificates?.includes('ARTIFICER');
    const isTherapist = !!user?.approvedCertificates?.includes('THERAPIST');

    const { data: artistProfile, isLoading: artistLoading } = useQuery({
        queryKey: ['artist-profile', 'me'],
        queryFn: getMyArtistProfile,
        enabled: isArtist,
    });

    const { data: therapistProfile, isLoading: therapistLoading } = useQuery({
        queryKey: ['therapist-profile', 'me'],
        queryFn: () => getTherapist(user?.id!),
        enabled: isTherapist && !!user?.id,
    });

    const artistProfileId = (artistProfile as any)?.id;
    const therapistProfileId = (therapistProfile as any)?.id;

    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ['artist-products', artistProfileId],
        queryFn: () => getArtistProducts(artistProfileId!),
        enabled: isArtist && !!artistProfileId,
    });

    const { data: plansResponse, isLoading: plansLoading } = useQuery({
        queryKey: ['therapy-plans', 'my-showcase'],
        queryFn: () => listTherapyPlans({ therapistId: therapistProfileId, status: 'PUBLISHED', limit: 5 }),
        enabled: isTherapist && !!therapistProfileId,
    });

    const plans = plansResponse?.data ?? [];

    if (artistLoading || therapistLoading) return <PageLoader />;

    const bio = isArtist ? (artistProfile as any)?.bio : (therapistProfile as any)?.bio;
    const portfolioUrl = isArtist ? (artistProfile as any)?.portfolioUrl : (therapistProfile as any)?.socialMediaLink;
    const profileId = isArtist ? artistProfileId : therapistProfileId;
    const liveLink = isArtist ? `/shop` : `/therapists/${profileId}`;

    return (
        <div className="max-w-4xl">
            {/* Showcase Bar (New Feature) */}
            <div className="mb-8 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
                        {isArtist ? t('shop.artist.showcase.products') : t('shop.artist.showcase.plans')}
                    </h3>
                    <div className="flex gap-3">
                        <Link to={isArtist ? "/shop" : "/therapists"}>
                            <Button size="sm" variant="ghost" className="text-teal-600 hover:text-teal-700">
                                {isArtist ? t('shop.artist.showcase.shopLink') : t('shop.artist.showcase.therapistLink')}
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                    {isArtist && products?.slice(0, 5).map(product => (
                        <Link key={product.id} to={`/shop/${product.id}`} className="min-w-[150px] w-40 shrink-0 group">
                            <div className="aspect-square bg-stone-100 rounded-xl overflow-hidden mb-2">
                                {product.images[0] ? (
                                    <img src={product.images[0].url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                                        <ShoppingBag className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                            <p className="text-xs font-semibold text-stone-900 truncate">{product.title}</p>
                            <p className="text-xs text-teal-600">¥{Number(product.price).toFixed(2)}</p>
                        </Link>
                    ))}

                    {isTherapist && plans.map(plan => (
                        <Link key={plan.id} to={`/therapy-plans/${plan.id}`} className="min-w-[200px] w-52 shrink-0 group">
                            <div className="aspect-[16/9] bg-stone-100 rounded-xl overflow-hidden mb-2 relative">
                                <img src={getPosterUrl(plan)} alt={plan.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                            </div>
                            <p className="text-xs font-semibold text-stone-900 truncate">{plan.title}</p>
                            <p className="text-[10px] text-stone-500">{new Date(plan.startTime).toLocaleDateString()}</p>
                        </Link>
                    ))}

                    {((isArtist && (!products || products.length === 0)) || (isTherapist && plans.length === 0)) && (
                        <div className="w-full flex flex-col items-center justify-center py-10 bg-stone-50 border-2 border-dashed border-stone-200 rounded-xl text-stone-400">
                            {isArtist ? <ShoppingBag className="w-8 h-8 mb-2 opacity-50" /> : <Calendar className="w-8 h-8 mb-2 opacity-50" />}
                            <p className="text-sm">{isArtist ? t('shop.artist.showcase.noProducts') : t('shop.artist.showcase.noPlans')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Preview banner */}
            <div className="flex items-center justify-between mb-6 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700">
                <span>{t('shop.artist.showcase.preview')}</span>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={onEditProfile}>
                        <Pencil className="w-4 h-4 mr-1.5" />
                        {t('shop.artist.showcase.editProfile')}
                    </Button>
                    {profileId && (
                        <Link to={liveLink} target="_blank" rel="noopener noreferrer">
                            <Button size="sm">
                                <ExternalLink className="w-4 h-4 mr-1.5" />
                                {t('shop.artist.showcase.viewLive')}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Profile header preview */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-2xl font-bold flex-shrink-0 overflow-hidden">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full object-cover" />
                        ) : (
                            user?.firstName?.charAt(0) ?? '?'
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-stone-900">
                                {user?.firstName} {user?.lastName}
                            </h2>
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                {user?.role}
                            </span>
                        </div>

                        {bio ? (
                            <p className="text-stone-600 mt-2 text-sm leading-relaxed whitespace-pre-line">
                                {bio}
                            </p>
                        ) : (
                            <p className="text-stone-400 mt-2 text-sm italic">No bio yet — add one in the Profile tab.</p>
                        )}

                        <div className="flex flex-wrap gap-4 mt-4">
                            {isArtist && (artistProfile as any)?.commissionStatus && (
                                <div className="flex items-center gap-1.5 text-sm text-stone-600">
                                    <Briefcase className="w-4 h-4 text-teal-600" />
                                    <span>{(artistProfile as any).commissionStatus}</span>
                                </div>
                            )}
                            {portfolioUrl && (
                                <a
                                    href={portfolioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:underline"
                                >
                                    <Globe className="w-4 h-4" />
                                    {t('shop.artist.showcase.portfolio')}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* User Privilege Bar */}
                <div className="mt-6 pt-6 border-t border-stone-100 flex items-center justify-between">
                    <p className="text-xs text-stone-500 font-medium">{t('shop.artist.showcase.privilege', 'Your Account Privileges')}</p>
                    <div className="flex gap-2">
                        <Link to="/shop">
                            <Button size="sm" variant="outline" className="text-[10px] h-7">
                                <ShoppingBag className="w-3 h-3 mr-1" />
                                {t('shop.artist.showcase.buySomething')}
                            </Button>
                        </Link>
                        <Link to="/therapists">
                            <Button size="sm" variant="outline" className="text-[10px] h-7">
                                <Calendar className="w-3 h-3 mr-1" />
                                {t('shop.artist.showcase.bookAppointment')}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Grid preview */}
            <div>
                <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">
                    {isArtist ? t('shop.artist.showcase.products') : t('shop.artist.showcase.plans')}
                </h3>

                {(productsLoading || plansLoading) ? (
                    <PageLoader />
                ) : (isArtist && (!products || products.length === 0)) || (isTherapist && plans.length === 0) ? (
                    <div className="border-2 border-dashed border-stone-200 rounded-xl py-14 text-center text-stone-400">
                        {isArtist ? <ShoppingBag className="w-10 h-10 mx-auto mb-3" /> : <Calendar className="w-10 h-10 mx-auto mb-3" />}
                        <p className="text-sm">{isArtist ? t('shop.artist.showcase.noProducts') : t('shop.artist.showcase.noPlans')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {isArtist && products?.map((product) => (
                            <Link
                                key={product.id}
                                to={`/shop/${product.id}`}
                                className="group border border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="aspect-square bg-stone-100 overflow-hidden">
                                    {product.images[0] ? (
                                        <img
                                            src={product.images[0].url}
                                            alt={product.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ShoppingBag className="w-8 h-8 text-stone-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-teal-600 font-medium mb-0.5">
                                        {t(`shop.categories.${product.category}`)}
                                    </p>
                                    <p className="text-sm font-semibold text-stone-900 line-clamp-1">{product.title}</p>
                                    <p className="text-sm font-bold text-stone-900 mt-1">¥{Number(product.price).toFixed(2)}</p>
                                    {product.stock === 0 && (
                                        <span className="text-xs text-red-500 font-medium">{t('shop.product.soldOut')}</span>
                                    )}
                                </div>
                            </Link>
                        ))}

                        {isTherapist && plans.map((plan) => (
                            <Link
                                key={plan.id}
                                to={`/therapy-plans/${plan.id}`}
                                className="group border border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="aspect-[16/9] bg-stone-100 overflow-hidden relative">
                                    <img
                                        src={getPosterUrl(plan)}
                                        alt={plan.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute top-2 left-2">
                                        <span className="px-1.5 py-0.5 rounded bg-white/90 backdrop-blur-sm text-[10px] font-bold text-teal-700 uppercase">
                                            {t(`common.planType.${plan.type}`)}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-sm font-semibold text-stone-900 line-clamp-1">{plan.title}</p>
                                    <p className="text-xs text-stone-500 mt-1">{new Date(plan.startTime).toLocaleDateString()}</p>
                                    {plan.price && (
                                        <p className="text-sm font-bold text-teal-600 mt-1">¥{Number(plan.price).toFixed(0)}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
