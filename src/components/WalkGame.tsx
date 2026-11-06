import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, Check, Copy, Footprints, Heart, Infinity as InfinityIcon, LocateFixed,
  Map as MapIcon, MapPin, MessageCircle, Navigation, Send, Star, Users, Video, X,
} from 'lucide-react';
import { LOCATIONS, getCity, getWalkProvider, type CityLocation } from '../../shared/data';
import { viewsSharePlace } from '../../shared/presence';
import type { PublicLocation, PublicPlayer, PublicRoom } from '../../shared/types';
import type { GameConnection } from '../hooks/useGameConnection';
import PanoramaViewer from './PanoramaViewer';
import { SamePlaceBanner } from './Presence';
import { Avatar, Logo, Modal } from './UI';

interface FavoritePlace {
  id: string;
  locationId: string;
  name: string;
  cityId: string;
  panoId: string | null;
  heading: number;
  savedAt: number;
}

const FAVORITES_KEY = 'geosvoi-favorite-places';
const favoriteId = (locationId: string, panoId?: string | null) => panoId ? `${locationId}::${panoId}` : locationId;

function loadFavorites(): FavoritePlace[] {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter((place) => place && LOCATIONS.some((location) => location.id === place.locationId)).slice(0, 40);
  } catch {
    return [];
  }
}

function walkLocation(room: PublicRoom, self: PublicPlayer): PublicLocation {
  const initial = room.currentLocation!;
  const base = LOCATIONS.find((location) => location.id === self.view.locationId) ?? initial;
  return {
    id: base.id, name: base.name, cityId: base.cityId, lat: base.lat, lng: base.lng,
    image: base.image, heading: self.walkHeading ?? base.heading,
    provider: getWalkProvider(room.settings.panoramaMode, base.id), panoId: self.walkPanoId ?? null,
  };
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); } catch { /* the room code remains selectable */ }
}

