import { ArrowDownUp } from 'lucide-react';
import { PILE_SORTS, type PileSort } from '@shared/pileOrder';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/lib/i18n';

// Botão de ordem do leque, ao lado da alça do grupo. Livre é o padrão: o
// jogador arrasta as cartas para onde quiser. Valor e manilha ordenam sozinhos
// e continuam ordenando quando cartas entram ou saem; voltar para livre
// recupera a ordem manual.

interface PileSortMenuProps {
  sort: PileSort;
  onChange(sort: PileSort): void;
}

const PileSortMenu = ({ sort, onChange }: PileSortMenuProps) => {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="pile-sort chip-btn"
          data-active={sort !== 'manual'}
          aria-label={`${t('pileSort.title')}: ${t(`pileSort.short.${sort}`)}`}
          title={t('pileSort.title')}
          // A alça ao lado começa o arrasto no pointerdown; o botão não pode.
          onPointerDown={(event) => event.stopPropagation()}
        >
          <ArrowDownUp />
          <span>{t(`pileSort.short.${sort}`)}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-muted-foreground">{t('pileSort.title')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onChange(value as PileSort)}>
          {PILE_SORTS.map((option) => (
            <DropdownMenuRadioItem key={option} value={option} className="flex-col items-start gap-0">
              <span>{t(`pileSort.${option}`)}</span>
              <span className="text-xs text-muted-foreground">{t(`pileSort.hint.${option}`)}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PileSortMenu;
