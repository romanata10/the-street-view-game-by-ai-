import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  CITIES, DEFAULT_PROFILE, LOCATIONS, SHOP_ITEMS, calculateScore, distanceKm, getCity, getCityLocations, getLocation,
  type BattleMode, type GameSettings, type Inventory, type ItemId, type PanoramaMode,
  type PlayerProfile,
} from '../shared/data';
import type {
  ChatMessage, ClientMessage, LatLng, PublicLocation, PublicPlayer, PublicRoom,
} from '../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.get('/api/health', (_req, res) => res.json({ ok: true, rooms: rooms.size, now: Date.now() }));

if (isProduction) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

type Socket = WebSocket & { playerId?: string; roomCode?: string };
interface Room {
  code: string;
  status: PublicRoom['status'];
  settings: GameSettings;
  players: Map<string, PublicPlayer>;
  hostId: string;
  round: number;
  currentLocation: PublicLocation | null;
  roundStartedAt: number | null;
  roundEndsAt: number | null;
  messages: ChatMessage[];
  createdAt: number;
  botTimers: ReturnType<typeof setTimeout>[];
  locationHistory: string[];
}

const rooms = new Map<string, Room>();
const COLORS = ['#c9f45b', '#75d7ff', '#ff8f7d', '#c6a5ff', '#ffc65c', '#66e0b5', '#f49ac2', '#a9b7c6'];
const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🐨', '🦁', '🐙', '🦄'];
const BOT_NAMES = ['Маша', 'Тимур', 'Лена', 'Макс', 'Соня', 'Артём'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function roomCode() {
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function normalizeProfile(profile?: PlayerProfile): PlayerProfile {
  const source = profile ?? DEFAULT_PROFILE;
  const inventory = {} as Inventory;
  (Object.keys(DEFAULT_PROFILE.inventory) as ItemId[]).forEach((key) => {
    inventory[key] = clamp(Math.floor(Number(source.inventory?.[key]) || 0), 0, key === 'optics' ? 1 : 99);
  });
  return { coins: clamp(Math.floor(Number(source.coins) || 0), 0, 1_000_000), inventory };
}

function normalizeSettings(settings: GameSettings): GameSettings {
  const validCities = Array.isArray(settings?.cityIds)
    ? settings.cityIds.filter((id) => CITIES.some((city) => city.id === id)).slice(0, CITIES.length)
    : [];
  const battleModes: BattleMode[] = ['classic', 'closest', 'blitz'];
  const panoramaModes: PanoramaMode[] = ['street', 'points', 'mixed'];
  const battleMode = battleModes.includes(settings?.battleMode) ? settings.battleMode : 'classic';
  return {
    cityIds: validCities.length ? validCities : ['novosibirsk'],
    battleMode,
    panoramaMode: panoramaModes.includes(settings?.panoramaMode) ? settings.panoramaMode : 'mixed',
    rounds: [3, 5, 7, 10].includes(settings?.rounds) ? settings.rounds : 5,
    timeLimit: battleMode === 'blitz' ? 45 : [0, 60, 120, 180].includes(settings?.timeLimit) ? settings.timeLimit : 120,
  };
}

function createPlayer(id: string, name: string, profile: PlayerProfile, index: number, isBot = false): PublicPlayer {
  const normalized = normalizeProfile(profile);
  return {
    id, name: name.trim().slice(0, 18) || 'Географ', color: COLORS[index % COLORS.length],
    avatar: isBot ? '🤖' : AVATARS[index % AVATARS.length], isHost: false, isBot, connected: true,
    ready: isBot, score: 0, roundWins: 0, coins: normalized.coins, coinsEarned: 0,
    inventory: normalized.inventory, view: { heading: 0, pitch: 0 }, mapCursor: null,
    guess: null, distance: null, roundScore: 0, guessedAt: null,
    effects: { blackoutUntil: 0, speedUntil: 0, shieldActive: false, doubleActive: false },
    hint: null, reaction: null,
  };
}

function publicRoom(room: Room): PublicRoom {
  return {
    code: room.code, status: room.status, settings: room.settings,
    players: [...room.players.values()].map((player) => ({ ...player, inventory: { ...player.inventory }, effects: { ...player.effects } })),
    hostId: room.hostId, round: room.round, currentLocation: room.currentLocation,
    roundStartedAt: room.roundStartedAt, roundEndsAt: room.roundEndsAt,
    serverTime: Date.now(), messages: room.messages.slice(-50),
  };
}

function send(socket: Socket | undefined, data: object) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data));
}