export default function WalkGame({ game }: { game: GameConnection }) {
  const room = game.room!;
  const self = game.self!;
  const location = useMemo(() => walkLocation(room, self), [room.currentLocation, room.settings.panoramaMode, self.view.locationId, self.walkHeading, self.walkPanoId]);
  const city = getCity(location.cityId);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationTab, setLocationTab] = useState<'all' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<FavoritePlace[]>(loadFavorites);
  const [revision, setRevision] = useState(0);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const friends = room.players.filter((player) => player.id !== self.id);
  const currentFavoriteId = favoriteId(location.id, self.view.panoId);
  const currentIsFavorite = favorites.some((place) => place.id === currentFavoriteId);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.messages.length, chatOpen]);

  useEffect(() => {
    if (!favoriteNotice) return;
    const timer = setTimeout(() => setFavoriteNotice(null), 2200);
    return () => clearTimeout(timer);
  }, [favoriteNotice]);

  const notifyFavorite = (text: string) => setFavoriteNotice(text);

  const toggleFavorite = (place: FavoritePlace) => {
    const exists = favorites.some((favorite) => favorite.id === place.id);
    setFavorites((current) => exists ? current.filter((favorite) => favorite.id !== place.id) : [place, ...current].slice(0, 40));
    notifyFavorite(exists ? 'Место удалено из избранного' : 'Место сохранено в избранное');
  };

  const toggleCurrentFavorite = () => {
    toggleFavorite({
      id: currentFavoriteId,
      locationId: location.id,
      name: self.view.panoId ? `${location.name} · сохранённый Street View` : location.name,
      cityId: location.cityId,
      panoId: self.view.panoId ?? null,
      heading: self.view.heading,
      savedAt: Date.now(),
    });
  };

  const favoriteForLocation = (base: CityLocation): FavoritePlace => ({
    id: favoriteId(base.id), locationId: base.id, name: base.name, cityId: base.cityId,
    panoId: null, heading: base.heading, savedAt: Date.now(),
  });

  const selectPlace = (locationId: string, panoId: string | null = null, heading?: number) => {
    setRevision((value) => value + 1);
    game.actions.walkLocation(locationId, panoId, heading);
    setLocationOpen(false);
  };

  const goToFriend = (player: PublicPlayer) => {
    if (!player.view.locationId) return;
    selectPlace(player.view.locationId, player.view.panoId ?? null, player.view.heading);
  };

  const copyInvite = async () => {
    await copyText(`${locationOrigin()}${locationPath()}?room=${room.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const submitChat = (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatText.trim()) return;
    game.actions.chat(chatText);
    setChatText('');
  };

  return (
    <div className="game-page walk-page">
      <header className="game-header in-game-header walk-header">
        <Logo onClick={game.leave} />
        <div className="game-round-title"><span>СВОБОДНЫЙ РЕЖИМ</span><b>Погуляй с другом</b></div>
        <div className="game-header-right">
          <button className="room-code-chip" onClick={copyInvite} title="Скопировать ссылку-приглашение"><span>{copied ? 'ССЫЛКА' : 'КОМНАТА'}</span><b>{copied ? 'СКОПИРОВАНО' : room.code}</b>{copied ? <Check size={13} /> : <Copy size={13} />}</button>
          <button className="icon-button leave-game-button" onClick={game.leave} title="Завершить прогулку"><X size={19} /></button>
        </div>
      </header>

      <div className="panorama-stage walk-stage">
        <PanoramaViewer
          key={`${location.id}-${location.panoId ?? 'coordinates'}-${revision}`}
          location={location}
          players={room.players}
          selfId={self.id}
          optics={self.inventory.optics > 0}
          speedActive={false}
          onView={game.actions.view}
        />

        <div className="walk-location-status location-status-card">
          <span className="location-status-icon">{location.provider === 'street' ? <Video size={19} /> : <MapPin size={19} />}</span>
          <div><small>{location.provider === 'street' ? 'GOOGLE STREET VIEW' : 'ФИКСИРОВАННАЯ ПАНОРАМА'}</small><b>{city.flag} {city.name}</b></div>
          <span className="panorama-quality">360°</span>
        </div>
        <div className="walk-free-badge"><InfinityIcon size={18} /><span>Без таймера и очков</span></div>
        <SamePlaceBanner players={room.players} self={self} />

        <aside className="walk-party-panel">
          <div className="walk-party-heading"><Users size={15} /><b>На прогулке</b><span>{room.players.length} / 8</span></div>
          {friends.map((player) => {
            const together = viewsSharePlace(self.view, player.view);
            return (
              <div className={`walk-party-player ${together ? 'is-nearby' : ''}`} key={player.id} style={{ '--player-color': player.color } as React.CSSProperties}>
                <Avatar player={player} size="small" showStatus />
                <div><b>{player.name}</b><span>{!player.connected ? 'Переподключается' : together ? 'В том же месте' : 'В другом месте'}</span></div>
                <button onClick={() => goToFriend(player)} disabled={!player.view.locationId} title={`Перейти к игроку ${player.name}`} aria-label={`Перейти к игроку ${player.name}`}><LocateFixed size={15} /><span>К другу</span></button>
              </div>
            );
          })}
          {!friends.length && <button className="walk-invite-empty" onClick={copyInvite}><Heart size={15} /><span>Позови друга по коду <b>{room.code}</b></span></button>}
        </aside>

        <div className="walk-current-place">
          <span>СЕЙЧАС ТЫ ЗДЕСЬ</span>
          <b>{location.name}</b>
          <small>{self.view.panoId ? 'Можно сохранить точную Google-панораму' : 'Локацию можно сохранить в избранное'}</small>
        </div>

        <div className="walk-toolbar">
          <button className="walk-change-place" onClick={() => { setLocationTab('all'); setLocationOpen(true); }}><MapIcon size={18} /><span>Сменить место</span><ArrowRight size={16} /></button>
          <button className={currentIsFavorite ? 'is-favorite' : ''} onClick={toggleCurrentFavorite} aria-pressed={currentIsFavorite}><Star size={18} fill={currentIsFavorite ? 'currentColor' : 'none'} /><span>{currentIsFavorite ? 'Сохранено' : 'В избранное'}</span></button>
          <button className={chatOpen ? 'active' : ''} onClick={() => setChatOpen(!chatOpen)}><MessageCircle size={18} /><span>Чат</span>{room.messages.length > 0 && <b>{room.messages.length}</b>}</button>
        </div>

        {favoriteNotice && <div className="walk-favorite-notice" role="status"><Star size={14} />{favoriteNotice}</div>}

        {chatOpen && (
          <section className="walk-chat-panel">
            <div className="walk-chat-heading"><div><MessageCircle size={15} /><b>Чат прогулки</b></div><button onClick={() => setChatOpen(false)} aria-label="Скрыть чат"><X size={15} /></button></div>
            <div className="walk-chat-messages">
              {!room.messages.length && <p className="walk-chat-empty">Напиши другу, куда отправиться дальше.</p>}
              {room.messages.map((message) => <div className={`walk-chat-message ${message.playerId === self.id ? 'own' : ''}`} key={message.id}><span style={{ color: message.color }}>{message.name}</span><p>{message.text}</p></div>)}
              <div ref={chatEnd} />
            </div>
            <form onSubmit={submitChat}><input value={chatText} onChange={(event) => setChatText(event.target.value.slice(0, 140))} placeholder="Сообщение другу…" /><button disabled={!chatText.trim()} aria-label="Отправить сообщение"><Send size={15} /></button></form>
          </section>
        )}
      </div>

      {locationOpen && (
        <Modal onClose={() => setLocationOpen(false)} className="walk-location-modal" label="Выбор места для прогулки">
          <span className="eyebrow"><Footprints size={14} /> СВОБОДНЫЙ МАРШРУТ</span>
          <h2>Куда пойдём?</h2>
          <p>Выбор меняет только твою сцену. Чтобы оказаться рядом, нажми «К другу» в списке участников.</p>
          <div className="walk-location-tabs" role="tablist">
            <button className={locationTab === 'all' ? 'active' : ''} onClick={() => setLocationTab('all')}><Navigation size={14} /> Все места · {LOCATIONS.length}</button>
            <button className={locationTab === 'favorites' ? 'active' : ''} onClick={() => setLocationTab('favorites')}><Star size={14} /> Избранное · {favorites.length}</button>
          </div>
          {locationTab === 'all' ? (
            <div className="walk-location-grid">
              {LOCATIONS.map((base) => {
                const favorite = favoriteForLocation(base);
                const isFavorite = favorites.some((place) => place.id === favorite.id);
                return (
                  <div className="walk-location-card" key={base.id}>
                    <button className="walk-location-select" onClick={() => selectPlace(base.id)}>
                      <img src={base.image} alt="" />
                      <span><small>{getCity(base.cityId).flag} {getCity(base.cityId).name}</small><b>{base.name}</b><em>{getWalkProvider(room.settings.panoramaMode, base.id) === 'street' ? 'Street View · можно переходить' : 'Фиксированная точка'}</em></span>
                    </button>
                    <button className={`walk-card-star ${isFavorite ? 'active' : ''}`} onClick={() => toggleFavorite(favorite)} aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}><Star size={15} fill={isFavorite ? 'currentColor' : 'none'} /></button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="walk-location-grid">
              {favorites.map((favorite) => {
                const base = LOCATIONS.find((candidate) => candidate.id === favorite.locationId)!;
                return (
                  <div className="walk-location-card" key={favorite.id}>
                    <button className="walk-location-select" onClick={() => selectPlace(favorite.locationId, favorite.panoId, favorite.heading)}>
                      <img src={base.image} alt="" />
                      <span><small>{getCity(base.cityId).flag} {getCity(base.cityId).name}{favorite.panoId ? ' · Google panoId' : ''}</small><b>{favorite.name}</b><em>Сохранено {new Date(favorite.savedAt).toLocaleDateString('ru-RU')}</em></span>
                    </button>
                    <button className="walk-card-star active" onClick={() => toggleFavorite(favorite)} aria-label="Удалить из избранного"><Star size={15} fill="currentColor" /></button>
                  </div>
                );
              })}
              {!favorites.length && <div className="walk-favorites-empty"><Star size={28} /><h3>Здесь появятся любимые места</h3><p>Нажми «В избранное» во время прогулки. В Google сохраняется точная панорама и направление взгляда.</p></div>}
            </div>
          )}
          <div className="walk-storage-note"><Heart size={14} /><span>Избранное хранится в этом браузере и доступно без регистрации.</span></div>
        </Modal>
      )}
    </div>
  );
}

function locationOrigin() {
  return window.location.origin;
}

function locationPath() {
  return window.location.pathname;
}
