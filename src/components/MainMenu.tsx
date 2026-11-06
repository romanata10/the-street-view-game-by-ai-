import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Bot, Check, ChevronDown, CircleHelp, Clock3, Copy, Crosshair, Download, Footprints, Globe2,
  KeyRound, Layers3, Map, MapPin, Navigation, Play, Plus, Route, ShoppingBag, Sparkles,
  Swords, Trophy, Users, Video, WandSparkles, X,
} from 'lucide-react';
import {
  BATTLE_LABELS, CITIES, LOCATIONS, cityCountLabel, getCity, getCityLocations, pointCountLabel, type BattleMode, type GameSettings, type PanoramaMode,
} from '../../shared/data';
import type { GameConnection } from '../hooks/useGameConnection';
import DownloadModal from './DownloadModal';
import ShopModal from './ShopModal';
import { CoinBalance, Logo, Modal } from './UI';

const GOOGLE_MAPS_CONNECTED = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

const DEFAULT_SETTINGS: GameSettings = {
  cityIds: ['novosibirsk'], battleMode: 'classic', panoramaMode: 'mixed', rounds: 5, timeLimit: 120,
};

function loadSettings(): GameSettings {
  try {
    const saved = JSON.parse(localStorage.getItem('geosvoi-settings') || 'null');
    if (saved?.cityIds?.length) return { ...DEFAULT_SETTINGS, ...saved };
  } catch { /* use Novosibirsk as the first route */ }
  return DEFAULT_SETTINGS;
}

