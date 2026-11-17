import { motion } from 'framer-motion';
import type { PlayerView } from '@shared/types';
import type { OpponentsView } from '@/lib/opponentsView';
import { useT } from '@/lib/i18n';
import OpponentFan from './OpponentFan';
import PlayerBadge from './PlayerBadge';

// Barra de jogadores ampliada. Aparece por cima do topo da tela quando uma
// carta arrastada chega perto dele, com os alvos bem maiores: no celular a
// etiqueta normal é pequena demais para acertar com o dedo e ver para quem a
// carta vai. Fica dentro da camada de cartas, logo abaixo da carta segurada,
// e não empurra o layout (a mesa não se mexe enquanto ela aparece).

interface PlayerReachBarProps {
  players: PlayerView[];
  view: OpponentsView;
  hover: string | null;
}

const PlayerReachBar = ({ players, view, hover }: PlayerReachBarProps) => {
  const t = useT();
  const Item = view === 'fans' ? OpponentFan : PlayerBadge;
  const target = players.find((player) => hover === `player:${player.id}`);
  return (
    <motion.div
      className="player-reach"
      data-view={view}
      initial={{ opacity: 0, y: -24, scaleY: 0.7 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: -16, scaleY: 0.8, transition: { duration: 0.14 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 30 }}
    >
      <span className="player-reach-title">{target ? t('reach.titleTo', { name: target.name }) : t('reach.title')}</span>
      <div className="player-reach-row">
        {players.map((player) => (
          <Item key={player.id} player={player} highlighted={hover === `player:${player.id}`} anchor={false} />
        ))}
      </div>
    </motion.div>
  );
};

export default PlayerReachBar;
