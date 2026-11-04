import { useState } from 'react';
import { Check, Infinity as InfinityIcon, LockKeyhole, ShoppingBag } from 'lucide-react';
import { SHOP_ITEMS, type ItemId, type PlayerProfile } from '../../shared/data';
import { CoinBalance, ItemIcon, Modal } from './UI';

interface ShopProps {
  onClose: () => void;
  profile: PlayerProfile;
  onBuy: (item: ItemId) => void;
  inGame?: boolean;
}

export default function ShopModal({ onClose, profile, onBuy, inGame = false }: ShopProps) {
  const [filter, setFilter] = useState<'all' | 'help' | 'attack' | 'boost'>('all');
  const items = SHOP_ITEMS.filter((item) => filter === 'all' || item.category === filter);
  return (
    <Modal onClose={onClose} className="shop-modal" label="Магазин гео-гаджетов">
      <div className="shop-heading">
        <div>
          <span className="eyebrow"><ShoppingBag size={14} /> ГЕО-ГАДЖЕТЫ</span>
          <h2>Рюкзак первого<br />географа</h2>
          <p>Немного хитрости ещё никому не мешало.</p>
        </div>
        <div className="shop-wallet"><small>ТВОЙ БАЛАНС</small><CoinBalance value={profile.coins} /></div>
      </div>
      <div className="shop-filters">
        {([['all', 'Все гаджеты'], ['help', 'Помощь'], ['attack', 'Против друзей'], ['boost', 'Усиления']] as const).map(([id, label]) => (
          <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      <div className="shop-grid">
        {items.map((item) => {
          const owned = profile.inventory[item.id];
          const permanentOwned = item.permanent && owned > 0;
          const affordable = profile.coins >= item.cost;
          return (
            <article className={`shop-item shop-${item.category}`} key={item.id}>
              <div className="shop-item-top">
                <span className="shop-item-icon"><ItemIcon id={item.id} size={25} /></span>
                {item.permanent ? <span className="item-badge"><InfinityIcon size={12} /> Навсегда</span> : <span className="item-badge">В рюкзаке: {owned}</span>}
              </div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <button
                className={`buy-button ${permanentOwned ? 'owned' : ''}`}
                onClick={() => onBuy(item.id)}
                disabled={permanentOwned || (!affordable && !permanentOwned)}
              >
                {permanentOwned ? <><Check size={16} /> Куплено</> : !affordable ? <><LockKeyhole size={14} /> Не хватает</> : <><CoinBalance value={item.cost} /><span>Купить</span></>}
              </button>
            </article>
          );
        })}
      </div>
      <div className="shop-footer-note"><span>◎</span>{inGame ? 'Покупки сразу попадут в рюкзак и сохранятся после матча.' : 'Монеты начисляются за каждый ответ, точность и победу в раунде.'}</div>
    </Modal>
  );
}
