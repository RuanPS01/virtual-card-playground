import { useState } from 'react';
import { isRedSuit, RANKS, SUITS, type Rank, type Suit } from '@shared/cards';
import { SuitIcon } from '@/components/game/CardFace';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT, type MessageKey } from '@/lib/i18n';

interface RemoveCardsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRemoveCards: (suits: Suit[], ranks: Rank[]) => void;
}

const toggle = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((other) => other !== item) : [...list, item]);

const RemoveCardsDialog = ({ isOpen, onClose, onRemoveCards }: RemoveCardsDialogProps) => {
  const t = useT();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [suits, setSuits] = useState<Suit[]>([]);

  const close = () => {
    setRanks([]);
    setSuits([]);
    onClose();
  };

  const submit = () => {
    onRemoveCards(suits, ranks);
    close();
  };

  const rankLabel = (rank: Rank): string => (['A', 'J', 'Q', 'K'].includes(rank) ? t(`rank.${rank}` as MessageKey) : rank);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('remove.title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('remove.title')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ranks">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ranks">{t('remove.byRank')}</TabsTrigger>
            <TabsTrigger value="suits">{t('remove.bySuit')}</TabsTrigger>
          </TabsList>

          <TabsContent value="ranks" className="mt-4">
            <div className="grid grid-cols-3 gap-3 min-[400px]:grid-cols-4">
              {RANKS.map((rank) => (
                <div key={rank} className="flex items-center gap-2">
                  <Checkbox id={`rank-${rank}`} checked={ranks.includes(rank)} onCheckedChange={() => setRanks((list) => toggle(list, rank))} />
                  <Label htmlFor={`rank-${rank}`} className="cursor-pointer">
                    {rankLabel(rank)}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="suits" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {SUITS.map((suit) => (
                <div key={suit} className="flex items-center gap-2">
                  <Checkbox id={`suit-${suit}`} checked={suits.includes(suit)} onCheckedChange={() => setSuits((list) => toggle(list, suit))} />
                  <Label htmlFor={`suit-${suit}`} className="flex cursor-pointer items-center gap-1.5">
                    <SuitIcon suit={suit} className={isRedSuit(suit) ? 'size-4 text-destructive' : 'size-4 text-foreground'} />
                    {t(`suit.${suit}` as MessageKey)}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={ranks.length === 0 && suits.length === 0}>
            {t('remove.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveCardsDialog;