function socketsIn(room: Room) {
  return [...wss.clients].filter((client): client is Socket => (client as Socket).roomCode === room.code);
}

function broadcast(room: Room) {
  const payload = JSON.stringify({ type: 'room', room: publicRoom(room) });
  socketsIn(room).forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(payload);
  });
}

function notify(room: Room, playerId: string, text: string, kind: 'info' | 'success' | 'attack' = 'info') {
  const socket = socketsIn(room).find((candidate) => candidate.playerId === playerId);
  send(socket, { type: 'toast', text, kind });
}

function error(socket: Socket, text: string) {
  send(socket, { type: 'error', text });
}

function detach(socket: Socket) {
  if (!socket.roomCode) return;
  const room = rooms.get(socket.roomCode);
  socket.roomCode = undefined;
  socket.playerId = undefined;
  return room;
}

function createRoom(settings: GameSettings): Room {
  const code = roomCode();
  const room: Room = {
    code, status: 'lobby', settings: normalizeSettings(settings), players: new Map(), hostId: '',
    round: 0, currentLocation: null, roundStartedAt: null, roundEndsAt: null,
    messages: [], createdAt: Date.now(), botTimers: [], locationHistory: [],
  };
  rooms.set(code, room);
  return room;
}

function addBot(room: Room) {
  if (room.players.size >= 8) return;
  const index = room.players.size;
  const usedNames = new Set([...room.players.values()].map((player) => player.name));
  const name = BOT_NAMES.find((candidate) => !usedNames.has(candidate)) ?? `Бот ${index}`;
  const bot = createPlayer(`bot-${randomId()}`, name, { coins: 0, inventory: { ...DEFAULT_PROFILE.inventory } }, index, true);
  bot.ready = true;
  room.players.set(bot.id, bot);
}

function beginRound(room: Room) {
  room.botTimers.forEach(clearTimeout);
  room.botTimers = [];
  const previousCity = room.currentLocation?.cityId;
  const allLocations = getCityLocations(room.settings.cityIds);
  let unseen = allLocations.filter((location) => !room.locationHistory.includes(location.id));
  if (!unseen.length) {
    room.locationHistory = room.currentLocation ? [room.currentLocation.id] : [];
    unseen = allLocations.filter((location) => !room.locationHistory.includes(location.id));
  }
  const differentCity = unseen.filter((location) => location.cityId !== previousCity);
  const choices = differentCity.length ? differentCity : unseen;
  const spawn = choices[Math.floor(Math.random() * choices.length)] ?? LOCATIONS[0];
  room.locationHistory.push(spawn.id);
  const provider = room.settings.panoramaMode === 'mixed'
    ? (Math.random() > 0.5 ? 'street' : 'points')
    : room.settings.panoramaMode;
  room.currentLocation = {
    id: spawn.id, name: spawn.name, cityId: spawn.cityId, lat: spawn.lat, lng: spawn.lng,
    image: spawn.image, heading: (spawn.heading + Math.floor(Math.random() * 4) * 90) % 360, provider,
  };
  room.status = 'playing';
  room.roundStartedAt = Date.now();
  room.roundEndsAt = room.settings.timeLimit ? Date.now() + room.settings.timeLimit * 1000 : null;
  [...room.players.values()].forEach((player, index) => {
    player.guess = null;
    player.distance = null;
    player.roundScore = 0;
    player.coinsEarned = 0;
    player.guessedAt = null;
    player.hint = null;
    player.mapCursor = null;
    player.effects = { blackoutUntil: 0, speedUntil: 0, shieldActive: false, doubleActive: false };
    player.view = { heading: (room.currentLocation!.heading + index * 35) % 360, pitch: 0 };
  });
  broadcast(room);
  scheduleBots(room);
}

function startMatch(room: Room) {
  room.round = 1;
  room.locationHistory = [];
  room.players.forEach((player) => {
    player.score = 0;
    player.roundWins = 0;
    player.ready = player.isBot || player.isHost;
  });
  beginRound(room);
}

