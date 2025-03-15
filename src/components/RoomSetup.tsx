
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Card from './Card';

interface RoomSetupProps {
  onJoinRoom: (playerName: string, roomId: string) => void;
  onCreateRoom: (playerName: string) => void;
}

const RoomSetup: React.FC<RoomSetupProps> = ({ onJoinRoom, onCreateRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'join' | 'create' | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      toast.error('Por favor, digite seu nome.');
      return;
    }
    
    if (mode === 'join') {
      if (!roomId.trim()) {
        toast.error('Por favor, digite o código da sala.');
        return;
      }
      onJoinRoom(playerName, roomId);
    } else {
      onCreateRoom(playerName);
    }
  };
  
  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-center mb-8">
        <div className="relative flex space-x-4">
          <motion.div 
            className="absolute w-full h-full"
            animate={{ rotate: [0, 5, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div 
                key={i}
                className="absolute"
                style={{ 
                  top: `${i * 5}px`, 
                  left: `${i * 5}px`,
                  rotate: `${(i - 2) * 10}deg`,
                  zIndex: i
                }}
                animate={{ y: [0, -2, 2, -2, 0] }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatType: 'reverse', 
                  ease: 'easeInOut',
                  delay: i * 0.2
                }}
              >
                <Card 
                  suit={['hearts', 'diamonds', 'clubs', 'spades'][i % 4] as any} 
                  rank={['A', 'K', 'Q', 'J', '10'][i % 5] as any} 
                  faceUp={true} 
                  draggable={false}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      
      <div className="glass p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-semibold text-center mb-6">Mesa de Cartas Virtual</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Seu nome</Label>
            <Input
              id="name"
              placeholder="Digite seu nome"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full"
            />
          </div>
          
          {mode === 'join' && (
            <div className="space-y-2">
              <Label htmlFor="roomId">Código da sala</Label>
              <Input
                id="roomId"
                placeholder="Digite o código da sala"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full"
              />
            </div>
          )}
          
          {mode === null ? (
            <div className="flex flex-col space-y-3">
              <Button 
                type="button" 
                onClick={() => setMode('create')}
                className="w-full"
              >
                Criar nova sala
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setMode('join')}
                className="w-full"
              >
                Entrar em uma sala
              </Button>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              <Button type="submit" className="w-full">
                {mode === 'create' ? 'Criar sala' : 'Entrar na sala'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setMode(null)}
                className="w-full"
              >
                Voltar
              </Button>
            </div>
          )}
        </form>
      </div>
    </motion.div>
  );
};

export default RoomSetup;
