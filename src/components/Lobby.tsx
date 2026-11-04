import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bot, Check, CheckCheck, Clock3, Copy, Crown, Globe2, Link2,
  MessageCircle, Play, Plus, Send, Settings2, ShoppingBag, Sparkles, Trophy, UserPlus, Users, Video,
} from 'lucide-react';
import { BATTLE_LABELS, CITIES, cityCountLabel, getCity, getCityLocations, pointCountLabel, type GameSettings } from '../../shared/data';
import type { GameConnection } from '../hooks/useGameConnection';
import ShopModal from './ShopModal';
import { Avatar, CoinBalance, Logo } from './UI';

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

export default function Lobby({ game }: { game: GameConnection }) {
  const room = game.room!;
  const self = game.self!;
  const isHost = self.id === room.hostId;
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [chatText, setChatText] = useState('');
  const [shopOpen, setShopOpen] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const allReady = room.players.every((player) => player.isHost || player.ready);
  const selectedCities = room.settings.cityIds.map(getCity);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.messages.length]);

  const copy = async (kind: 'code' | 'link') => {
    await copyText(kind === 'code' ? room.code : `${location.origin}${location.pathname}?room=${room.code}`);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const updateSettings = (patch: Partial<GameSettings>) => {
    if (isHost) game.actions.settings({ ...room.settings, ...patch });
  };

  const toggleCity = (id: string) => {
    if (!isHost) return;
    const selected = room.settings.cityIds.includes(id);
    if (selected && room.settings.cityIds.length === 1) return;
    updateSettings({ cityIds: selected ? room.settings.cityIds.filter((cityId) => cityId !== id) : [...room.settings.cityIds, id] });
  };

  const submitChat = (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatText.trim()) return;
    game.actions.chat(chatText);
    setChatText('');
  };

  return (
    <div className="lobby-page">
      <header className="game-header lobby-header">
        <Logo onClick={game.leave} />
        <div className="lobby-header-status"><span className={`connection-badge ${game.connected ? 'online' : ''}`}><i />{game.connected ? 'Сервер на связи' : 'Переподключение…'}</span><span className="header-divider" /><button className="header-shop-button" onClick={() => setShopOpen(true)}><ShoppingBag size={16} /> Магазин</button><CoinBalance value={self.coins} /></div>
        <button className="text-button" onClick={game.leave}><ArrowLeft size={16} /> Выйти</button>
      </header>

      <main className="lobby-main page-shell">
        <section className="lobby-title-row">
          <div><span className="eyebrow"><span className="live-dot" /> ЗАКРЫТАЯ КОМНАТА</span><h1>Собираем команду</h1><p>Пока друзья подключаются, проверь маршрут и правила матча.</p></div>
          <div className="invite-panel">
            <div><small>КОД ПРИГЛАШЕНИЯ</small><button onClick={() => copy('code')}>{room.code}<Copy size={17} /></button></div>
            <button className="copy-link-button" onClick={() => copy('link')}>{copied === 'link' ? <CheckCheck size={17} /> : <Link2 size={17} />}{copied === 'link' ? 'Ссылка скопирована' : 'Скопировать ссылку'}</button>
            {copied === 'code' && <span className="copied-float"><Check size={13} /> Код скопирован</span>}
          </div>
        </section>

        <div className="lobby-grid">
          <section className="lobby-players-panel panel-card">
            <div className="panel-heading"><div><Users size={19} /><h2>Игроки</h2><span>{room.players.length} / 8</span></div>{isHost && <button onClick={game.actions.addBot} disabled={room.players.length >= 8}><Bot size={16} /><Plus size={13} /> Добавить бота</button>}</div>
            <div className="lobby-player-list">
              {room.players.map((player, index) => (
                <div className={`lobby-player ${player.ready || player.isHost ? 'is-ready' : ''}`} key={player.id} style={{ '--player-color': player.color } as React.CSSProperties}>
                  <span className="player-index">0{index + 1}</span>
                  <Avatar player={player} size="large" showStatus />
                  <div className="lobby-player-name"><b>{player.name}{player.id === self.id && <em>это ты</em>}</b><span>{player.isBot ? 'Встроенный соперник' : player.connected ? 'В комнате' : 'Переподключается'}</span></div>
                  {player.isHost && <span className="host-badge"><Crown size={13} /> Хост</span>}
                  {player.isBot && <span className="bot-badge"><Bot size={13} /> Бот</span>}
                  <span className={`ready-state ${player.ready || player.isHost ? 'ready' : ''}`}>{player.ready || player.isHost ? <><Check size={14} /> Готов</> : 'Не готов'}</span>
                </div>
              ))}
              {room.players.length < 3 && <button className="empty-player-slot" onClick={() => copy('link')}><span><UserPlus size={20} /></span><div><b>Здесь может быть твой друг</b><small>Нажми, чтобы скопировать приглашение</small></div><Copy size={16} /></button>}
            </div>
            {!isHost && <button className={`ready-button ${self.ready ? 'ready' : ''}`} onClick={() => game.actions.ready(!self.ready)}>{self.ready ? <><CheckCheck size={18} /> Ты готов! Нажми, чтобы отменить</> : <><Check size={18} /> Я готов играть</>}</button>}

            <div className="lobby-chat">
              <div className="chat-title"><MessageCircle size={16} /><b>Чат комнаты</b><span>{room.messages.length}</span></div>
              <div className="chat-messages">
                {!room.messages.length && <div className="chat-empty"><span>👋</span><p>Напиши первым.<br /><small>Например: «Ставки сделаны, эксперты?»</small></p></div>}
                {room.messages.map((message) => <div className={`chat-message ${message.playerId === self.id ? 'own' : ''}`} key={message.id}><span style={{ color: message.color }}>{message.name}</span><p>{message.text}</p></div>)}
                <div ref={chatEnd} />
              </div>
              <form className="chat-input" onSubmit={submitChat}><input value={chatText} onChange={(event) => setChatText(event.target.value.slice(0, 140))} placeholder="Сообщение команде…" maxLength={140} /><button disabled={!chatText.trim()} aria-label="Отправить"><Send size={16} /></button></form>
            </div>
          </section>

          <aside className="lobby-settings-panel panel-card">
            <div className="panel-heading"><div><Settings2 size={19} /><h2>Правила матча</h2></div>{!isHost && <span className="host-controls-note">Меняет хост</span>}</div>
            <div className="lobby-route-preview">
              <img src={selectedCities[0].image} alt={selectedCities[0].name} />
              <div className="route-preview-shade" />
              <span className="route-badge"><Globe2 size={14} /> {selectedCities.length === CITIES.length ? 'Весь мир' : selectedCities.length === 1 ? selectedCities[0].country : 'Городской микс'}</span>
              <div><small>МАРШРУТ МАТЧА</small><b>{selectedCities.length === 1 ? selectedCities[0].name : `${selectedCities.length} ${cityCountLabel(selectedCities.length)} в миксе`}</b><span>{selectedCities.map((city) => city.flag).join(' ')}</span></div>
            </div>
            <div className="lobby-setting-block"><label>Города <span>{room.settings.cityIds.length} выбрано · {getCityLocations(room.settings.cityIds).length} {pointCountLabel(getCityLocations(room.settings.cityIds).length)}</span></label><div className="lobby-city-chips">{CITIES.map((city) => <button key={city.id} disabled={!isHost} className={room.settings.cityIds.includes(city.id) ? 'selected' : ''} onClick={() => toggleCity(city.id)} title={city.name}>{city.flag}<span>{city.name}</span>{room.settings.cityIds.includes(city.id) && <Check size={11} />}</button>)}</div></div>
            <div className="lobby-setting-block"><label>Формат</label><div className="lobby-select-grid">{(Object.keys(BATTLE_LABELS) as (keyof typeof BATTLE_LABELS)[]).map((mode) => <button key={mode} disabled={!isHost} className={room.settings.battleMode === mode ? 'selected' : ''} onClick={() => updateSettings({ battleMode: mode, timeLimit: mode === 'blitz' ? 45 : room.settings.timeLimit === 45 ? 120 : room.settings.timeLimit })}>{mode === 'classic' ? <Trophy size={15} /> : mode === 'closest' ? <Sparkles size={15} /> : <Clock3 size={15} />}{BATTLE_LABELS[mode].name}</button>)}</div></div>
            <div className="lobby-setting-block"><label>Панорамы</label><div className="lobby-select-grid"><button disabled={!isHost} className={room.settings.panoramaMode === 'street' ? 'selected' : ''} onClick={() => updateSettings({ panoramaMode: 'street' })}><Video size={15} />Street View</button><button disabled={!isHost} className={room.settings.panoramaMode === 'points' ? 'selected' : ''} onClick={() => updateSettings({ panoramaMode: 'points' })}>◎ Точки</button><button disabled={!isHost} className={room.settings.panoramaMode === 'mixed' ? 'selected' : ''} onClick={() => updateSettings({ panoramaMode: 'mixed' })}>⤨ Микс</button></div></div>
            <div className="lobby-match-summary"><div><span>Раундов</span><b>{room.settings.rounds}</b></div><div><span>Время</span><b>{room.settings.timeLimit ? `${room.settings.timeLimit} сек` : '∞'}</b></div><div><span>База / раунд</span><b>5 000</b></div></div>
            {isHost ? <button className="primary-button lobby-start-button" disabled={!allReady || !game.connected} onClick={game.actions.start}><Play size={18} fill="currentColor" /><span>{allReady ? 'Начать матч' : 'Ждём готовности игроков'}</span><ArrowRight size={19} /></button> : <div className="waiting-host"><span className="spinner" /> Хост начнёт матч, когда все будут готовы</div>}
          </aside>
        </div>
      </main>
      {shopOpen && <ShopModal profile={{ coins: self.coins, inventory: self.inventory }} onBuy={game.actions.buyItem} onClose={() => setShopOpen(false)} />}
    </div>
  );
}
