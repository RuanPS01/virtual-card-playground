import { memo, type CSSProperties } from 'react';
import { UserX, WifiOff } from 'lucide-react';
import type { PlayerView } from '@shared/types';
import { seatColor } from '@/game/stage';
import { useT } from '@/lib/i18n';

// Outro jogador na barra superior. A mão dele chega só como contagem, então a
// etiqueta mostra mini versos. Ela também é alvo de soltura: carta solta aqui
// vai para a mão desse jogador.

interface PlayerBadgeProps {
  player: PlayerView;
  highlighted: boolean;
  onRemove(player: PlayerView): void;
}

const MAX_MINI = 5;

const PlayerBadge = memo(({ player, highlighted, onRemove }: PlayerBadgeProps) => {
  const t = useT();
  return (
    <div
      className="player-badge"
      data-drop={`player:${player.id}`}
      data-player={player.id}
      data-hover={highlighted}
      data-offline={!player.connected}
      style={{ '--seat': seatColor(player.seat) } as CSSProperties}
    >
      <span className="player-dot" />
      <span className="min-w-0 truncate">{player.name}</span>
      {!player.connected && <WifiOff className="size-3.5 shrink-0" aria-label={t('player.offline')} />}
      <span className="mini-fan" aria-hidden="true">
        {Array.from({ length: Math.min(MAX_MINI, player.handCount) }, (_, index) => (
          <span key={index} className="mini-card" />
        ))}
      </span>
      <span className="tabular-nums">{player.handCount}</span>
      {!player.connected && (
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
  );
});
PlayerBadge.displayName = 'PlayerBadge';

export default PlayerBadge;
