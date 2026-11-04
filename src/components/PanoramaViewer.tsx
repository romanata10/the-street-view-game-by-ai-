import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CloudOff, Compass, Mouse, Move, Navigation, Pause, Play, ZoomIn } from 'lucide-react';
import type { PublicLocation, PublicPlayer, PlayerView } from '../../shared/types';

declare global {
  interface Window { google?: any; __geosvoiGoogleLoader?: Promise<void>; }
}

interface ViewerProps {
  location: PublicLocation;
  players: PublicPlayer[];
  selfId: string;
  optics: boolean;
  speedActive: boolean;
  onView: (view: PlayerView) => void;
}

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function loadGoogleMaps() {
  if (!GOOGLE_KEY) return Promise.reject(new Error('Не задан VITE_GOOGLE_MAPS_API_KEY'));
  if (window.google?.maps?.StreetViewPanorama) return Promise.resolve();
  if (window.__geosvoiGoogleLoader) return window.__geosvoiGoogleLoader;
  window.__geosvoiGoogleLoader = new Promise<void>((resolve, reject) => {
    const callback = `__geosvoiMaps${Date.now()}`;
    const timeout = setTimeout(() => {
      window.__geosvoiGoogleLoader = undefined;
      reject(new Error('Google Maps API не отвечает. Проверьте ключ и доступ к maps.googleapis.com.'));
    }, 15_000);
    (window as any)[callback] = () => {
      clearTimeout(timeout);
      resolve();
      delete (window as any)[callback];
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&callback=${callback}&language=ru&v=weekly`;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      window.__geosvoiGoogleLoader = undefined;
      reject(new Error('Не удалось загрузить Google Maps API. Проверьте ключ и сетевые ограничения.'));
    };
    document.head.appendChild(script);
  });
  return window.__geosvoiGoogleLoader;
}

function GoogleStreetView({ location, speedActive, onView, onLocalView, onError }: {
  location: PublicLocation;
  speedActive: boolean;
  onView: (view: PlayerView) => void;
  onLocalView: (view: PlayerView) => void;
  onError: (message: string) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any>(null);
  const speedRef = useRef(speedActive);
  speedRef.current = speedActive;
  const lastSent = useRef(0);
  const [loading, setLoading] = useState(true);
  const callbacks = useRef({ onView, onLocalView, onError });
  callbacks.current = { onView, onLocalView, onError };

  useEffect(() => {
    let alive = true;
    let panoramaTimeout: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    const fail = (message: string) => {
      if (!alive) return;
      setLoading(false);
      callbacks.current.onError(message);
    };
    loadGoogleMaps().then(() => {
      if (!alive || !elementRef.current || !window.google) return;
      const maps = window.google.maps;
      const service = new maps.StreetViewService();
      panoramaTimeout = setTimeout(() => fail('Google Street View не ответил вовремя. Показываем резервную сцену.'), 12_000);
      service.getPanorama({
        location: { lat: location.lat, lng: location.lng },
        radius: 250,
        preference: maps.StreetViewPreference.NEAREST,
        source: maps.StreetViewSource.OUTDOOR,
      }, (data: any, status: string) => {
        if (panoramaTimeout) clearTimeout(panoramaTimeout);
        if (!alive || !elementRef.current) return;
        if (status !== maps.StreetViewStatus.OK || !data?.location?.pano) {
          fail('Для этой точки Google не нашёл панораму в радиусе 250 м. Показываем резервную сцену.');
          return;
        }
        const canNavigate = location.provider === 'street';
        const panorama = new maps.StreetViewPanorama(elementRef.current, {
          pano: data.location.pano,
          pov: { heading: location.heading, pitch: 0 },
          zoom: 0,
          addressControl: false,
          showRoadLabels: false,
          fullscreenControl: false,
          motionTracking: false,
          clickToGo: canNavigate,
          linksControl: canNavigate,
          scrollwheel: true,
          panControl: false,
          enableCloseButton: false,
        });
        panoramaRef.current = panorama;
        const publish = () => {
          const pov = panorama.getPov();
          const view: PlayerView = {
            heading: ((pov.heading % 360) + 360) % 360,
            pitch: pov.pitch || 0,
            panoId: panorama.getPano(),
          };
          callbacks.current.onLocalView(view);
          if (Date.now() - lastSent.current > 130) {
            callbacks.current.onView(view);
            lastSent.current = Date.now();
          }
        };
        panorama.addListener('pov_changed', publish);
        panorama.addListener('position_changed', publish);
        panorama.addListener('pano_changed', publish);
        const nudge = (event: Event) => {
          const pov = panorama.getPov();
          panorama.setPov({ heading: pov.heading + (event as CustomEvent<number>).detail * (speedRef.current ? 1.6 : 1), pitch: pov.pitch });
        };
        window.addEventListener('geosvoi-nudge', nudge);
        panorama.__geosvoiNudge = nudge;
        setLoading(false);
        publish();
      });
    }).catch((caught: Error) => fail(caught.message));
    return () => {
      alive = false;
      if (panoramaTimeout) clearTimeout(panoramaTimeout);
      const panorama = panoramaRef.current;
      if (panorama?.__geosvoiNudge) window.removeEventListener('geosvoi-nudge', panorama.__geosvoiNudge);
      if (panorama && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(panorama);
      panoramaRef.current = null;
      elementRef.current?.replaceChildren();
    };
  }, [location.lat, location.lng, location.heading, location.provider]);

  return (
    <div className="google-street-view">
      <div className="google-panorama-mount" ref={elementRef} />
      {loading && <div className="google-map-loading"><span className="spinner" /><b>Загружаем Google Street View…</b><small>Ищем ближайшую реальную панораму</small></div>}
    </div>
  );
}

function ThreePanorama({ location, optics, speedActive, onView, onLocalView }: {
  location: PublicLocation;
  optics: boolean;
  speedActive: boolean;
  onView: (view: PlayerView) => void;
  onLocalView: (view: PlayerView) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{ camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; lon: number; lat: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, lon: 0, lat: 0 });
  const lastSent = useRef(0);
  const callbacks = useRef({ onView, onLocalView });
  callbacks.current = { onView, onLocalView };

  const publish = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const view = { heading: ((engine.lon % 360) + 360) % 360, pitch: engine.lat };
    callbacks.current.onLocalView(view);
    if (Date.now() - lastSent.current > 120) {
      callbacks.current.onView(view);
      lastSent.current = Date.now();
    }
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      setLoading(false);
      return;
    }
    setFailed(false);
    setLoading(true);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.replaceChildren(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 110);
    const geometry = new THREE.SphereGeometry(50, 64, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: '#26332c' });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(location.image, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.color.set('#ffffff');
      material.needsUpdate = true;
      setLoading(false);
    }, undefined, () => {
      setFailed(true);
      setLoading(false);
    });
    const engine = { camera, renderer, lon: location.heading, lat: 0 };
    engineRef.current = engine;
    let animationId = 0;
    const render = () => {
      const phi = THREE.MathUtils.degToRad(90 - engine.lat);
      const theta = THREE.MathUtils.degToRad(engine.lon);
      camera.lookAt(
        50 * Math.sin(phi) * Math.cos(theta),
        50 * Math.cos(phi),
        50 * Math.sin(phi) * Math.sin(theta),
      );
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(render);
    };
    render();
    publish();
    const observer = new ResizeObserver(() => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    observer.observe(mount);
    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
      material.map?.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      engineRef.current = null;
    };
  }, [location.image, location.heading]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(event.key)) return;
      if (event.target instanceof HTMLElement && event.target.matches('input, textarea')) return;
      event.preventDefault();
      const step = speedActive ? 14 : 7;
      if (event.key === 'ArrowLeft' || event.key === 'a') engine.lon -= step;
      if (event.key === 'ArrowRight' || event.key === 'd') engine.lon += step;
      if (event.key === 'ArrowUp' || event.key === 'w') engine.lat = Math.min(75, engine.lat + step / 2);
      if (event.key === 'ArrowDown' || event.key === 's') engine.lat = Math.max(-75, engine.lat - step / 2);
      publish();
    };
    const handleNudge = (event: Event) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.lon += (event as CustomEvent<number>).detail * (speedActive ? 1.6 : 1);
      publish();
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('geosvoi-nudge', handleNudge);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('geosvoi-nudge', handleNudge);
    };
  }, [speedActive]);

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, lon: engine.lon, lat: engine.lat };
    setDragging(true);
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine || !dragging) return;
    const sensitivity = speedActive ? 0.19 : 0.11;
    engine.lon = (dragRef.current.x - event.clientX) * sensitivity + dragRef.current.lon;
    engine.lat = Math.max(-78, Math.min(78, (event.clientY - dragRef.current.y) * sensitivity + dragRef.current.lat));
    publish();
  };
  const pointerUp = () => setDragging(false);
  const wheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    const min = optics ? 24 : 45;
    engine.camera.fov = Math.max(min, Math.min(88, engine.camera.fov + event.deltaY * 0.035));
    engine.camera.updateProjectionMatrix();
  };

  return (
    <div
      className={`three-panorama ${dragging ? 'is-dragging' : ''}`}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onWheel={wheel}
      style={failed ? { backgroundImage: `url(${location.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      <div ref={mountRef} className="three-canvas-mount" />
      {loading && <div className="panorama-loading"><span className="spinner" /><b>Прокладываем маршрут…</b></div>}
      {!loading && !failed && <div className="panorama-gesture-hint"><Mouse size={15} /> Тяни, чтобы осмотреться <span>•</span> Колесо — zoom</div>}
    </div>
  );
}

export default function PanoramaViewer({ location, players, selfId, optics, speedActive, onView }: ViewerProps) {
  const [localView, setLocalView] = useState<PlayerView>({ heading: location.heading, pitch: 0 });
  const [googleFailed, setGoogleFailed] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const useGoogle = Boolean(GOOGLE_KEY) && !googleFailed;

  useEffect(() => {
    setLocalView({ heading: location.heading, pitch: 0 });
    setGoogleFailed(false);
    setFallbackReason(null);
    setAutoRotate(false);
  }, [location.id, location.heading, location.provider]);

  const friends = players.filter((player) => {
    if (player.id === selfId || (!player.connected && !player.isBot)) return false;
    if (!useGoogle || player.isBot) return true;
    return Boolean(player.view.panoId && localView.panoId && player.view.panoId === localView.panoId);
  });
  const visibleFriends = friends.map((player) => {
    const delta = ((player.view.heading - localView.heading + 540) % 360) - 180;
    return { player, delta };
  }).filter(({ delta }) => Math.abs(delta) < 68);

  const nudge = (direction: number) => {
    window.dispatchEvent(new CustomEvent('geosvoi-nudge', { detail: direction }));
    setLocalView((current) => ({ ...current, heading: (current.heading + direction + 360) % 360 }));
  };

  useEffect(() => {
    if (!autoRotate) return;
    const timer = setInterval(() => nudge(2), 90);
    return () => clearInterval(timer);
  }, [autoRotate]);

  return (
    <div className="panorama-viewer">
      {useGoogle ? (
        <GoogleStreetView location={location} speedActive={speedActive} onView={onView} onLocalView={setLocalView} onError={(message) => { setFallbackReason(message); setGoogleFailed(true); }} />
      ) : (
        <ThreePanorama key={`${location.image}-${location.heading}`} location={location} optics={optics} speedActive={speedActive} onView={onView} onLocalView={setLocalView} />
      )}
      <div className="panorama-vignette" />
      {fallbackReason && <div className="google-fallback-notice"><CloudOff size={15} /><span>{fallbackReason}</span></div>}
      <div className="panorama-friends" aria-label="Друзья в панораме">
        {visibleFriends.map(({ player, delta }) => (
          <div
            className="panorama-friend"
            key={player.id}
            style={{ left: `${50 + delta / 136 * 100}%`, top: `${43 + (localView.pitch - player.view.pitch) * 0.22}%`, '--player-color': player.color } as React.CSSProperties}
          >
            <div className="friend-direction"><Navigation size={11} fill="currentColor" style={{ transform: `rotate(${player.view.heading}deg)` }} /></div>
            <div className="friend-avatar">{player.avatar}</div>
            <span>{player.name}</span>
          </div>
        ))}
      </div>
      <div className="panorama-compass">
        <button className="icon-button glass" onClick={() => nudge(-35)} aria-label="Повернуть влево"><Move size={16} /></button>
        <div className="compass-readout"><Compass size={15} /><span>{['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'][Math.round(localView.heading / 45) % 8]}</span><b>{Math.round(localView.heading)}°</b></div>
        <button className="icon-button glass" onClick={() => nudge(35)} aria-label="Повернуть вправо"><Move size={16} /></button>
      </div>
      <div className="panorama-bottom-tools">
        <span className="optics-label"><ZoomIn size={14} /> {useGoogle ? `Google · ${location.provider === 'points' ? 'фиксированная точка' : 'Street View'}` : optics ? 'Оптика PRO' : 'Обычный zoom'}</span>
        <button className={`icon-button glass ${autoRotate ? 'active' : ''}`} onClick={() => setAutoRotate(!autoRotate)} title="Автообзор">
          {autoRotate ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>
    </div>
  );
}
