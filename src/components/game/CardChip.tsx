import { isRedSuit, type Rank, type Suit } from '@shared/cards';
import { SuitIcon } from './CardFace';

// Carta em miniatura, só valor e naipe, para listas e prévias (ordem de
// manilha). O naipe é SVG, como nas cartas: nunca caractere de baralho.

interface CardChipProps {
  rank?: Rank;
  suit?: Suit;
  /** Destaca a manilha na prévia. */
  strong?: boolean;
}

const CardChip = ({ rank, suit, strong = false }: CardChipProps) => (
  <span className="card-chip" data-red={suit ? isRedSuit(suit) : false} data-strong={strong}>
    {rank && <span>{rank}</span>}
    {suit && <SuitIcon suit={suit} className="size-3.5" />}
  </span>
);

export default CardChip;
