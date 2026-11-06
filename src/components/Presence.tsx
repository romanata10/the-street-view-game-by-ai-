import { MapPin, Users } from 'lucide-react';
import { viewsSharePlace } from '../../shared/presence';
import type { PublicPlayer } from '../../shared/types';

export function friendsNearby(players: PublicPlayer[], self: PublicPlayer) {
  return players.filter((player) => player.id !== self.id && (player.connected || player.isBot) && viewsSharePlace(self.view, player.view));
}

export function SamePlaceBanner({ players, self }: { players: PublicPlayer[]; self: PublicPlayer }) {
  const nearby = friendsNearby(players, self);
  if (!nearby.length) return null;
  const names = nearby.map((player) => player.name);
  const label = names.length === 1
    ? `${names[0]} находится в том же месте, где и ты`
    : `${names.slice(0, 2).join(' и ')}${names.length > 2 ? ` и ещё ${names.length - 2}` : ''} рядом с тобой`;
  return <div className="same-place-banner" role="status"><Users size={15} /><span>{label}</span><MapPin size={13} /></div>;
}
