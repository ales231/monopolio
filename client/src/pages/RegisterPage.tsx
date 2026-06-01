import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { useState } from 'react';

const schema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres').max(20).regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y _'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Las contraseñas no coinciden', path: ['confirm'] });
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setServerError('');
    try {
      const res = await api.post('/auth/register', { username: data.username, password: data.password });
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setServerError(err.response?.data?.error ?? 'Error al registrarse.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-game text-game-gold tracking-wider">JUEGO</h1>
          <h2 className="text-4xl font-game text-primary-500">DE VARONES</h2>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-6">Crear Cuenta</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <input {...register('username')} placeholder="Username" className="input" autoComplete="username" />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <input {...register('password')} type="password" placeholder="Contraseña" className="input" autoComplete="new-password" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <input {...register('confirm')} type="password" placeholder="Confirmar contraseña" className="input" autoComplete="new-password" />
              {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm.message}</p>}
            </div>
            {serverError && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg p-3">{serverError}</p>}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full text-lg py-3">
              {isSubmitting ? 'Creando cuenta...' : 'Unirme al Grupo 🎲'}
            </button>
          </form>
          <p className="text-center text-white/50 mt-4 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
