import { memo, type CSSProperties } from 'react';
import { UserX, WifiOff } from 'lucide-react';
import { seatColor } from '@/game/stage';
import { useT } from '@/lib/i18n';
import type { OpponentProps } from './PlayerBadge';

// Visão padrão de um adversário: a mão dele em miniatura, como um leque de
// versos, com o nome embaixo. Mesmo papel da PlayerBadge (alvo de soltura e
// âncora das animações), só muda o desenho. A troca fica no menu, em "Adversários".

/** Acima disto o leque não ganha mais cartas, só fica mais fechado: cabe no celular. */
const MAX_VISIBLE = 12;

const OpponentFan = memo(({ player, highlighted, onRemove, anchor = true }: OpponentProps) => {
  const t = useT();
  const visible = Math.min(MAX_VISIBLE, player.handCount);
  // O leque abre mais conforme a mão cresce, até um limite.
  const style = {
    '--seat': seatColor(player.seat),
    '--fan-angle': `${Math.min(30, visible * 4)}deg`,
    '--fan-spread': `${Math.min(1.25, visible * 0.16)}`,
  } as CSSProperties;

  return (
    <div
      className="opp-fan"
      data-drop={`player:${player.id}`}
      data-player={anchor ? player.id : undefined}
      data-hover={highlighted}
      data-offline={!player.connected}
      style={style}
    >
      <div className="opp-fan-cards" aria-hidden="true">
        {visible === 0 ? (
          <span className="opp-fan-empty" />
        ) : (
          Array.from({ length: visible }, (_, index) => (
            <span
              key={index}
              className="opp-fan-card"
              style={{ '--t': visible > 1 ? (index / (visible - 1)) * 2 - 1 : 0 } as CSSProperties}
            />
          ))
        )}
      </div>
      <div className="opp-fan-name">
        <span className="player-dot" />
        <span className="min-w-0 truncate">{player.name}</span>
        <span className="tabular-nums opacity-80">{player.handCount}</span>
        {!player.connected && <WifiOff className="size-3.5 shrink-0" aria-label={t('player.offline')} />}
        {!player.connected && onRemove && (
          <button
            type="button"
            className="player-remove"
            onClick={() => onRemove(player)}
            aria-label={t('player.remove', { name: player.name })}
            title={t('player.remove', { name: player.name })}
          >
            <UserX className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});
OpponentFan.displayName = 'OpponentFan';

export default OpponentFan;
