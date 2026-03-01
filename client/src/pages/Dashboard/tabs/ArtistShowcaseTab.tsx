import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ExternalLink, Pencil, ShoppingBag, Globe, Briefcase } from 'lucide-react';
import { getMyArtistProfile } from '../../../api/artist';
import { getArtistProducts } from '../../../api/artist';
import { Button } from '../../../components/ui/Button';
import { PageLoader } from '../../../components/ui/Spinner';
import { useAuthStore } from '../../../store/authStore';

interface ArtistShowcaseTabProps {
    onEditProfile: () => void;
}

export const ArtistShowcaseTab: React.FC<ArtistShowcaseTabProps> = ({ onEditProfile }) => {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['artist-profile', 'me'],
        queryFn: getMyArtistProfile,
    });

    const profileId = (profile as any)?.id;

    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ['artist-products', profileId],
        queryFn: () => getArtistProducts(profileId!),
        enabled: !!profileId,
    });

    if (profileLoading) return <PageLoader />;

    return (
        <div className="max-w-4xl">
            {/* Preview banner */}
            <div className="flex items-center justify-between mb-6 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700">
                <span>{t('shop.artist.showcase.preview')}</span>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={onEditProfile}>
                        <Pencil className="w-4 h-4 mr-1.5" />
                        {t('shop.artist.showcase.editProfile')}
                    </Button>
                    {profileId && (
                        <Link to={`/artists/${profileId}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm">
                                <ExternalLink className="w-4 h-4 mr-1.5" />
                                {t('shop.artist.showcase.viewLive')}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Artist header preview */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-2xl font-bold flex-shrink-0">
                        {user?.firstName?.charAt(0) ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-stone-900">
                            {user?.firstName} {user?.lastName}
                        </h2>

                        {(profile as any)?.bio ? (
                            <p className="text-stone-600 mt-2 text-sm leading-relaxed whitespace-pre-line">
                                {(profile as any).bio}
                            </p>
                        ) : (
                            <p className="text-stone-400 mt-2 text-sm italic">No bio yet — add one in the Profile tab.</p>
                        )}

                        <div className="flex flex-wrap gap-4 mt-4">
                            {(profile as any)?.commissionStatus && (
                                <div className="flex items-center gap-1.5 text-sm text-stone-600">
                                    <Briefcase className="w-4 h-4 text-teal-600" />
                                    <span>{(profile as any).commissionStatus}</span>
                                </div>
                            )}
                            {(profile as any)?.portfolioUrl && (
                                <a
                                    href={(profile as any).portfolioUrl}
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
            </div>

            {/* Products grid preview */}
            <div>
                <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">
                    {t('shop.artist.showcase.products')}
                </h3>

                {productsLoading ? (
                    <PageLoader />
                ) : !products || products.length === 0 ? (
                    <div className="border-2 border-dashed border-stone-200 rounded-xl py-14 text-center text-stone-400">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-3" />
                        <p className="text-sm">{t('shop.artist.showcase.noProducts')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {products.map((product) => (
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
                    </div>
                )}
            </div>
        </div>
    );
};
