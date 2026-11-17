import { useEffect, useState } from 'react';
import { RANKS, SUITS, type Rank, type Suit } from '@shared/cards';
import {
  MANILHA_PRESETS,
  manilhaRankForVira,
  presetConfig,
  VIRA_RANKS,
  type ManilhaCard,
  type ManilhaConfig,
  type ManilhaPreset,
} from '@shared/manilha';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT, type MessageKey } from '@/lib/i18n';
import CardChip from './CardChip';
import OrderEditor from './OrderEditor';

// Ordem de manilha da sala: predefinições (paulista, com vira, mineiro,
// gaúcho) ou personalizada. Vale para os leques ordenados "por manilha" e
// para todos os jogadores. O motor recalcula as predefinições; o diálogo só
// mostra a prévia e envia a escolha.

interface ManilhaDialogProps {
  open: boolean;
  current: ManilhaConfig;
  onOpenChange(open: boolean): void;
  onApply(config: ManilhaConfig): void;
}

const suitName = (suit: Suit): MessageKey => `suit.${suit}` as MessageKey;

const ManilhaDialog = ({ open, current, onOpenChange, onApply }: ManilhaDialogProps) => {
  const t = useT();
  const [draft, setDraft] = useState<ManilhaConfig>(current);
  const [newRank, setNewRank] = useState<Rank>('4');
  const [newSuit, setNewSuit] = useState<Suit>('clubs');

  // Cada vez que abre, começa da configuração atual da sala.
  useEffect(() => {
    if (open) setDraft(current);
  }, [open, current]);

  const choose = (preset: ManilhaPreset) => {
    // Personalizado parte do que está na tela, para ajustar uma predefinição.
    setDraft(preset === 'custom' ? { ...draft, preset: 'custom', vira: null } : presetConfig(preset, draft.vira ?? '3'));
  };

  const cardLabel = (card: ManilhaCard) => `${card.rank} ${t(suitName(card.suit))}`;
  const isManilha = (card: ManilhaCard) => draft.manilhas.some((m) => m.rank === card.rank && m.suit === card.suit);
  const canAdd = !isManilha({ rank: newRank, suit: newSuit });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('manilha.title')}</DialogTitle>
          <DialogDescription>{t('manilha.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2" role="radiogroup" aria-label={t('manilha.title')}>
          {MANILHA_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={draft.preset === preset}
              className="preset-option"
              onClick={() => choose(preset)}
            >
              <span className="font-bold">{t(`manilha.preset.${preset}`)}</span>
              <span className="text-xs leading-snug text-muted-foreground">{t(`manilha.hint.${preset}`)}</span>
            </button>
          ))}
        </div>

        {draft.preset === 'vira' && (
          <section className="space-y-2">
            <h3 className="text-sm font-bold">{t('manilha.vira')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {VIRA_RANKS.map((rank) => (
                <button
                  key={rank}
                  type="button"
                  className="order-item"
                  aria-pressed={draft.vira === rank}
                  aria-selected={draft.vira === rank}
                  onClick={() => setDraft(presetConfig('vira', rank))}
                >
                  <CardChip rank={rank} />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{t('manilha.viraResult', { rank: manilhaRankForVira(draft.vira ?? '3') })}</p>
          </section>
        )}

        {draft.preset === 'custom' && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{t('manilha.selectHint')}</p>
            <section className="space-y-2">
              <h3 className="text-sm font-bold">{t('manilha.ranks')}</h3>
              <OrderEditor
                items={draft.ranks}
                keyOf={(rank) => rank}
                labelOf={(rank) => rank}
                render={(rank) => <CardChip rank={rank} />}
                onChange={(ranks) => setDraft({ ...draft, ranks })}
              />
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-bold">{t('manilha.suits')}</h3>
              <OrderEditor
                items={draft.suits}
                keyOf={(suit) => suit}
                labelOf={(suit) => t(suitName(suit))}
                render={(suit) => <CardChip suit={suit} />}
                onChange={(suits) => setDraft({ ...draft, suits })}
              />
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-bold">{t('manilha.manilhas')}</h3>
              {draft.manilhas.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('manilha.noManilhas')}</p>
              ) : (
                <OrderEditor
                  items={draft.manilhas}
                  keyOf={(card) => `${card.rank}:${card.suit}`}
                  labelOf={cardLabel}
                  render={(card) => <CardChip rank={card.rank} suit={card.suit} strong />}
                  onChange={(manilhas) => setDraft({ ...draft, manilhas })}
                  removable
                />
              )}
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border-2 border-dashed p-2">
                <select
                  aria-label={t('manilha.addRank')}
                  className="h-8 rounded-md border-2 bg-card px-2 text-sm"
                  value={newRank}
                  onChange={(event) => setNewRank(event.target.value as Rank)}
                >
                  {RANKS.map((rank) => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t('manilha.addSuit')}
                  className="h-8 rounded-md border-2 bg-card px-2 text-sm"
                  value={newSuit}
                  onChange={(event) => setNewSuit(event.target.value as Suit)}
                >
                  {SUITS.map((suit) => (
                    <option key={suit} value={suit}>
                      {t(suitName(suit))}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="chip-btn"
                  disabled={!canAdd}
                  onClick={() => setDraft({ ...draft, manilhas: [...draft.manilhas, { rank: newRank, suit: newSuit }] })}
                >
                  {t('manilha.add')}
                </button>
              </div>
            </section>
          </div>
        )}

        <section className="space-y-1.5 rounded-lg bg-muted/60 p-3">
          <h3 className="text-xs font-bold text-muted-foreground">{t('manilha.preview')}</h3>
          <div className="flex flex-wrap items-center gap-1">
            {draft.ranks.map((rank) => (
              <CardChip key={rank} rank={rank} />
            ))}
            {draft.manilhas.map((card) => (
              <CardChip key={`${card.rank}:${card.suit}`} rank={card.rank} suit={card.suit} strong />
            ))}
          </div>
          {draft.manilhas.length > 0 && <p className="text-xs text-muted-foreground">{t('manilha.previewHint')}</p>}
        </section>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            {t('manilha.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManilhaDialog;