function scheduleBots(room: Room) {
  if (!room.currentLocation) return;
  const location = room.currentLocation;
  room.players.forEach((bot) => {
    if (!bot.isBot) return;
    const maxDelay = room.settings.battleMode === 'blitz' ? 9000 : 18000;
    const delay = 4500 + Math.random() * (maxDelay - 4500);
    const timer = setTimeout(() => {
      if (room.status !== 'playing' || bot.guess || !room.currentLocation) return;
      const worldScale = room.settings.cityIds.length > 1;
      const spread = worldScale ? 20 + Math.random() * 900 : 0.15 + Math.random() * 7;
      const angle = Math.random() * Math.PI * 2;
      const guess = {
        lat: clamp(location.lat + Math.cos(angle) * spread / 111, -85, 85),
        lng: location.lng + Math.sin(angle) * spread / (111 * Math.max(0.2, Math.cos(location.lat * Math.PI / 180))),
      };
      submitGuess(room, bot, guess);
    }, delay);
    room.botTimers.push(timer);
  });
}

function submitGuess(room: Room, player: PublicPlayer, guess: LatLng) {
  if (room.status !== 'playing' || player.guess || !room.currentLocation) return;
  if (!Number.isFinite(guess.lat) || !Number.isFinite(guess.lng)) return;
  player.guess = { lat: clamp(guess.lat, -85, 85), lng: clamp(guess.lng, -180, 180) };
  player.guessedAt = Date.now();
  broadcast(room);
  const activePlayers = [...room.players.values()].filter((candidate) => candidate.connected || candidate.isBot);
  if (activePlayers.every((candidate) => candidate.guess)) finishRound(room);
}

function finishRound(room: Room) {
  if (room.status !== 'playing' || !room.currentLocation) return;
  room.botTimers.forEach(clearTimeout);
  room.botTimers = [];
  const actual = { lat: room.currentLocation.lat, lng: room.currentLocation.lng };
  const worldScale = room.settings.cityIds.length > 1;
  const players = [...room.players.values()];
  players.forEach((player) => {
    if (player.guess) {
      player.distance = distanceKm(player.guess, actual);
      let score = calculateScore(player.distance, worldScale);
      if (room.settings.battleMode === 'blitz' && player.guessedAt && room.roundEndsAt) {
        score += Math.max(0, Math.floor((room.roundEndsAt - player.guessedAt) / 1000) * 8);
      }
      if (player.effects.doubleActive) score *= 2;
      player.roundScore = score;
    } else {
      player.distance = null;
      player.roundScore = 0;
    }
  });
  const answered = players.filter((player) => player.distance !== null);
  const winner = answered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))[0];
  if (winner) winner.roundWins += 1;
  players.forEach((player) => {
    player.score += player.roundScore;
    player.coinsEarned = (player.guess ? 50 : 0) + Math.round(player.roundScore / 100) + (player === winner ? 75 : 0);
    player.coins += player.coinsEarned;
  });
  room.status = 'roundResult';
  room.roundEndsAt = null;
  broadcast(room);
  if (winner) notify(room, winner.id, 'Самый точный ответ в раунде! +75 монет', 'success');
}

function removePlayer(socket: Socket, notifyLeft = true) {
  const room = rooms.get(socket.roomCode ?? '');
  const playerId = socket.playerId;
  if (!room || !playerId) return;
  room.players.delete(playerId);
  room.botTimers.forEach(clearTimeout);
  room.botTimers = [];
  detach(socket);
  if (notifyLeft) send(socket, { type: 'left' });
  const humans = [...room.players.values()].filter((player) => !player.isBot);
  if (!humans.length) {
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === playerId) {
    const nextHost = humans.find((player) => player.connected) ?? humans[0];
    room.hostId = nextHost.id;
    room.players.forEach((player) => { player.isHost = player.id === nextHost.id; });
  }
  broadcast(room);
  if (room.status === 'playing') {
    const active = [...room.players.values()].filter((player) => player.connected || player.isBot);
    if (active.length && active.every((player) => player.guess)) finishRound(room);
  }
}

