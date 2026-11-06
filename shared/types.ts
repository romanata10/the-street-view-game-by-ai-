import type { GameSettings, Inventory, ItemId, PanoramaMode } from './data';

export type RoomStatus = 'lobby' | 'playing' | 'roundResult' | 'finished';
export type RoomMode = 'match' | 'walk';
export interface LatLng { lat: number; lng: number }

export interface PlayerView {
  heading: number;
  pitch: number;
  /** Google Street View panorama ID; used to show teammates only in the same scene. */
  panoId?: string | null;
  /** Built-in location selected by the player, including independent free-walk locations. */
  locationId?: string | null;
}

export interface PlayerEffects {
  blackoutUntil: number;
  speedUntil: number;
  shieldActive: boolean;
  doubleActive: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  ready: boolean;
  score: number;
  roundWins: number;
  coins: number;
  coinsEarned: number;
  inventory: Inventory;
  view: PlayerView;
  /** Requested Google panorama and initial heading for the current free-walk stop. */
  walkPanoId?: string | null;
  walkHeading?: number | null;
  mapCursor: LatLng | null;
  guess: LatLng | null;
  distance: number | null;
  roundScore: number;
  guessedAt: number | null;
  effects: PlayerEffects;
  hint: string | null;
  reaction: string | null;
}

export interface PublicLocation {
  id: string;
  name: string;
  cityId: string;
  lat: number;
  lng: number;
  image: string;
  heading: number;
  provider: Exclude<PanoramaMode, 'mixed'>;
  /** Optional exact Google panorama used by favorites and the “go to friend” action. */
  panoId?: string | null;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  color: string;
  text: string;
  at: number;
}

export interface PublicRoom {
  code: string;
  mode: RoomMode;
  status: RoomStatus;
  settings: GameSettings;
  players: PublicPlayer[];
  hostId: string;
  round: number;
  currentLocation: PublicLocation | null;
  roundStartedAt: number | null;
  roundEndsAt: number | null;
  serverTime: number;
  messages: ChatMessage[];
}

export type ClientMessage =
  | { type: 'create'; name: string; playerId: string; profile: { coins: number; inventory: Inventory }; settings: GameSettings }
  | { type: 'createWalk'; name: string; playerId: string; profile: { coins: number; inventory: Inventory }; settings: GameSettings }
  | { type: 'join'; name: string; playerId: string; code: string; profile: { coins: number; inventory: Inventory } }
  | { type: 'solo'; name: string; playerId: string; profile: { coins: number; inventory: Inventory }; settings: GameSettings }
  | { type: 'settings'; settings: GameSettings }
  | { type: 'ready'; ready: boolean }
  | { type: 'addBot' }
  | { type: 'start' }
  | { type: 'guess'; guess: LatLng }
  | { type: 'nextRound' }
  | { type: 'restart' }
  | { type: 'view'; view: PlayerView }
  | { type: 'walkLocation'; locationId: string; panoId?: string | null; heading?: number }
  | { type: 'mapCursor'; cursor: LatLng | null }
  | { type: 'useItem'; item: ItemId; targetId?: string }
  | { type: 'buyItem'; item: ItemId }
  | { type: 'chat'; text: string }
  | { type: 'reaction'; emoji: string }
  | { type: 'leave' };

export interface ToastEvent {
  id: number;
  kind: 'info' | 'success' | 'attack';
  text: string;
}
