import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { LatLng, PublicLocation, PublicPlayer } from '../../shared/types';

interface GuessMapProps {
  center: [number, number];
  zoom: number;
  guess: LatLng | null;
  onGuess?: (guess: LatLng) => void;
  onCursor?: (cursor: LatLng | null) => void;
  players?: PublicPlayer[];
  selfId?: string;
  actual?: PublicLocation | null;
  reveal?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  className?: string;
}

function icon(html: string, className: string, size = 34) {
  return L.divIcon({ html, className: `geo-map-icon ${className}`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

export default function GuessMap({
  center, zoom, guess, onGuess, onCursor, players = [], selfId, actual, reveal = false,
  disabled = false, expanded = false, className = '',
}: GuessMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const callbacksRef = useRef({ onGuess, onCursor, disabled });
  callbacksRef.current = { onGuess, onCursor, disabled };
  const lastCursor = useRef(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center, zoom, zoomControl: false, attributionControl: true,
      worldCopyJump: true, minZoom: 2, maxZoom: 18,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd', maxZoom: 20,
    }).addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (!callbacksRef.current.disabled) callbacksRef.current.onGuess?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    map.on('mousemove', (event: L.LeafletMouseEvent) => {
      if (Date.now() - lastCursor.current < 160) return;
      lastCursor.current = Date.now();
      callbacksRef.current.onCursor?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    map.on('mouseout', () => callbacksRef.current.onCursor?.(null));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 50);
    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (reveal && actual) {
      const points: L.LatLngExpression[] = [[actual.lat, actual.lng]];
      if (guess) points.push([guess.lat, guess.lng]);
      players.forEach((player) => { if (player.guess) points.push([player.guess.lat, player.guess.lng]); });
      if (points.length > 1) map.fitBounds(L.latLngBounds(points).pad(0.3), { maxZoom: 13, animate: true });
      else map.setView([actual.lat, actual.lng], 13);
    } else {
      map.setView(center, zoom, { animate: false });
    }
  }, [center[0], center[1], zoom, reveal, actual?.lat, actual?.lng]);

  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;
    layers.clearLayers();
    if (guess) {
      const marker = L.marker([guess.lat, guess.lng], {
        icon: icon('<span class="guess-pin-core"></span>', 'guess-map-pin', 38),
        keyboard: false,
      });
      layers.addLayer(marker);
      if (reveal && actual) {
        layers.addLayer(L.polyline([[guess.lat, guess.lng], [actual.lat, actual.lng]], {
          color: '#c9f45b', weight: 2, dashArray: '7 8', opacity: 0.8,
        }));
      }
    }
    if (reveal && actual) {
      layers.addLayer(L.marker([actual.lat, actual.lng], {
        icon: icon('<span>◎</span>', 'actual-map-pin', 42), zIndexOffset: 1000,
      }));
      players.forEach((player) => {
        if (!player.guess || player.id === selfId) return;
        layers.addLayer(L.marker([player.guess.lat, player.guess.lng], {
          icon: icon(`<span style="background:${player.color}">${player.avatar}</span>`, 'player-map-pin', 34),
        }));
        layers.addLayer(L.polyline([[player.guess.lat, player.guess.lng], [actual.lat, actual.lng]], {
          color: player.color, weight: 1.5, dashArray: '4 8', opacity: 0.45,
        }));
      });
    } else {
      players.forEach((player) => {
        if (!player.mapCursor || player.id === selfId) return;
        layers.addLayer(L.marker([player.mapCursor.lat, player.mapCursor.lng], {
          icon: icon(`<span style="border-color:${player.color}">${player.avatar}</span><i style="background:${player.color}"></i>`, 'cursor-map-pin', 30),
          interactive: false, keyboard: false,
        }));
      });
    }
  }, [guess?.lat, guess?.lng, players, actual, reveal, selfId]);

  useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 280);
    return () => clearTimeout(timer);
  }, [expanded]);

  return <div ref={containerRef} className={`guess-map ${disabled ? 'map-disabled' : ''} ${className}`} aria-label="Карта для выбора ответа" />;
}