function useItem(socket: Socket, room: Room, player: PublicPlayer, item: ItemId, targetId?: string) {
  if (room.status !== 'playing') return error(socket, 'Предметы доступны только во время раунда');
  if (!SHOP_ITEMS.some((candidate) => candidate.id === item)) return error(socket, 'Неизвестный предмет');
  if (item === 'optics') return error(socket, 'Оптика работает автоматически');
  if (player.inventory[item] <= 0) return error(socket, 'Этот предмет закончился. Загляни в магазин!');
  if (item === 'hint') {
    if (player.hint) return error(socket, 'Подсказка уже открыта в этом раунде');
    player.hint = getLocation(room.currentLocation!.id).hint;
    notify(room, player.id, 'Гео-подсказка открыта', 'success');
  } else if (item === 'speed') {
    player.effects.speedUntil = Date.now() + 45_000;
    notify(room, player.id, 'Турбо-шаг активирован на 45 секунд', 'success');
  } else if (item === 'shield') {
    if (player.effects.shieldActive) return error(socket, 'Щит уже активен');
    player.effects.shieldActive = true;
    notify(room, player.id, 'Анти-лаг защищает от следующей атаки', 'success');
  } else if (item === 'double') {
    if (player.guess) return error(socket, 'Риск-раунд нужно активировать до ответа');
    if (player.effects.doubleActive) return error(socket, 'Удвоение уже активно');
    player.effects.doubleActive = true;
    notify(room, player.id, 'Очки за этот раунд будут удвоены!', 'success');
  } else if (item === 'blackout') {
    const targets = [...room.players.values()].filter((candidate) => candidate.id !== player.id && (candidate.connected || candidate.isBot));
    const target = targets.find((candidate) => candidate.id === targetId) ?? targets[0];
    if (!target) return error(socket, 'В комнате пока нет соперника');
    if (target.effects.shieldActive) {
      target.effects.shieldActive = false;
      notify(room, target.id, `Анти-лаг заблокировал атаку от ${player.name}`, 'success');
      notify(room, player.id, `${target.name} заблокировал чёрный экран щитом`);
    } else {
      target.effects.blackoutUntil = Date.now() + 5000;
      notify(room, target.id, `${player.name} отправил тебе чёрный экран!`, 'attack');
      notify(room, player.id, `Чёрный экран отправлен игроку ${target.name}`, 'success');
    }
  }
  player.inventory[item] -= 1;
  broadcast(room);
}

wss.on('connection', (rawSocket: Socket) => {
  const socket = rawSocket;
  send(socket, { type: 'hello' });
  socket.on('message', (raw) => {
    let message: ClientMessage;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    try {
      if (message.type === 'create' || message.type === 'join' || message.type === 'solo') {
        removePlayer(socket, false);
        const profile = normalizeProfile(message.profile);
        if (message.type === 'join') {
          const code = message.code.toUpperCase().trim();
          const room = rooms.get(code);
          if (!room) return error(socket, 'Комната не найдена. Проверь код приглашения.');
          const existing = room.players.get(message.playerId);
          if (existing) {
            existing.connected = true;
            existing.name = message.name.trim().slice(0, 18) || existing.name;
          } else {
            if (room.status !== 'lobby') return error(socket, 'Этот матч уже начался. Попроси друзей создать новый.');
            if (room.players.size >= 8) return error(socket, 'В комнате уже 8 игроков.');
            const player = createPlayer(message.playerId || randomId(), message.name, profile, room.players.size);
            room.players.set(player.id, player);
          }
          socket.roomCode = code;
          socket.playerId = message.playerId;
          broadcast(room);
          send(socket, { type: 'joined', playerId: message.playerId });
          return;
        }
        const room = createRoom(message.settings);
        const id = message.playerId || randomId();
        const player = createPlayer(id, message.name, profile, 0);
        player.isHost = true;
        player.ready = true;
        room.hostId = id;
        room.players.set(id, player);
        socket.roomCode = room.code;
        socket.playerId = id;
        if (message.type === 'solo') {
          addBot(room);
          room.round = 1;
          beginRound(room);
        } else {
          broadcast(room);
        }
        send(socket, { type: 'joined', playerId: id });
        return;
      }

      const room = rooms.get(socket.roomCode ?? '');
      const player = room?.players.get(socket.playerId ?? '');
      if (!room || !player) return error(socket, 'Соединение с комнатой потеряно. Обнови страницу.');

      switch (message.type) {
        case 'settings': {
          if (room.hostId !== player.id || room.status !== 'lobby') return;
          room.settings = normalizeSettings(message.settings);
          broadcast(room);
          break;
        }
        case 'ready':
          player.ready = message.ready;
          broadcast(room);
          break;
        case 'addBot':
          if (room.hostId !== player.id || room.status !== 'lobby') return;
          addBot(room);
          broadcast(room);
          break;
        case 'start': {
          if (room.hostId !== player.id || room.status !== 'lobby') return;
          const notReady = [...room.players.values()].some((candidate) => !candidate.isHost && !candidate.ready);
          if (notReady) return error(socket, 'Сначала все игроки должны быть готовы');
          startMatch(room);
          break;
        }
        case 'guess': submitGuess(room, player, message.guess); break;
        case 'nextRound':
          if (room.hostId !== player.id || room.status !== 'roundResult') return;
          if (room.round >= room.settings.rounds) {
            room.status = 'finished';
            broadcast(room);
          } else {
            room.round += 1;
            beginRound(room);
          }
          break;
        case 'restart':
          if (room.hostId !== player.id || room.status !== 'finished') return;
          startMatch(room);
          break;
        case 'view':
          if (room.status !== 'playing') return;
          player.view = {
            heading: ((Number(message.view.heading) % 360) + 360) % 360,
            pitch: clamp(Number(message.view.pitch) || 0, -80, 80),
            panoId: typeof message.view.panoId === 'string' ? message.view.panoId.slice(0, 180) : null,
          };
          broadcast(room);
          break;
        case 'mapCursor':
          if (room.status !== 'playing') return;
          player.mapCursor = message.cursor && Number.isFinite(message.cursor.lat) && Number.isFinite(message.cursor.lng)
            ? { lat: clamp(message.cursor.lat, -85, 85), lng: clamp(message.cursor.lng, -180, 180) }
            : null;
          broadcast(room);
          break;
        case 'useItem': useItem(socket, room, player, message.item, message.targetId); break;
        case 'buyItem': {
          const item = SHOP_ITEMS.find((candidate) => candidate.id === message.item);
          if (!item) return;
          if (item.permanent && player.inventory[item.id] > 0) return error(socket, 'Этот предмет уже куплен');
          if (player.coins < item.cost) return error(socket, 'Не хватает монет. Точнее отвечай в раундах!');
          player.coins -= item.cost;
          player.inventory[item.id] += 1;
          notify(room, player.id, `${item.name} — покупка добавлена в рюкзак`, 'success');
          broadcast(room);
          break;
        }
        case 'chat': {
          const text = message.text.trim().slice(0, 140);
          if (!text) return;
          room.messages.push({ id: randomId(), playerId: player.id, name: player.name, color: player.color, text, at: Date.now() });
          room.messages = room.messages.slice(-50);
          broadcast(room);
          break;
        }
        case 'reaction':
          player.reaction = message.emoji.slice(0, 4);
          broadcast(room);
          setTimeout(() => {
            if (room.players.get(player.id)?.reaction === message.emoji) {
              player.reaction = null;
              broadcast(room);
            }
          }, 3500);
          break;
        case 'leave': removePlayer(socket); break;
      }
    } catch (caught) {
      console.error('WebSocket action failed:', caught);
      error(socket, 'Не удалось выполнить действие. Попробуй ещё раз.');
    }
  });

  socket.on('close', () => {
    const room = rooms.get(socket.roomCode ?? '');
    const player = room?.players.get(socket.playerId ?? '');
    if (!room || !player) return;
    player.connected = false;
    if (room.hostId === player.id) {
      const nextHost = [...room.players.values()].find((candidate) => !candidate.isBot && candidate.connected && candidate.id !== player.id);
      if (nextHost) {
        room.hostId = nextHost.id;
        room.players.forEach((candidate) => { candidate.isHost = candidate.id === nextHost.id; });
      }
    }
    broadcast(room);
  });
});

