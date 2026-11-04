import { useEffect, type ReactNode } from 'react';
import { Coins, Gauge, Lightbulb, MapPin, Shield, Sparkles, Telescope, X, Zap } from 'lucide-react';
import type { ItemId } from '../../shared/data';
import type { PublicPlayer, ToastEvent } from '../../shared/types';

export function Logo({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  return (
    <button className={`brand ${compact ? 'brand-compact' : ''}`} onClick={onClick} aria-label="ГЕОСВОИ — на главную">
      <span className="brand-mark"><MapPin size={compact ? 20 : 24} strokeWidth={2.8} /></span>
      {!compact && <span className="brand-word">ГЕО<span>СВОИ</span></span>}
    </button>
  );
}

export function CoinBalance({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`coin-balance ${className}`}><span className="coin-icon"><Coins size={15} /></span>{value.toLocaleString('ru-RU')}</span>;
}

export function Avatar({ player, size = 'medium', showStatus = false }: { player: Pick<PublicPlayer, 'avatar' | 'color' | 'name' | 'connected' | 'reaction'>; size?: 'small' | 'medium' | 'large'; showStatus?: boolean }) {
  return (
    <span className={`player-avatar avatar-${size}`} style={{ '--avatar-color': player.color } as React.CSSProperties} title={player.name}>
      <span>{player.avatar}</span>
      {showStatus && <i className={player.connected ? 'online' : 'offline'} />}
      {player.reaction && <b className="avatar-reaction">{player.reaction}</b>}
    </span>
  );
}

export function ItemIcon({ id, size = 22 }: { id: ItemId; size?: number }) {
  const props = { size, strokeWidth: 1.9 };
  if (id === 'hint') return <Lightbulb {...props} />;
  if (id === 'blackout') return <Zap {...props} />;
  if (id === 'speed') return <Gauge {...props} />;
  if (id === 'shield') return <Shield {...props} />;
  if (id === 'double') return <Sparkles {...props} />;
  return <Telescope {...props} />;
}

export function Modal({ children, onClose, className = '', label }: { children: ReactNode; onClose: () => void; className?: string; label: string }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', close);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal-card ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        <button className="modal-close icon-button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        {children}
      </section>
    </div>
  );
}

export function Toast({ toast }: { toast: ToastEvent | null }) {
  if (!toast) return null;
  return (
    <div className={`global-toast toast-${toast.kind}`} key={toast.id} role="status">
      <span>{toast.kind === 'attack' ? <Zap size={18} /> : toast.kind === 'success' ? <Sparkles size={18} /> : <MapPin size={18} />}</span>
      {toast.text}
    </div>
  );
}
