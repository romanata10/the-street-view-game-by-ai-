import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_PROFILE, SHOP_ITEMS, type GameSettings, type ItemId, type PlayerProfile } from '../../shared/data';
import type { ClientMessage, LatLng, PlayerView, PublicRoom, ToastEvent } from '../../shared/types';

function loadProfile(): PlayerProfile {
  try {
    const saved = JSON.parse(localStorage.getItem('geosvoi-profile') || 'null');
    if (saved) return {
      coins: Math.max(0, Number(saved.coins) || 0),
      inventory: { ...DEFAULT_PROFILE.inventory, ...saved.inventory },
    };
  } catch { /* use the starter backpack */ }
  return { coins: DEFAULT_PROFILE.coins, inventory: { ...DEFAULT_PROFILE.inventory } };
}

function savedPlayerId() {
  let id = localStorage.getItem('geosvoi-player-id');
  if (!id) {
    id = `p-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    localStorage.setItem('geosvoi-player-id', id);
  }
  return id;
}

export function useGameConnection() {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);
  const [name, setNameState] = useState(() => localStorage.getItem('geosvoi-name') || 'Географ');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastEvent | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<ClientMessage[]>([]);
  const profileRef = useRef(profile);
  const nameRef = useRef(name);
  const playerIdRef = useRef(savedPlayerId());
  const reconnectCodeRef = useRef<string | null>(null);
  const manuallyClosedRef = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  profileRef.current = profile;
  nameRef.current = name;

  const persistProfile = useCallback((next: PlayerProfile) => {
    profileRef.current = next;
    setProfile(next);
    localStorage.setItem('geosvoi-profile', JSON.stringify(next));
  }, []);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    else queueRef.current.push(message);
  }, []);

  const joinPayload = useCallback((code: string): ClientMessage => ({
    type: 'join', code, name: nameRef.current, playerId: playerIdRef.current, profile: profileRef.current,
  }), []);

  useEffect(() => {
    let disposed = false;
    manuallyClosedRef.current = false;
    const connect = () => {
      if (disposed) return;
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${location.host}/ws`);
      socketRef.current = socket;
      socket.onopen = () => {
        setConnected(true);
        const inviteCode = new URLSearchParams(location.search).get('room');
        const reconnectCode = reconnectCodeRef.current || inviteCode;
        if (reconnectCode) {
          socket.send(JSON.stringify(joinPayload(reconnectCode)));
          reconnectCodeRef.current = null;
        }
        queueRef.current.forEach((message) => socket.send(JSON.stringify(message)));
        queueRef.current = [];
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'room') {
            const nextRoom = data.room as PublicRoom;
            setRoom(nextRoom);
            reconnectCodeRef.current = nextRoom.code;
            setServerOffset(nextRoom.serverTime - Date.now());
            setError(null);
            const me = nextRoom.players.find((player) => player.id === playerIdRef.current);
            if (me && (me.coins !== profileRef.current.coins || me.inventory.hint !== profileRef.current.inventory.hint || me.inventory.blackout !== profileRef.current.inventory.blackout || me.inventory.speed !== profileRef.current.inventory.speed || me.inventory.shield !== profileRef.current.inventory.shield || me.inventory.double !== profileRef.current.inventory.double || me.inventory.optics !== profileRef.current.inventory.optics)) {
              persistProfile({ coins: me.coins, inventory: { ...me.inventory } });
            }
          } else if (data.type === 'error') {
            setError(data.text);
          } else if (data.type === 'toast') {
            setToast({ id: Date.now(), text: data.text, kind: data.kind });
          } else if (data.type === 'left') {
            setRoom(null);
            reconnectCodeRef.current = null;
          }
        } catch { /* ignore malformed network frames */ }
      };
      socket.onclose = () => {
        setConnected(false);
        if (disposed || manuallyClosedRef.current) return;
        reconnectTimer.current = setTimeout(connect, 1600);
      };
      socket.onerror = () => setConnected(false);
    };
    connect();
    return () => {
      disposed = true;
      manuallyClosedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [joinPayload, persistProfile]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const create = useCallback((settings: GameSettings) => {
    send({ type: 'create', name: nameRef.current, playerId: playerIdRef.current, profile: profileRef.current, settings });
  }, [send]);

  const solo = useCallback((settings: GameSettings) => {
    send({ type: 'solo', name: nameRef.current, playerId: playerIdRef.current, profile: profileRef.current, settings });
  }, [send]);

  const createWalk = useCallback((settings: GameSettings) => {
    send({ type: 'createWalk', name: nameRef.current, playerId: playerIdRef.current, profile: profileRef.current, settings: { ...settings, timeLimit: 0 } });
  }, [send]);

  const join = useCallback((code: string) => send(joinPayload(code)), [joinPayload, send]);

  const leave = useCallback(() => {
    send({ type: 'leave' });
    setRoom(null);
    reconnectCodeRef.current = null;
    history.replaceState({}, '', location.pathname);
  }, [send]);

  const setName = useCallback((nextName: string) => {
    const clean = nextName.trim().slice(0, 18) || 'Географ';
    nameRef.current = clean;
    setNameState(clean);
    localStorage.setItem('geosvoi-name', clean);
  }, []);

  const buyLocal = useCallback((itemId: ItemId) => {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId);
    if (!item) return false;
    const current = profileRef.current;
    if (item.permanent && current.inventory[itemId] > 0) {
      setError('Этот предмет уже есть в твоём рюкзаке');
      return false;
    }
    if (current.coins < item.cost) {
      setError('Не хватает монет. Сыграй раунд и заработай ещё!');
      return false;
    }
    persistProfile({
      coins: current.coins - item.cost,
      inventory: { ...current.inventory, [itemId]: current.inventory[itemId] + 1 },
    });
    setToast({ id: Date.now(), kind: 'success', text: `${item.name} добавлен в рюкзак` });
    return true;
  }, [persistProfile]);

  const self = room?.players.find((player) => player.id === playerIdRef.current) ?? null;

  return {
    room, self, connected, profile, name, error, toast, serverOffset,
    setName, create, solo, createWalk, join, leave, send, buyLocal,
    clearError: () => setError(null),
    actions: {
      settings: (settings: GameSettings) => send({ type: 'settings', settings }),
      ready: (ready: boolean) => send({ type: 'ready', ready }),
      addBot: () => send({ type: 'addBot' }),
      start: () => send({ type: 'start' }),
      guess: (guess: LatLng) => send({ type: 'guess', guess }),
      nextRound: () => send({ type: 'nextRound' }),
      restart: () => send({ type: 'restart' }),
      view: (view: PlayerView) => send({ type: 'view', view }),
      walkLocation: (locationId: string, panoId?: string | null, heading?: number) => send({ type: 'walkLocation', locationId, panoId, heading }),
      mapCursor: (cursor: LatLng | null) => send({ type: 'mapCursor', cursor }),
      useItem: (item: ItemId, targetId?: string) => send({ type: 'useItem', item, targetId }),
      buyItem: (item: ItemId) => send({ type: 'buyItem', item }),
      chat: (text: string) => send({ type: 'chat', text }),
      reaction: (emoji: string) => send({ type: 'reaction', emoji }),
    },
  };
}

export type GameConnection = ReturnType<typeof useGameConnection>;
