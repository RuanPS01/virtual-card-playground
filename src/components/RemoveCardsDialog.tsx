
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Suit, Rank } from './Card';
import { SUITS, RANKS } from '@/utils/cardUtils';

interface RemoveCardsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRemoveCards: (suits: Suit[], ranks: Rank[]) => void;
}

const RemoveCardsDialog: React.FC<RemoveCardsDialogProps> = ({
  isOpen,
  onClose,
  onRemoveCards
}) => {
  const [selectedRanks, setSelectedRanks] = useState<Rank[]>([]);
  const [selectedSuits, setSelectedSuits] = useState<Suit[]>([]);
  
  const handleToggleRank = (rank: Rank) => {
    setSelectedRanks(prev => 
      prev.includes(rank) 
        ? prev.filter(r => r !== rank)
        : [...prev, rank]
    );
  };
  
  const handleToggleSuit = (suit: Suit) => {
    setSelectedSuits(prev => 
      prev.includes(suit) 
        ? prev.filter(s => s !== suit)
        : [...prev, suit]
    );
  };
  
  const handleRemove = () => {
    onRemoveCards(selectedSuits, selectedRanks);
    setSelectedRanks([]);
    setSelectedSuits([]);
    onClose();
  };
  
  const handleCancel = () => {
    setSelectedRanks([]);
    setSelectedSuits([]);
    onClose();
  };
  
  const getSuitDisplay = (suit: Suit) => {
    switch (suit) {
      case 'hearts': return <span className="text-red-600">♥ Copas</span>;
      case 'diamonds': return <span className="text-red-600">♦ Ouros</span>;
      case 'clubs': return <span className="text-black">♣ Paus</span>;
      case 'spades': return <span className="text-black">♠ Espadas</span>;
    }
  };
  
  const getRankDisplay = (rank: Rank) => {
    switch (rank) {
      case 'A': return 'Ás';
      case 'J': return 'Valete';
      case 'Q': return 'Dama';
      case 'K': return 'Rei';
      default: return rank;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remover cartas do baralho</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="ranks">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ranks">Por Valor</TabsTrigger>
            <TabsTrigger value="suits">Por Naipe</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ranks" className="space-y-4 mt-4">
            <div className="grid grid-cols-4 gap-4">
              {RANKS.map(rank => (
                <div key={rank} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`rank-${rank}`}
                    checked={selectedRanks.includes(rank)}
                    onCheckedChange={() => handleToggleRank(rank)}
                  />
                  <Label htmlFor={`rank-${rank}`} className="cursor-pointer">
                    {getRankDisplay(rank)}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="suits" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {SUITS.map(suit => (
                <div key={suit} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`suit-${suit}`}
                    checked={selectedSuits.includes(suit)}
                    onCheckedChange={() => handleToggleSuit(suit)}
                  />
                  <Label htmlFor={`suit-${suit}`} className="cursor-pointer">
                    {getSuitDisplay(suit)}
                  </Label>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex space-x-2 sm:justify-end">
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleRemove} disabled={selectedRanks.length === 0 && selectedSuits.length === 0}>
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveCardsDialog;
