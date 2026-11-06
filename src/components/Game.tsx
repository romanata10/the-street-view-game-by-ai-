import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CheckCheck, ChevronDown, Clock3, Copy, Crosshair, Crown,
  Expand, Eye, Flag, Globe2, Layers3, Lightbulb, Map as MapIcon, MapPin, Maximize2,
  Medal, Minimize2, MousePointer2, Navigation, Play, RotateCcw, ShieldCheck, ShoppingBag,
  Sparkles, Swords, Target, Trophy, Users, Video, X, Zap,
} from 'lucide-react';
import { BATTLE_LABELS, CITIES, SHOP_ITEMS, formatDistance, getCity, type ItemId } from '../../shared/data';
import type { PublicPlayer } from '../../shared/types';
import { viewsSharePlace } from '../../shared/presence';
import type { GameConnection } from '../hooks/useGameConnection';
import GuessMap from './GuessMap';
import PanoramaViewer from './PanoramaViewer';
import { SamePlaceBanner } from './Presence';
import ShopModal from './ShopModal';
import { Avatar, CoinBalance, ItemIcon, Logo, Modal } from './UI';

const QUICK_ITEMS: ItemId[] = ['hint', 'blackout', 'speed', 'shield', 'double'];

function GameHeader({ game, result = false }: { game: GameConnection; result?: boolean }) {
  const room = game.room!;
  const self = game.self!;
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(room.code); } catch { /* the code is selectable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <header className="game-header in-game-header">
      <Logo onClick={game.leave} />
      <div className="game-round-title"><span>{result ? 'ИТОГИ РАУНДА' : room.status === 'finished' ? 'МАТЧ ЗАВЕРШЁН' : BATTLE_LABELS[room.settings.battleMode].name.toUpperCase()}</span><b>{room.status === 'finished' ? 'Финальный результат' : <>Раунд {room.round} <em>/ {room.settings.rounds}</em></>}</b></div>
      <div className="game-header-right">
        <button className="room-code-chip" onClick={copyCode} title="Скопировать код комнаты"><span>КОМНАТА</span><b>{copied ? 'СКОПИРОВАНО' : room.code}</b>{copied ? <Check size={13} /> : <Copy size={13} />}</button>
        <CoinBalance value={self.coins} />
        <button className="icon-button leave-game-button" onClick={game.leave} title="Выйти из матчa"><X size={19} /></button>
      </div>
    </header>
  );
}

function PlayerStrip({ players, self }: { players: PublicPlayer[]; self: PublicPlayer }) {
  return (
    <div className="game-player-strip">
      {players.map((player) => {
        const together = player.id !== self.id && viewsSharePlace(self.view, player.view);
        return (
          <div className={`game-player-chip ${player.guess ? 'has-guessed' : ''} ${together ? 'is-nearby' : ''}`} key={player.id} style={{ '--player-color': player.color } as React.CSSProperties}>
            <Avatar player={player} size="small" showStatus />
            <div><b>{player.name}{player.id === self.id ? ' · ты' : ''}</b><span>{player.guess ? <><Check size={10} /> Ответ готов</> : together ? <><MapPin size={10} /> Рядом с тобой</> : 'Осматривается'}</span></div>
            <strong>{player.score.toLocaleString('ru-RU')}</strong>
          </div>
        );
      })}
    </div>
  );
}

function RoundTimer({ room, offset, now }: { room: GameConnection['room']; offset: number; now: number }) {
  if (!room?.roundEndsAt) return <div className="round-timer no-limit"><Clock3 size={17} /><span>Без лимита</span></div>;
  const seconds = Math.max(0, Math.ceil((room.roundEndsAt - now - offset) / 1000));
  const total = room.settings.timeLimit || 120;
  const urgent = seconds <= 15;
  return (
    <div className={`round-timer ${urgent ? 'urgent' : ''}`} style={{ '--timer-progress': `${Math.max(0, Math.min(100, seconds / total * 100))}%` } as React.CSSProperties}>
      <Clock3 size={18} /><b>{Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}</b><span>{urgent ? 'Торопись!' : 'До конца раунда'}</span>
    </div>
  );
}

export default function Game({ game }: { game: GameConnection }) {
  const room = game.room!;
  const self = game.self!;
  const location = room.currentLocation!;
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const selectedCities = useMemo(() => room.settings.cityIds.map(getCity), [room.settings.cityIds]);
  const singleCity = selectedCities.length === 1 ? selectedCities[0] : null;
  const mapCenter: [number, number] = singleCity ? singleCity.center : [28, 15];
  const mapZoom = singleCity ? Math.max(10, singleCity.zoom - 1) : 1;
  const blackoutLeft = Math.max(0, self.effects.blackoutUntil - now - game.serverOffset);
  const speedLeft = Math.max(0, self.effects.speedUntil - now - game.serverOffset);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setGuess(null);
    setMapExpanded(false);
    setTargetOpen(false);
  }, [room.round]);

  useEffect(() => {
    if (self.guess) setGuess(self.guess);
  }, [self.guess?.lat, self.guess?.lng]);

  const useItem = (item: ItemId) => {
    if (item === 'blackout') setTargetOpen(true);
    else game.actions.useItem(item);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target instanceof HTMLElement && event.target.matches('input, textarea')) || room.status !== 'playing') return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < QUICK_ITEMS.length) useItem(QUICK_ITEMS[index]);
      if (event.key === 'Enter' && guess && !self.guess) game.actions.guess(guess);
      if (event.key.toLowerCase() === 'm') setMapExpanded((value) => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guess, self.guess, room.status, room.players]);

  if (room.status === 'finished') return <FinishedGame game={game} />;

  if (room.status === 'roundResult') {
    const answered = room.players.filter((player) => player.distance !== null);
    const winner = [...answered].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0];
    const actualCity = getCity(location.cityId);
    const sorted = [...room.players].sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    return (
      <div className="game-page result-page">
        <GameHeader game={game} result />
        <main className="result-main">
          <section className="result-map-section">
            <div className="result-map-heading">
              <div><span className="eyebrow"><CheckCheck size={14} /> ТОЧКА НАЙДЕНА</span><h1>{winner?.id === self.id ? 'Блестящий раунд!' : winner ? `Ближе всех: ${winner.name}` : 'Раунд завершён'}</h1><p>Правильный ответ и все ваши предположения — на карте.</p></div>
              <div className="actual-place-card"><img src={actualCity.image} alt={actualCity.name} /><span><small>ПРАВИЛЬНЫЙ ОТВЕТ</small><b>{actualCity.flag} {actualCity.name}</b><em>{location.name} · {actualCity.country}</em></span></div>
            </div>
            <div className="result-map-wrap">
              <GuessMap center={mapCenter} zoom={mapZoom} guess={self.guess} players={room.players} selfId={self.id} actual={location} reveal disabled expanded />
              <div className="map-legend"><span><i className="legend-actual" /> Правильное место</span><span><i className="legend-guess" /> Твой ответ</span><span><i className="legend-friends" /> Друзья</span></div>
            </div>
          </section>
          <aside className="result-sidebar">
            <div className="round-dots">{Array.from({ length: room.settings.rounds }, (_, index) => <i key={index} className={index + 1 < room.round ? 'done' : index + 1 === room.round ? 'current' : ''}>{index + 1 < room.round ? <Check size={10} /> : index + 1}</i>)}</div>
            <div className="result-own-card" style={{ '--player-color': self.color } as React.CSSProperties}>
              <span>ТВОЙ РЕЗУЛЬТАТ</span>
              <div><strong>+{self.roundScore.toLocaleString('ru-RU')}</strong><small>очков</small><em><CoinBalance value={self.coinsEarned} /></em></div>
              <p><Navigation size={15} /> Ты был в <b>{formatDistance(self.distance)}</b> от точки</p>
              {self.effects.doubleActive && <span className="result-double"><Sparkles size={13} /> Риск-раунд: очки удвоены</span>}
            </div>
            <div className="result-leaderboard">
              <div className="result-table-heading"><h2>Результаты раунда</h2><span>{room.players.filter((player) => player.guess).length}/{room.players.length} ответов</span></div>
              {sorted.map((player, index) => (
                <div className={`result-player-row ${index === 0 && player.distance !== null ? 'winner' : ''} ${player.id === self.id ? 'self' : ''}`} key={player.id} style={{ '--player-color': player.color } as React.CSSProperties}>
                  <span className="result-rank">{index === 0 && player.distance !== null ? <Crown size={17} /> : index + 1}</span>
                  <Avatar player={player} size="small" />
                  <div><b>{player.name}{player.id === self.id ? ' · ты' : ''}</b><span>{formatDistance(player.distance)}</span></div>
                  <strong>+{player.roundScore.toLocaleString('ru-RU')}<small>{player.score.toLocaleString('ru-RU')} всего</small></strong>
                </div>
              ))}
            </div>
            {self.isHost ? <button className="primary-button next-round-button" onClick={game.actions.nextRound}>{room.round >= room.settings.rounds ? <><Trophy size={18} /> К итогам матча</> : <><Play size={17} fill="currentColor" /> Следующий раунд</>}<ArrowRight size={18} /></button> : <div className="waiting-host"><span className="spinner" /> Ждём, когда хост продолжит игру</div>}
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="game-page playing-page">
      <GameHeader game={game} />
      <div className="panorama-stage">
        <PanoramaViewer location={location} players={room.players} selfId={self.id} optics={self.inventory.optics > 0} speedActive={speedLeft > 0} onView={game.actions.view} />
        <div className="game-top-overlay">
          <div className="location-status-card">
            <span className="location-status-icon">{location.provider === 'street' ? <Video size={19} /> : <MapPin size={19} />}</span>
            <div><small>{location.provider === 'street' ? 'УЛИЧНЫЙ РЕЖИМ' : 'ТОЧКА ПАНОРАМЫ'}</small><b>{singleCity ? `${singleCity.flag} ${singleCity.name}` : <><Eye size={13} /> Локация неизвестна</>}</b></div>
            <span className="panorama-quality">360°</span>
          </div>
          <RoundTimer room={room} offset={game.serverOffset} now={now} />
          <PlayerStrip players={room.players} self={self} />
        </div>
        <SamePlaceBanner players={room.players} self={self} />

        <div className="gadget-rail">
          <div className="gadget-rail-title"><Zap size={14} /><span>ГАДЖЕТЫ</span></div>
          {QUICK_ITEMS.map((itemId, index) => {
            const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId)!;
            const active = itemId === 'shield' ? self.effects.shieldActive : itemId === 'double' ? self.effects.doubleActive : itemId === 'speed' ? speedLeft > 0 : itemId === 'hint' ? Boolean(self.hint) : false;
            return <button key={itemId} className={`gadget-button gadget-${item.category} gadget-${itemId} ${active ? 'active' : ''}`} onClick={() => useItem(itemId)} disabled={self.inventory[itemId] <= 0 && !active} title={`${item.name} — клавиша ${index + 1}`}><span><ItemIcon id={itemId} /></span><b>{self.inventory[itemId]}</b><small>{index + 1}</small><em>{item.name}</em></button>;
          })}
          <button className="gadget-button gadget-shop" onClick={() => setShopOpen(true)} title="Открыть магазин"><span><ShoppingBag size={20} /></span><em>Магазин</em></button>
        </div>

        <div className="active-effects">
          {self.hint && <div className="hint-card"><span><Lightbulb size={18} /></span><div><b>ГЕО-ПОДСКАЗКА</b><p>{self.hint}</p></div></div>}
          {speedLeft > 0 && <span className="effect-chip speed"><Zap size={14} /> Турбо-шаг · {Math.ceil(speedLeft / 1000)} сек</span>}
          {self.effects.shieldActive && <span className="effect-chip shield"><ShieldCheck size={14} /> Щит активен</span>}
          {self.effects.doubleActive && <span className="effect-chip double"><Sparkles size={14} /> Очки ×2</span>}
        </div>

        <div className="reaction-bar"><span>Реакция:</span>{['🔥', '😮', '👍', '😂'].map((emoji) => <button key={emoji} onClick={() => game.actions.reaction(emoji)}>{emoji}</button>)}</div>

        <div className={`guess-dock ${mapExpanded ? 'expanded' : ''} ${self.guess ? 'submitted' : ''}`}>
          <div className="guess-dock-heading"><div><MapIcon size={16} /><b>{self.guess ? 'ОТВЕТ ОТПРАВЛЕН' : 'ГДЕ ТЫ НАХОДИШЬСЯ?'}</b></div><button onClick={() => setMapExpanded(!mapExpanded)} title="Развернуть карту (M)">{mapExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button></div>
          <div className="guess-map-wrap">
            <GuessMap center={mapCenter} zoom={mapZoom} guess={guess} onGuess={setGuess} onCursor={game.actions.mapCursor} players={room.players} selfId={self.id} disabled={Boolean(self.guess)} expanded={mapExpanded} />
            {!guess && !self.guess && <div className="map-click-hint"><MousePointer2 size={14} /> Кликни, чтобы поставить точку</div>}
          </div>
          <div className="guess-dock-footer">
            {self.guess ? <div className="answer-waiting"><span className="spinner" /><div><b>Точка принята!</b><small>Ждём ответы · {room.players.filter((player) => player.guess).length}/{room.players.length} готовы</small></div></div> : <><div className="guess-coordinates"><span>{guess ? 'Точка выбрана' : 'Ответ пока не выбран'}</span><small>{guess ? `${guess.lat.toFixed(3)}°, ${guess.lng.toFixed(3)}°` : 'Можно менять до отправки'}</small></div><button className="primary-button submit-guess" disabled={!guess} onClick={() => guess && game.actions.guess(guess)}><Flag size={17} /><span>Это здесь!</span><kbd>↵</kbd></button></>}
          </div>
        </div>

        {blackoutLeft > 0 && <div className="blackout-overlay"><div className="blackout-static" /><div className="blackout-content"><span><Zap size={30} /></span><small>ТЕБЯ АТАКОВАЛИ</small><h2>Чёрный экран</h2><p>Панорама вернётся через</p><b>{(blackoutLeft / 1000).toFixed(1)}</b><em>секунды</em><div className="blackout-progress"><i style={{ width: `${blackoutLeft / 5000 * 100}%` }} /></div></div></div>}
      </div>

      {shopOpen && <ShopModal inGame profile={{ coins: self.coins, inventory: self.inventory }} onBuy={game.actions.buyItem} onClose={() => setShopOpen(false)} />}
      {targetOpen && <Modal onClose={() => setTargetOpen(false)} className="target-modal" label="Выбрать соперника"><span className="modal-symbol attack"><Zap size={26} /></span><span className="eyebrow">ЧЁРНЫЙ ЭКРАН · 5 СЕКУНД</span><h2>Кому устроить blackout?</h2><p>Выбери соперника. Если у него активен Анти-лаг, атака будет заблокирована.</p><div className="target-list">{room.players.filter((player) => player.id !== self.id && (player.connected || player.isBot)).map((player) => <button key={player.id} onClick={() => { game.actions.useItem('blackout', player.id); setTargetOpen(false); }}><Avatar player={player} /><span><b>{player.name}</b><small>{player.effects.shieldActive ? <><ShieldCheck size={12} /> Есть активный щит</> : `${player.score.toLocaleString('ru-RU')} очков`}</small></span><Target size={18} /></button>)}{room.players.length < 2 && <div className="no-targets">Пока некого атаковать. Дождись друга в комнате.</div>}</div></Modal>}
    </div>
  );
}

function FinishedGame({ game }: { game: GameConnection }) {
  const room = game.room!;
  const self = game.self!;
  const [shopOpen, setShopOpen] = useState(false);
  const ranked = [...room.players].sort((a, b) => room.settings.battleMode === 'closest' ? b.roundWins - a.roundWins || b.score - a.score : b.score - a.score);
  const winner = ranked[0];
  const podium = ranked.slice(0, 3);
  return (
    <div className="game-page finished-page">
      <GameHeader game={game} />
      <div className="finished-confetti">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ left: `${(index * 41) % 100}%`, animationDuration: `${5 + index % 5}s`, animationDelay: `${-(index % 7) * 0.7}s`, '--confetti-color': ['#c9f45b', '#75d7ff', '#ff8f7d', '#c6a5ff'][index % 4] } as React.CSSProperties} />)}</div>
      <main className="finished-main">
        <section className="winner-heading"><span className="trophy-emblem"><Trophy size={42} /></span><span className="eyebrow">МАТЧ ЗАВЕРШЁН · {room.settings.rounds} РАУНДОВ</span><h1>{winner.id === self.id ? <>География — твоя<br />суперсила!</> : `${winner.name} забирает матч!`}</h1><p>{winner.id === self.id ? 'Точный глаз, холодная голова и немного удачи. Заслуженная победа.' : 'Хорошая игра! Ещё один маршрут — и реванш может быть твоим.'}</p></section>
        <section className="podium">
          {podium.map((player, index) => {
            const place = index + 1;
            return <div className={`podium-player place-${place}`} key={player.id} style={{ '--player-color': player.color } as React.CSSProperties}><span className="podium-place">{place === 1 ? <Crown size={22} /> : <Medal size={20} />}{place}</span><Avatar player={player} size="large" /><h3>{player.name}{player.id === self.id && <small>это ты</small>}</h3><strong>{room.settings.battleMode === 'closest' ? player.roundWins : player.score.toLocaleString('ru-RU')}<em>{room.settings.battleMode === 'closest' ? 'побед' : 'очков'}</em></strong><div className="podium-base"><span>{player.roundWins} побед в раундах</span></div></div>;
          })}
        </section>
        <section className="final-stats panel-card"><div className="panel-heading"><div><Swords size={19} /><h2>Все игроки</h2></div><span>{room.settings.cityIds.length === CITIES.length ? 'Маршрут: весь мир' : `Городов в маршруте: ${room.settings.cityIds.length}`}</span></div>{ranked.map((player, index) => <div className={`final-player-row ${player.id === self.id ? 'self' : ''}`} key={player.id}><span className="final-rank">{index + 1}</span><Avatar player={player} size="small" /><b>{player.name}</b><span>{player.roundWins} побед</span><strong>{player.score.toLocaleString('ru-RU')} <small>очков</small></strong>{player.id === winner.id && <Crown size={17} />}</div>)}</section>
        <div className="finished-actions">{self.isHost ? <button className="primary-button" onClick={game.actions.restart}><RotateCcw size={18} /> Сыграть реванш <ArrowRight size={18} /></button> : <div className="waiting-host"><span className="spinner" /> Хост может начать реванш</div>}<button className="secondary-button" onClick={() => setShopOpen(true)}><ShoppingBag size={17} /> Потратить монеты</button><button className="secondary-button" onClick={game.leave}><ArrowLeft size={17} /> В главное меню</button></div>
      </main>
      {shopOpen && <ShopModal profile={{ coins: self.coins, inventory: self.inventory }} onBuy={game.actions.buyItem} onClose={() => setShopOpen(false)} />}
    </div>
  );
}
