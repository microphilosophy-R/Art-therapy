import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import { register as registerApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Enter a valid email'),
  password:  z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

export const Register = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await registerApi(data);
      setAuth(res.user, res.accessToken);
      navigate('/dashboard/member');
    } catch {
      setError('root', { message: t('auth.register.registrationFailed') });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-semibold text-stone-900 text-xl mb-2">
            <Heart className="h-5 w-5 text-teal-600 fill-teal-600" /> ArtTherapy
          </div>
          <h1 className="text-2xl font-bold text-stone-900">{t('auth.register.title')}</h1>
          <p className="text-stone-500 mt-1 text-sm">{t('auth.register.subtitle')}</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errors.root && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-600">
                  {errors.root.message}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t('auth.register.firstName')}
                  autoComplete="given-name"
                  {...register('firstName')}
                  error={errors.firstName?.message}
                />
                <Input
                  label={t('auth.register.lastName')}
                  autoComplete="family-name"
                  {...register('lastName')}
                  error={errors.lastName?.message}
                />
              </div>
              <Input
                label={t('auth.register.email')}
                type="email"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />
              <Input
                label={t('auth.register.password')}
                type="password"
                autoComplete="new-password"
                hint={t('auth.register.passwordHint')}
                {...register('password')}
                error={errors.password?.message}
              />
              <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
                {t('auth.register.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-stone-500 mt-4">
          {t('auth.register.alreadyHave')}{' '}
          <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
            {t('auth.register.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
};
