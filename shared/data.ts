export type BattleMode = 'classic' | 'closest' | 'blitz';
export type PanoramaMode = 'street' | 'points' | 'mixed';
export type ItemId = 'hint' | 'blackout' | 'speed' | 'shield' | 'double' | 'optics';

export interface City {
  id: string;
  name: string;
  country: string;
  flag: string;
  image: string;
  center: [number, number];
  zoom: number;
  accent: string;
  tagline: string;
  hint: string;
}

export interface GameSettings {
  cityIds: string[];
  battleMode: BattleMode;
  panoramaMode: PanoramaMode;
  rounds: number;
  timeLimit: number;
}

export interface Inventory {
  hint: number;
  blackout: number;
  speed: number;
  shield: number;
  double: number;
  optics: number;
}

export interface PlayerProfile {
  coins: number;
  inventory: Inventory;
}

export const DEFAULT_PROFILE: PlayerProfile = {
  coins: 1250,
  inventory: { hint: 2, blackout: 1, speed: 1, shield: 0, double: 0, optics: 0 },
};

export const CITIES: City[] = [
  {
    id: 'novosibirsk', name: 'Новосибирск', country: 'Россия', flag: '🇷🇺',
    image: '/panoramas/novosibirsk-center.jpg', center: [55.0302, 82.9203], zoom: 12,
    accent: '#d8f27b', tagline: 'Широкие проспекты и сибирский характер',
    hint: 'Город стоит на реке Обь. Ищи театр, который называют «Сибирским Колизеем».',
  },
  {
    id: 'moscow', name: 'Москва', country: 'Россия', flag: '🇷🇺',
    image: '/panoramas/moscow-center.jpg', center: [55.7539, 37.6208], zoom: 11,
    accent: '#ff8e78', tagline: 'Исторические улицы и ритм мегаполиса',
    hint: 'Красные кирпичные стены недалеко. Этот город никогда не был на Обском море.',
  },
  {
    id: 'omsk', name: 'Омск', country: 'Россия', flag: '🇷🇺',
    image: '/panoramas/omsk-center.jpg', center: [54.9849, 73.3674], zoom: 12,
    accent: '#8ed8ff', tagline: 'Купеческая архитектура на Иртыше',
    hint: 'Город на слиянии Оми и Иртыша. Здесь писали о Достоевском и смотрят на «Любину».',
  },
  {
    id: 'new-york', name: 'Нью-Йорк', country: 'США', flag: '🇺🇸',
    image: '/panoramas/new-york-center.jpg', center: [40.758, -73.9855], zoom: 12,
    accent: '#ffc765', tagline: 'Жёлтые такси, неон и небоскрёбы',
    hint: 'Ищи перекрёсток Бродвея и Седьмой авеню. Жёлтые такси здесь — не совпадение.',
  },
  {
    id: 'tokyo', name: 'Токио', country: 'Япония', flag: '🇯🇵',
    image: '/panoramas/tokyo-center.jpg', center: [35.6595, 139.7005], zoom: 12,
    accent: '#f39ac2', tagline: 'Неоновые кварталы и идеальный порядок',
    hint: 'Знаменитый перекрёсток находится рядом со станцией и статуей пса Хатико.',
  },
  {
    id: 'paris', name: 'Париж', country: 'Франция', flag: '🇫🇷',
    image: '/panoramas/paris-center.jpg', center: [48.8584, 2.2945], zoom: 12,
    accent: '#b9a8ff', tagline: 'Кафе, балконы и прогулки у Сены',
    hint: 'Железная дама наблюдает за этим местом. Ответь на берегу Сены.',
  },
];

export interface ShopItem {
  id: ItemId;
  name: string;
  description: string;
  cost: number;
  permanent?: boolean;
  category: 'help' | 'attack' | 'boost';
  icon: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hint', name: 'Гео-подсказка', description: 'Откроет короткую подсказку о месте. Можно использовать один раз за раунд.', cost: 150, category: 'help', icon: 'lightbulb' },
  { id: 'blackout', name: 'Чёрный экран', description: 'Закроет панораму соперника на 5 секунд. Щит блокирует атаку.', cost: 250, category: 'attack', icon: 'zap' },
  { id: 'speed', name: 'Турбо-шаг', description: 'Ускорит поворот и перемещение по улицам на 45 секунд.', cost: 200, category: 'boost', icon: 'gauge' },
  { id: 'shield', name: 'Анти-лаг', description: 'Один раз защитит от чёрного экрана. Активируется до конца раунда.', cost: 300, category: 'help', icon: 'shield' },
  { id: 'double', name: 'Риск-раунд', description: 'Удвоит очки за текущий раунд. Активируй до своего ответа.', cost: 450, category: 'boost', icon: 'sparkles' },
  { id: 'optics', name: 'Оптика PRO', description: 'Навсегда открывает усиленный zoom в панораме. Покупается один раз.', cost: 800, permanent: true, category: 'help', icon: 'telescope' },
];

export const BATTLE_LABELS: Record<BattleMode, { name: string; description: string }> = {
  classic: { name: 'Классика', description: 'Больше очков за точность' },
  closest: { name: 'Кто ближе', description: 'Победа в раунде — одно очко' },
  blitz: { name: 'Блиц', description: '45 секунд и бонус за скорость' },
};

export function getCity(id: string) {
  return CITIES.find((city) => city.id === id) ?? CITIES[0];
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radius = 6371;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

export function calculateScore(distance: number, worldScale = false) {
  if (!Number.isFinite(distance)) return 0;
  if (distance < 0.025) return 5000;
  const scale = worldScale ? 1200 : 28;
  return Math.max(0, Math.round(5000 * Math.exp(-distance / scale)));
}

export function cityCountLabel(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return 'город';
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'города';
  return 'городов';
}

export function formatDistance(distance: number | null | undefined) {
  if (distance === null || distance === undefined) return 'Нет ответа';
  if (distance < 1) return `${Math.max(1, Math.round(distance * 1000))} м`;
  if (distance < 100) return `${distance.toFixed(distance < 10 ? 2 : 1)} км`;
  return `${Math.round(distance).toLocaleString('ru-RU')} км`;
}