export default function MainMenu({ game }: { game: GameConnection }) {
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [shopOpen, setShopOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesTab, setRulesTab] = useState<'game' | 'friends' | 'walk' | 'gadgets'>('game');
  const [joinCode, setJoinCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() || '');
  const [draftName, setDraftName] = useState(game.name);
  const citiesRef = useRef<HTMLElement>(null);
  const heroCity = getCity(settings.cityIds[0]);
  const selectedLocationCount = getCityLocations(settings.cityIds).length;

  useEffect(() => localStorage.setItem('geosvoi-settings', JSON.stringify(settings)), [settings]);

  const toggleCity = (id: string) => {
    setSettings((current) => {
      const selected = current.cityIds.includes(id);
      if (selected && current.cityIds.length === 1) return current;
      return { ...current, cityIds: selected ? current.cityIds.filter((cityId) => cityId !== id) : [...current.cityIds, id] };
    });
  };

  const selectBattle = (battleMode: BattleMode) => {
    setSettings((current) => ({
      ...current, battleMode,
      timeLimit: battleMode === 'blitz' ? 45 : current.timeLimit === 45 ? 120 : current.timeLimit,
    }));
  };

  const submitJoin = (event: React.FormEvent) => {
    event.preventDefault();
    if (joinCode.trim().length === 6) game.join(joinCode.trim());
  };

  const saveName = (event: React.FormEvent) => {
    event.preventDefault();
    game.setName(draftName);
    setNameOpen(false);
  };

  return (
    <div className="menu-page">
      <header className="site-header page-shell">
        <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <nav className="main-nav" aria-label="Основная навигация">
          <button className="active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Играть</button>
          <button onClick={() => citiesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Города</button>
          <button onClick={() => setShopOpen(true)}>Магазин</button>
          <button onClick={() => setRulesOpen(true)}>Как играть</button>
        </nav>
        <div className="header-actions">
          <button className="download-header-button" onClick={() => setDownloadOpen(true)}><Download size={16} /><span>Скачать</span></button>
          <CoinBalance value={game.profile.coins} />
          <button className="profile-chip" onClick={() => { setDraftName(game.name); setNameOpen(true); }}>
            <span className="profile-avatar">🦊</span>
            <span>{game.name}</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <main className="page-shell menu-main">
        <section className="hero-layout">
          <div className="menu-hero" style={{ '--hero-image': `url(${heroCity.image})`, '--city-accent': heroCity.accent } as React.CSSProperties}>
            <div className="hero-grid-overlay" />
            <div className="hero-content">
              <span className="eyebrow hero-eyebrow"><span className="live-dot" /> ИГРАЙ. ИССЛЕДУЙ. ПОБЕЖДАЙ.</span>
              <h1>Угадай место.<br /><em>Докажи своим.</em></h1>
              <p>Осматривай улицы, лови городской вайб и ставь точку на карте быстрее друзей.</p>
              <div className="hero-tags">
                <span><Users size={14} /> До 8 игроков</span>
                <span><Navigation size={14} /> Панорамы 360°</span>
                <span><Globe2 size={14} /> {CITIES.length} городов · {LOCATIONS.length} точек</span>
              </div>
            </div>
            <div className="hero-location-card">
              <span className="location-panorama-icon"><Video size={18} /></span>
              <div><small>СЕЙЧАС НА МАРШРУТЕ</small><b>{settings.cityIds.length === CITIES.length ? 'Весь мир' : settings.cityIds.length > 1 ? `${settings.cityIds.length} ${cityCountLabel(settings.cityIds.length)} в миксе` : heroCity.name}</b></div>
              <span className="location-360">360°</span>
            </div>
            <div className="hero-floating-pin"><MapPin size={19} fill="currentColor" /><span>Ты где?</span></div>
            <div className="hero-coordinate">{Math.abs(heroCity.center[0]).toFixed(4)}° {heroCity.center[0] >= 0 ? 'N' : 'S'}&nbsp;&nbsp; {Math.abs(heroCity.center[1]).toFixed(4)}° {heroCity.center[1] >= 0 ? 'E' : 'W'}</div>
          </div>

          <aside className="match-builder">
            <div className="builder-heading">
              <div><span className="eyebrow">НОВЫЙ МАТЧ</span><h2>Собери свою игру</h2></div>
              <span className={`connection-badge ${game.connected ? 'online' : ''}`}><i />{game.connected ? 'Онлайн' : 'Связь…'}</span>
            </div>

            <div className="builder-section">
              <div className="setting-label"><span>01</span><b>Формат соревнования</b></div>
              <div className="battle-options">
                {(Object.keys(BATTLE_LABELS) as BattleMode[]).map((mode) => (
                  <button key={mode} className={settings.battleMode === mode ? 'selected' : ''} onClick={() => selectBattle(mode)}>
                    {mode === 'classic' ? <Trophy size={18} /> : mode === 'closest' ? <Crosshair size={18} /> : <Clock3 size={18} />}
                    <b>{BATTLE_LABELS[mode].name}</b>
                    <small>{BATTLE_LABELS[mode].description}</small>
                    {settings.battleMode === mode && <i><Check size={10} /></i>}
                  </button>
                ))}
              </div>
            </div>

            <div className="builder-section">
              <div className="setting-label"><span>02</span><b>Что видно на экране</b></div>
              <div className="segment-control panorama-modes">
                {([
                  ['street', Video, 'Street View'], ['points', MapPin, 'Панорамы'], ['mixed', Layers3, 'Микс'],
                ] as [PanoramaMode, typeof Video, string][]).map(([mode, Icon, label]) => (
                  <button key={mode} className={settings.panoramaMode === mode ? 'selected' : ''} onClick={() => setSettings({ ...settings, panoramaMode: mode })}><Icon size={16} /><span>{label}</span></button>
                ))}
              </div>
              <p className="setting-hint">Google Street View — движение по улицам; точки — фиксированная панорама без переходов.</p>
              <div className={`maps-api-status ${GOOGLE_MAPS_CONNECTED ? 'connected' : ''}`}><KeyRound size={11} /><span>{GOOGLE_MAPS_CONNECTED ? 'Google Maps API подключён: улицы и точки' : 'Сейчас демо-сцены · для Google добавьте VITE_GOOGLE_MAPS_API_KEY в .env'}</span></div>
            </div>

            <div className="builder-section compact-settings">
              <label><span><Route size={15} /> Раунды</span><select value={settings.rounds} onChange={(event) => setSettings({ ...settings, rounds: Number(event.target.value) })}><option value={3}>3 раунда</option><option value={5}>5 раундов</option><option value={7}>7 раундов</option><option value={10}>10 раундов</option></select></label>
              <label><span><Clock3 size={15} /> На раунд</span><select value={settings.timeLimit} disabled={settings.battleMode === 'blitz'} onChange={(event) => setSettings({ ...settings, timeLimit: Number(event.target.value) })}><option value={0}>Без лимита</option><option value={60}>60 секунд</option><option value={120}>2 минуты</option><option value={180}>3 минуты</option>{settings.battleMode === 'blitz' && <option value={45}>45 секунд</option>}</select></label>
            </div>

            <button className="primary-button create-room-button" disabled={!game.connected} onClick={() => game.create(settings)}>
              <span className="button-icon"><Users size={19} /></span><span>Создать комнату<small>Позови до 7 друзей</small></span><ArrowRight size={20} />
            </button>
            <div className="secondary-game-actions">
              <button onClick={() => game.solo(settings)} disabled={!game.connected}><Bot size={17} /> С ботом</button>
              <span>или</span>
              <button onClick={() => setJoinOpen(true)}><KeyRound size={16} /> Войти по коду</button>
            </div>
            <button className="free-walk-button" disabled={!game.connected} onClick={() => game.createWalk(settings)}>
              <span className="free-walk-icon"><Footprints size={20} /></span>
              <span><b>Погулять с другом</b><small>Любые места вместе · без таймера и очков</small></span>
              <ArrowRight size={18} />
            </button>
          </aside>
        </section>

        <section className="cities-section" ref={citiesRef}>
          <div className="section-heading">
            <div><span className="eyebrow">ТВОЙ МАРШРУТ</span><h2>Где сегодня гуляем?</h2><p>Выбери один город или собери свой микс из нескольких.</p></div>
            <button className={`world-button ${settings.cityIds.length === CITIES.length ? 'selected' : ''}`} onClick={() => setSettings({ ...settings, cityIds: settings.cityIds.length === CITIES.length ? ['novosibirsk'] : CITIES.map((city) => city.id) })}><Globe2 size={18} /><span>{settings.cityIds.length === CITIES.length ? 'Весь мир выбран' : 'Выбрать весь мир'}</span>{settings.cityIds.length === CITIES.length && <Check size={16} />}</button>
          </div>
          <div className="city-grid">
            {CITIES.map((city, index) => {
              const selected = settings.cityIds.includes(city.id);
              return (
                <button className={`city-card ${selected ? 'selected' : ''}`} key={city.id} onClick={() => toggleCity(city.id)} style={{ '--city-accent': city.accent } as React.CSSProperties}>
                  <img src={city.image} alt={`Панорама: ${city.name}`} loading={index > 2 ? 'lazy' : 'eager'} />
                  <span className="city-shade" />
                  <span className="city-number">0{index + 1}</span>
                  <span className="city-check">{selected ? <Check size={15} /> : <Plus size={15} />}</span>
                  <span className="city-info"><small>{city.flag} {city.country}</small><b>{city.name}</b><span>{city.tagline}</span></span>
                </button>
              );
            })}
          </div>
          <div className="selection-summary"><MapPin size={15} /><span>В матче: <b>{settings.cityIds.length === CITIES.length ? 'случайные города мира' : settings.cityIds.map((id) => getCity(id).name).join(' · ')}</b></span><span className="summary-count">{settings.cityIds.length} / {CITIES.length} · {selectedLocationCount} {pointCountLabel(selectedLocationCount)}</span></div>
        </section>

        <section className="menu-feature-strip">
          <div><span><Navigation size={21} /></span><p><b>Осмотрись на 360°</b><small>Друзья видны прямо в панораме</small></p></div>
          <div><span><Map size={21} /></span><p><b>Поставь свою точку</b><small>Чем ближе — тем больше очков</small></p></div>
          <div><span><WandSparkles size={21} /></span><p><b>Перехитри соперников</b><small>Гаджеты меняют ход игры</small></p></div>
          <button onClick={() => setShopOpen(true)}><ShoppingBag size={17} /> Открыть магазин <ArrowRight size={16} /></button>
        </section>
      </main>

      <footer className="site-footer page-shell"><Logo compact /><span>Города становятся ближе, когда играешь с друзьями.</span><span>Без регистрации · В любом браузере</span></footer>

      {shopOpen && <ShopModal profile={game.profile} onBuy={game.buyLocal} onClose={() => setShopOpen(false)} />}
      {downloadOpen && <DownloadModal onClose={() => setDownloadOpen(false)} />}
      {joinOpen && (
        <Modal onClose={() => setJoinOpen(false)} className="join-modal" label="Войти в комнату">
          <span className="modal-symbol"><KeyRound size={27} /></span>
          <span className="eyebrow">ДРУЗЬЯ УЖЕ ЖДУТ</span>
          <h2>Войти в комнату</h2>
          <p>Введи шестизначный код с экрана друга.</p>
          <form onSubmit={submitJoin}>
            <input className="room-code-input" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="GE0SV0" autoFocus autoComplete="off" spellCheck={false} />
            <button className="primary-button" disabled={joinCode.length !== 6 || !game.connected}>Войти в игру <ArrowRight size={18} /></button>
          </form>
          <div className="modal-footnote"><Copy size={13} /> Код можно найти в ссылке-приглашении после ?room=</div>
        </Modal>
      )}
      {nameOpen && (
        <Modal onClose={() => setNameOpen(false)} className="name-modal" label="Профиль игрока">
          <span className="modal-symbol">🦊</span><span className="eyebrow">ТВОЙ ПРОФИЛЬ</span><h2>Как тебя зовут?</h2><p>Это имя увидят друзья в комнате и на панораме.</p>
          <form onSubmit={saveName}><input className="name-input" value={draftName} onChange={(event) => setDraftName(event.target.value.slice(0, 18))} maxLength={18} autoFocus placeholder="Географ" /><button className="primary-button">Сохранить <Check size={18} /></button></form>
        </Modal>
      )}
      {rulesOpen && (
        <Modal onClose={() => setRulesOpen(false)} className="rules-modal" label="Обучение игре">
          <span className="eyebrow"><CircleHelp size={14} /> ЦЕНТР ОБУЧЕНИЯ</span>
          <h2>{rulesTab === 'game' ? 'Три шага до победы' : rulesTab === 'friends' ? 'Как играть с другом' : rulesTab === 'walk' ? 'Свободная прогулка' : 'Гаджеты и управление'}</h2>
          <div className="rules-tabs" role="tablist">
            <button className={rulesTab === 'game' ? 'active' : ''} onClick={() => setRulesTab('game')}><Navigation size={14} /> Основы</button>
            <button className={rulesTab === 'friends' ? 'active' : ''} onClick={() => setRulesTab('friends')}><Users size={14} /> С друзьями</button>
            <button className={rulesTab === 'walk' ? 'active' : ''} onClick={() => setRulesTab('walk')}><Footprints size={14} /> Прогулка</button>
            <button className={rulesTab === 'gadgets' ? 'active' : ''} onClick={() => setRulesTab('gadgets')}><WandSparkles size={14} /> Гаджеты</button>
          </div>
          {rulesTab === 'game' && <>
            <div className="rules-list">
              <div><span>01</span><Navigation size={24} /><h3>Исследуй</h3><p>Вращай панораму мышью или стрелками. Признаки города — в архитектуре, знаках, машинах и природе.</p></div>
              <div><span>02</span><MapPin size={24} /><h3>Выбери точку</h3><p>Кликни по карте в правом нижнем углу. Ответ можно менять до отправки. Enter — отправить, M — раскрыть карту.</p></div>
              <div><span>03</span><Swords size={24} /><h3>Побеждай</h3><p>До 5000 очков за точность. В режиме «Кто ближе» решают победы в раундах, а в блице — ещё и скорость.</p></div>
            </div>
            <div className="rules-tip"><Sparkles size={19} /><span><b>Не забудь про гаджеты.</b> Подсказка поможет тебе, а чёрный экран на 5 секунд слегка усложнит жизнь другу.</span></div>
          </>}
          {rulesTab === 'friends' && <>
            <div className="friend-tutorial">
              <div><span>1</span><section><b>Один игрок создаёт комнату</b><p>Выбери города и правила, нажми «Создать комнату». Ты станешь хостом матча.</p></section><Users size={21} /></div>
              <div><span>2</span><section><b>Отправь приглашение другу</b><p>В лобби нажми «Скопировать ссылку» или продиктуй шестизначный код. Друг откроет ссылку либо выберет «Войти по коду».</p></section><Copy size={21} /></div>
              <div><span>3</span><section><b>Друг подтверждает готовность</b><p>Проверьте имена и напишите друг другу в чат. Каждый гость нажимает «Я готов играть».</p></section><Check size={21} /></div>
              <div><span>4</span><section><b>Хост начинает матч</b><p>У всех будет одинаковая локация и таймер. Отвечайте независимо — результат раунда откроется после всех ответов.</p></section><Play size={21} /></div>
            </div>
            <div className="invite-example"><span>ПРИМЕР ПРИГЛАШЕНИЯ</span><b>GEO24X</b><small>geosvoi.example/?room=GEO24X</small></div>
            <div className="rules-tip"><Users size={19} /><span><b>Регистрация не нужна.</b> Играть можно с разных устройств. В одной комнате помещается до 8 игроков, а для тренировки хост может добавить бота.</span></div>
          </>}
          {rulesTab === 'walk' && <>
            <div className="friend-tutorial walk-tutorial">
              <div><span>1</span><section><b>Начни прогулку</b><p>Нажми «Погулять с другом», отправь ссылку и дождись готовности. Здесь нет раундов, очков и таймера.</p></section><Footprints size={21} /></div>
              <div><span>2</span><section><b>Выбирай любые места</b><p>«Сменить место» открывает все 16 локаций. Каждый может осматриваться самостоятельно или повторить маршрут друга.</p></section><MapPin size={21} /></div>
              <div><span>3</span><section><b>Не теряйте друг друга</b><p>Статус «В том же месте» работает и в прогулке, и в соревнованиях. Кнопка «К другу» переносит в его текущую сцену.</p></section><Users size={21} /></div>
              <div><span>4</span><section><b>Сохраняй панорамы</b><p>Звезда добавляет место в избранное. В Google сохраняются точный panoId и направление взгляда, чтобы вернуться позже.</p></section><Sparkles size={21} /></div>
            </div>
            <div className="rules-tip"><Footprints size={19} /><span><b>Друг может подключиться после старта.</b> Он появится рядом с текущим местом хоста. Избранное хранится локально в твоём браузере.</span></div>
          </>}
          {rulesTab === 'gadgets' && <>
            <div className="gadget-guide">
              <div><b>1 · Гео-подсказка</b><p>Открывает подсказку именно для текущей локации.</p></div>
              <div><b>2 · Чёрный экран</b><p>Выбери соперника — его панорама исчезнет на 5 секунд.</p></div>
              <div><b>3 · Турбо-шаг</b><p>На 45 секунд ускоряет вращение и навигацию камеры.</p></div>
              <div><b>4 · Анти-лаг</b><p>Блокирует одну атаку чёрным экраном.</p></div>
              <div><b>5 · Риск-раунд</b><p>Активируй до ответа, чтобы удвоить очки за раунд.</p></div>
              <div><b>Оптика PRO</b><p>Постоянное улучшение zoom. Работает автоматически.</p></div>
            </div>
            <div className="rules-tip"><ShoppingBag size={19} /><span><b>Монеты не нужно покупать.</b> Они начисляются за каждый ответ, точность и победу в раунде. Магазин доступен и в меню, и во время матча.</span></div>
          </>}
          <button className="primary-button" onClick={() => setRulesOpen(false)}>Всё понятно, в игру! <Play size={17} /></button>
        </Modal>
      )}
    </div>
  );
}
