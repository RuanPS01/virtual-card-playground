import { memo } from 'react';
import { isRedSuit, type Rank, type Suit } from '@shared/cards';

// Desenho da carta. Os naipes são SVG, e não os caracteres Unicode de baralho:
// em vários celulares esses caracteres viram emoji colorido e quebram o estilo.
// Todas as medidas são em `em`, e o sprite define o font-size a partir da
// largura da carta. Assim o mesmo desenho serve do celular ao desktop.

const HEART =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

export const SuitIcon = ({ suit, className }: { suit: Suit; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    {suit === 'hearts' && <path d={HEART} />}
    {suit === 'diamonds' && <path d="M12 1.5 20.5 12 12 22.5 3.5 12z" />}
    {suit === 'clubs' && (
      <>
        <circle cx="12" cy="6.8" r="4.5" />
        <circle cx="6.6" cy="13.6" r="4.5" />
        <circle cx="17.4" cy="13.6" r="4.5" />
        <path d="M12 10.5 9 22.5h6z" />
      </>
    )}
    {suit === 'spades' && (
      <>
        <path d={HEART} transform="translate(12 10.4) scale(0.88) rotate(180) translate(-12 -12)" />
        <path d="M12 12 8.8 22.5h6.4z" />
      </>
    )}
  </svg>
);

const COURT: readonly Rank[] = ['J', 'Q', 'K'];

interface CardFrontProps {
  suit: Suit | null;
  rank: Rank | null;
}

export const CardFront = memo(({ suit, rank }: CardFrontProps) => {
  // Carta fechada chega sem naipe e valor. A frente fica em branco e só o
  // verso aparece.
  if (!suit || !rank) return <div className="pc-face pc-front" />;
  const index = (
    <>
      <span className="pc-rank">{rank}</span>
      <SuitIcon suit={suit} className="pc-suit-s" />
    </>
  );
  return (
    <div className="pc-face pc-front" data-red={isRedSuit(suit)}>
      <div className="pc-index pc-index-tl">{index}</div>
      <div className="pc-center">
        {COURT.includes(rank) ? (
          <div className="pc-court">
            <span>{rank}</span>
            <SuitIcon suit={suit} className="pc-suit-m" />
          </div>
        ) : (
          <SuitIcon suit={suit} className={rank === 'A' ? 'pc-suit-xl' : 'pc-suit-l'} />
        )}
      </div>
      <div className="pc-index pc-index-br">{index}</div>
    </div>
  );
});
CardFront.displayName = 'CardFront';

/** `flat` é o verso avulso, fora do par frente e verso que gira. */
export const CardBack = memo(({ flat = false }: { flat?: boolean }) => (
  <div className={flat ? 'pc-face pc-back pc-back-flat' : 'pc-face pc-back'}>
    <div className="pc-back-inner" />
  </div>
));
CardBack.displayName = 'CardBack';
