import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.post('/users/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (user) setUser({ ...user, avatarUrl: res.data.avatarUrl });
      setMsg('Avatar actualizado ✓');
    } catch {
      setMsg('Error al subir avatar');
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6 pt-4">
        <button onClick={() => navigate('/dashboard')} className="text-white/50">←</button>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
      </div>

      <div className="card mb-4 text-center">
        <div
          className="w-24 h-24 rounded-full mx-auto mb-3 bg-primary-600 flex items-center justify-center text-4xl border-4 border-primary-400 cursor-pointer overflow-hidden"
          onClick={() => fileRef.current?.click()}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : '👤'}
        </div>
        <h2 className="text-xl font-bold mb-1">{user?.username}</h2>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-sm px-4 py-1"
        >
          {uploading ? 'Subiendo...' : '📷 Cambiar Avatar'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        {msg && <p className="text-green-400 text-sm mt-2">{msg}</p>}
      </div>

      {user?.stats && (
        <div className="card">
          <h3 className="font-bold mb-4">Estadísticas</h3>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Partidas jugadas" value={user.stats.gamesPlayed} color="text-blue-400" />
            <Stat label="Victorias" value={user.stats.gamesWon} color="text-green-400" />
            <Stat label="Bancarrotas" value={user.stats.bankruptcies} color="text-red-400" />
            <Stat label="Propiedades" value={user.stats.propertiesBought} color="text-game-gold" />
          </div>
          {user.stats.favoriteCharacter && (
            <div className="mt-3 p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/50">Personaje favorito</p>
              <p className="font-semibold">{user.stats.favoriteCharacter}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
    </div>
  );
}