setInterval(() => {
  rooms.forEach((room) => {
    if (room.status === 'playing' && room.roundEndsAt && Date.now() >= room.roundEndsAt) finishRound(room);
    if (room.status === 'playing') {
      let moved = false;
      room.players.forEach((player) => {
        if (!player.isBot || player.guess) return;
        player.view.heading = (player.view.heading + 3 + Math.random() * 8) % 360;
        player.view.pitch = Math.sin(Date.now() / 1700 + player.id.length) * 8;
        if (Math.random() > 0.6) {
          const cursorCity = getCity(room.settings.cityIds[Math.floor(Math.random() * room.settings.cityIds.length)]);
          player.mapCursor = {
            lat: cursorCity.center[0] + (Math.random() - 0.5) * (room.settings.cityIds.length > 1 ? 8 : 0.06),
            lng: cursorCity.center[1] + (Math.random() - 0.5) * (room.settings.cityIds.length > 1 ? 12 : 0.08),
          };
        }
        moved = true;
      });
      if (moved) broadcast(room);
    }
    if (Date.now() - room.createdAt > 4 * 60 * 60 * 1000 && ![...room.players.values()].some((player) => player.connected && !player.isBot)) {
      room.botTimers.forEach(clearTimeout);
      rooms.delete(room.code);
    }
  });
}, 800);

server.listen(port, '0.0.0.0', () => {
  console.log(`\n  ГЕОСВОИ запущены: http://0.0.0.0:${port}\n  WebSocket: ws://0.0.0.0:${port}/ws\n`);
});
