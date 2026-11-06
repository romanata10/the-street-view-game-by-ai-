import { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useGameConnection } from './hooks/useGameConnection';
import MainMenu from './components/MainMenu';
import Lobby from './components/Lobby';
import Game from './components/Game';
import WalkGame from './components/WalkGame';
import { Logo, Toast } from './components/UI';

export default function App() {
  const game = useGameConnection();
  const { room, self } = game;

  useEffect(() => {
    if (room?.code) history.replaceState({}, '', `${location.pathname}?room=${room.code}`);
  }, [room?.code]);

  return (
    <>
      {room && self ? (
        room.status === 'lobby' ? <Lobby game={game} /> : room.mode === 'walk' ? <WalkGame game={game} /> : <Game game={game} />
      ) : room ? (
        <div className="reconnect-screen"><Logo /><span className="spinner large" /><h1>Возвращаем тебя в комнату</h1><p>Синхронизируем игроков и текущий раунд…</p><button className="secondary-button" onClick={game.leave}>В главное меню</button></div>
      ) : <MainMenu game={game} />}
      <Toast toast={game.toast} />
      {game.error && <div className="global-error" role="alert"><AlertCircle size={19} /><span>{game.error}</span><button onClick={game.clearError} aria-label="Закрыть"><X size={16} /></button></div>}
    </>
  );
}
