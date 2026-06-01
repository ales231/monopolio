import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { useState } from 'react';

const schema = z.object({
  username: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setServerError('');
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setServerError(err.response?.data?.error ?? 'Error al iniciar sesión.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-game text-game-gold tracking-wider">JUEGO</h1>
          <h2 className="text-4xl font-game text-primary-500">DE VARONES</h2>
          <p className="text-white/50 mt-2">🎲 Multijugador Online</p>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-6">Iniciar Sesión</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input {...register('username')} placeholder="Username" className="input" autoComplete="username" />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <input {...register('password')} type="password" placeholder="Contraseña" className="input" autoComplete="current-password" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            {serverError && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg p-3">{serverError}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full text-lg py-3">
              {isSubmitting ? 'Entrando...' : 'Entrar al Juego 🎲'}
            </button>
          </form>
          <p className="text-center text-white/50 mt-4 text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
