import type { PlayerView } from './types';

/**
 * Google navigation is authoritative when both players have a panorama ID.
 * The built-in location is the fallback for Three.js and while Google is loading.
 */
export function viewsSharePlace(first: PlayerView, second: PlayerView) {
  if (first.panoId && second.panoId) return first.panoId === second.panoId;
  return Boolean(first.locationId && second.locationId && first.locationId === second.locationId);
}
