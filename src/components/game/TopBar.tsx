import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PlayerView, RoomView } from '@shared/types';
import { useT } from '@/lib/i18n';
import type { ConnectionStatus } from '@/lib/realtime';
import { inviteLink } from '@/lib/realtime/session';
import GameMenu, { type GameMenuProps } from './GameMenu';
import PlayerBadge from './PlayerBadge';

// Barra superior: código da sala, os outros jogadores e o menu. Em tela
// estreita os jogadores descem para uma segunda linha (flex-wrap), sem
// nenhum ponto de quebra em JavaScript.

interface TopBarProps extends GameMenuProps {
  view: RoomView;
  status: ConnectionStatus;
  hover: string | null;
  onRemovePlayer(player: PlayerView): void;
}

const TopBar = ({ view, status, hover, onRemovePlayer, ...menu }: TopBarProps) => {
  const t = useT();
  const others = view.players.filter((player) => player.id !== view.me);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink(view.roomId));
      toast.success(t('toast.linkCopied'));
    } catch {
      // Sem permissão de área de transferência (iframe, HTTP): mostra o código.
      toast.message(t('toast.copyFailed', { room: view.roomId }));
    }
  };

  return (
    <header className="hud-top">
      <button type="button" className="hud-pill order-1" onClick={copyInvite} title={t('hud.copyInvite')}>
        <span className="text-muted-foreground">{t('hud.room')}</span>
        <span className="font-bold tracking-[0.18em] text-primary">{view.roomId}</span>
        <Copy className="size-3.5 opacity-70" />
      </button>

      {status === 'reconnecting' && (
        <span className="hud-pill order-1 text-primary" role="status">
          <Loader2 className="size-3.5 animate-spin" />
          <span className="hidden min-[420px]:inline">{t('hud.reconnecting')}</span>
        </span>
      )}

      <div className="hud-players order-3 basis-full sm:order-2 sm:basis-0">
        {others.length === 0 ? (
          <span className="px-2 text-sm text-foreground/70">{t('hud.alone')}</span>
        ) : (
          others.map((player) => (
            <PlayerBadge key={player.id} player={player} highlighted={hover === `player:${player.id}`} onRemove={onRemovePlayer} />
          ))
        )}
      </div>

      <div className="order-2 ml-auto sm:order-3 sm:ml-0">
        <GameMenu {...menu} />
      </div>
    </header>
  );
};

export default TopBar;
