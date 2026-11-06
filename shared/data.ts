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

export interface CityLocation {
  id: string;
  cityId: string;
  name: string;
  lat: number;
  lng: number;
  image: string;
  hint: string;
  heading: number;
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
  {
    id: 'saint-petersburg', name: 'Санкт-Петербург', country: 'Россия', flag: '🇷🇺',
    image: '/panoramas/saint-petersburg-palace.jpg', center: [59.939, 30.3158], zoom: 12,
    accent: '#74e0c1', tagline: 'Северная столица и гранитные набережные',
    hint: 'Город стоит на Неве. Здесь белые ночи, разводные мосты и очень много гранита.',
  },
  {
    id: 'istanbul', name: 'Стамбул', country: 'Турция', flag: '🇹🇷',
    image: '/panoramas/istanbul-sultanahmet.jpg', center: [41.0054, 28.9768], zoom: 12,
    accent: '#ffb374', tagline: 'Два континента, минареты и Босфор',
    hint: 'Город встречает сразу два континента. Ищи Босфор, чаек и красные трамваи.',
  },
];

export const LOCATIONS: CityLocation[] = [
  { id: 'novosibirsk-opera', cityId: 'novosibirsk', name: 'Площадь Ленина · театр оперы и балета', lat: 55.0302, lng: 82.9203, image: '/panoramas/novosibirsk-center.jpg', heading: 0, hint: 'Город стоит на Оби. В кадре — здание, которое местные называют «Сибирским Колизеем».' },
  { id: 'novosibirsk-embankment', cityId: 'novosibirsk', name: 'Михайловская набережная · Обь', lat: 55.0089, lng: 82.9015, image: '/panoramas/novosibirsk-embankment.jpg', heading: 35, hint: 'Широкая река — Обь. Точка находится на правобережной набережной столицы Сибири.' },
  { id: 'moscow-red-square', cityId: 'moscow', name: 'Красная площадь · исторический центр', lat: 55.7539, lng: 37.6208, image: '/panoramas/moscow-center.jpg', heading: 0, hint: 'Красные кирпичные стены и кремлёвские башни находятся в самом центре столицы.' },
  { id: 'moscow-lane', cityId: 'moscow', name: 'Пятницкая улица · Замоскворечье', lat: 55.7417, lng: 37.6137, image: '/panoramas/moscow-lane.jpg', heading: 90, hint: 'Тихий исторический квартал к югу от Кремля. Ищи Пятницкую улицу в Замоскворечье.' },
  { id: 'omsk-center', cityId: 'omsk', name: 'Улица Ленина · исторический центр', lat: 54.9849, lng: 73.3674, image: '/panoramas/omsk-center.jpg', heading: 0, hint: 'Город на слиянии Оми и Иртыша. Историческая застройка встречается вдоль улицы Ленина.' },
  { id: 'omsk-embankment', cityId: 'omsk', name: 'Набережная Иртыша', lat: 54.9784, lng: 73.374, image: '/panoramas/omsk-embankment.jpg', heading: 135, hint: 'Перед тобой Иртыш. Нужная набережная находится недалеко от места впадения реки Омь.' },
  { id: 'new-york-times-square', cityId: 'new-york', name: 'Таймс-сквер · Манхэттен', lat: 40.758, lng: -73.9855, image: '/panoramas/new-york-center.jpg', heading: 0, hint: 'Ищи перекрёсток Бродвея и Седьмой авеню. Жёлтые такси здесь — не совпадение.' },
  { id: 'new-york-brooklyn', cityId: 'new-york', name: 'Бруклин · квартал браунстоунов', lat: 40.6782, lng: -73.9442, image: '/panoramas/new-york-brooklyn.jpg', heading: 45, hint: 'Типичные каменные дома с высокими крыльцами находятся не на Манхэттене, а в Бруклине.' },
  { id: 'tokyo-shibuya', cityId: 'tokyo', name: 'Сибуя · знаменитый перекрёсток', lat: 35.6595, lng: 139.7005, image: '/panoramas/tokyo-center.jpg', heading: 0, hint: 'Знаменитый перекрёсток находится рядом со станцией и статуей пса Хатико.' },
  { id: 'tokyo-yanaka', cityId: 'tokyo', name: 'Янака · старый квартал', lat: 35.7273, lng: 139.7663, image: '/panoramas/tokyo-yanaka.jpg', heading: 180, hint: 'Старый квартал Янака в районе Тайто сохранил деревянные дома и маленькие храмы.' },
  { id: 'paris-eiffel', cityId: 'paris', name: 'Эйфелева башня · Марсово поле', lat: 48.8584, lng: 2.2945, image: '/panoramas/paris-center.jpg', heading: 0, hint: 'Железная дама наблюдает за этим местом. Ответь на берегу Сены.' },
  { id: 'paris-montmartre', cityId: 'paris', name: 'Монмартр · Сакре-Кёр', lat: 48.8867, lng: 2.3431, image: '/panoramas/paris-montmartre.jpg', heading: 270, hint: 'Белая базилика на холме — Сакре-Кёр. Это Монмартр, к северу от центра города.' },
  { id: 'saint-petersburg-palace', cityId: 'saint-petersburg', name: 'Дворцовая площадь · Эрмитаж', lat: 59.939, lng: 30.3158, image: '/panoramas/saint-petersburg-palace.jpg', heading: 0, hint: 'Зелёно-белый дворец — здание Эрмитажа. Александровская колонна стоит на Дворцовой площади.' },
  { id: 'saint-petersburg-canal', cityId: 'saint-petersburg', name: 'Канал Грибоедова · гранитная набережная', lat: 59.934, lng: 30.327, image: '/panoramas/saint-petersburg-canal.jpg', heading: 90, hint: 'Этот канал назван в честь автора «Горя от ума». Недалеко — Спас на Крови.' },
  { id: 'istanbul-sultanahmet', cityId: 'istanbul', name: 'Султанахмет · Голубая мечеть', lat: 41.0054, lng: 28.9768, image: '/panoramas/istanbul-sultanahmet.jpg', heading: 0, hint: 'Шесть минаретов принадлежат Голубой мечети. Точка находится в историческом районе Султанахмет.' },
  { id: 'istanbul-karakoy', cityId: 'istanbul', name: 'Каракёй · Галатская башня', lat: 41.0255, lng: 28.974, image: '/panoramas/istanbul-karakoy.jpg', heading: 225, hint: 'Башня на холме — Галатская. Ищи район Каракёй рядом с Золотым Рогом и Босфором.' },
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

export function getLocation(id: string) {
  return LOCATIONS.find((location) => location.id === id) ?? LOCATIONS[0];
}

export function getCityLocations(cityIds: string[]) {
  return LOCATIONS.filter((location) => cityIds.includes(location.cityId));
}

/** Stable provider choice for independent free-walk stops and saved favorites. */
export function getWalkProvider(mode: PanoramaMode, locationId: string): Exclude<PanoramaMode, 'mixed'> {
  if (mode !== 'mixed') return mode;
  const hash = [...locationId].reduce((total, letter) => total + letter.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'street' : 'points';
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

export function pointCountLabel(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) return 'точка';
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'точки';
  return 'точек';
}

export function formatDistance(distance: number | null | undefined) {
  if (distance === null || distance === undefined) return 'Нет ответа';
  if (distance < 1) return `${Math.max(1, Math.round(distance * 1000))} м`;
  if (distance < 100) return `${distance.toFixed(distance < 10 ? 2 : 1)} км`;
  return `${Math.round(distance).toLocaleString('ru-RU')} км`;
}
