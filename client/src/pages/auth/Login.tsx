import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart } from 'lucide-react';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const from = (location.state as { from?: string })?.from ?? '/';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await login(data);
      setAuth(res.user, res.accessToken);
      const dashboard =
        res.user.role === 'THERAPIST' ? '/dashboard/therapist'
        : res.user.role === 'ADMIN'   ? '/dashboard/admin'
        : '/dashboard/client';
      navigate(from === '/' ? dashboard : from, { replace: true });
    } catch {
      setError('root', { message: 'Invalid email or password.' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-semibold text-stone-900 text-xl mb-2">
            <Heart className="h-5 w-5 text-teal-600 fill-teal-600" /> ArtTherapy
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Welcome back</h1>
          <p className="text-stone-500 mt-1 text-sm">Sign in to your account</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errors.root && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-600">
                  {errors.root.message}
                </div>
              )}
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                error={errors.password?.message}
              />
              <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-stone-500 mt-4">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-teal-600 hover:text-teal-700">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};
