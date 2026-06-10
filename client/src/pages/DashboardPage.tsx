import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { connectSocket, disconnectSocket } from '../sockets/socketClient';
import { useEffect } from 'react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    connectSocket();
  }, []);

  const handleLogout = () => {
    disconnectSocket();          // fuerza un socket nuevo con el token del próximo login
    useGameStore.getState().reset();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-game text-game-gold">JUEGO DE VARONES</h1>
          <p className="text-white/50 text-sm">Bienvenido, {user?.username} 👋</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-sm">Salir</button>
      </div>

      {/* Stats */}
      {user?.stats && (
        <div className="card mb-6">
          <h2 className="font-bold mb-3 text-white/70">Tus Estadísticas</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-game-gold">{user.stats.gamesPlayed}</div>
              <div className="text-xs text-white/50">Partidas</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-400">{user.stats.gamesWon}</div>
              <div className="text-xs text-white/50">Victorias</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{user.stats.bankruptcies}</div>
              <div className="text-xs text-white/50">Bancarrotas</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{user.stats.propertiesBought}</div>
              <div className="text-xs text-white/50">Propiedades</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={() => navigate('/create-room')}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
        >
          🎮 Crear Sala
        </button>
        <button
          onClick={() => navigate('/join-room')}
          className="btn-secondary w-full py-4 text-lg flex items-center justify-center gap-2"
        >
          🔗 Unirse a Sala
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
        >
          👤 Mi Perfil
        </button>
      </div>

      <div className="mt-8 p-4 bg-white/5 rounded-xl">
        <h3 className="font-bold text-game-gold mb-2">¿Cómo jugar?</h3>
        <ul className="text-sm text-white/60 space-y-1">
          <li>1. Crea o únete a una sala (máx. 7 jugadores)</li>
          <li>2. Elige tu personaje</li>
          <li>3. Márcate como listo</li>
          <li>4. El host inicia la partida</li>
          <li>5. ¡Compra propiedades y destruye a los demás!</li>
        </ul>
      </div>
    </div>
  );
}
