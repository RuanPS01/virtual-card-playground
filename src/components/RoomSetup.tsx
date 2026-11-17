import { useState, type CSSProperties, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Rank, Suit } from '@shared/cards';
import { normalizeRoomCode, ROOM_CODE_LENGTH } from '@shared/ids';
import { MAX_NAME_LENGTH } from '@shared/types';
import { CardFront } from '@/components/game/CardFace';
import SwirlBackground from '@/components/game/effects/SwirlBackground';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getLocale, setLocale, useT } from '@/lib/i18n';
import type { TransportKind } from '@/lib/realtime';
import { loadName, roomFromUrl } from '@/lib/realtime/session';

// Tela de entrada: criar uma sala ou entrar em uma existente. Quem chega por
// um link de convite (?sala=CODIGO) já cai no modo de entrar, com o código
// preenchido.

interface RoomSetupProps {
  busy: boolean;
  /** Código da sala sendo retomada depois de recarregar a página. */
  resumingRoom: string | null;
  transport: TransportKind;
  onJoinRoom: (roomId: string, playerName: string) => void;
  onCreateRoom: (playerName: string) => void;
}

const SHOWCASE: Array<{ suit: Suit; rank: Rank }> = [
  { suit: 'spades', rank: '10' },
  { suit: 'hearts', rank: 'J' },
  { suit: 'clubs', rank: 'Q' },
  { suit: 'diamonds', rank: 'K' },
  { suit: 'spades', rank: 'A' },
];

const RoomSetup = ({ busy, resumingRoom, transport, onJoinRoom, onCreateRoom }: RoomSetupProps) => {
  const t = useT();
  const [invited] = useState(() => normalizeRoomCode(roomFromUrl()));
  const [playerName, setPlayerName] = useState(loadName);
  const [roomId, setRoomId] = useState(invited);
  const [mode, setMode] = useState<'join' | 'create' | null>(invited ? 'join' : null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = playerName.trim();
    if (!name) return void toast.error(t('lobby.needName'));
    if (mode === 'join') {
      if (roomId.length < ROOM_CODE_LENGTH) return void toast.error(t('lobby.needCode'));
      onJoinRoom(roomId, name);
    } else {
      onCreateRoom(name);
    }
  };

  return (
    <div className="lobby">
      <SwirlBackground />
      <div className="stage-crt" aria-hidden="true" />

      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      >
        <div className="lobby-fan" aria-hidden="true">
          {SHOWCASE.map((card, index) => (
            <div
              key={card.rank}
              className="lobby-card"
              style={{ '--i': index - 2, '--bob-delay': `${-index * 0.7}s` } as CSSProperties}
            >
              <div className="pc-bob">
                <CardFront suit={card.suit} rank={card.rank} />
              </div>
            </div>
          ))}
        </div>

        <div className="panel p-5 sm:p-6">
          <h1 className="text-center text-3xl leading-tight text-primary">{t('app.title')}</h1>
          <p className="mt-1 text-center text-base leading-snug text-muted-foreground">{t('lobby.subtitle')}</p>

          {busy ? (
            <div className="flex flex-col items-center gap-3 py-8" role="status">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm">{resumingRoom ? t('lobby.resuming', { room: resumingRoom }) : t('lobby.connecting')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t('lobby.name')}</Label>
                <Input
                  id="name"
                  autoComplete="nickname"
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={t('lobby.namePlaceholder')}
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                />
              </div>

              {mode === 'join' && (
                <div className="space-y-1.5">
                  <Label htmlFor="roomId">{t('lobby.code')}</Label>
                  <Input
                    id="roomId"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={t('lobby.codePlaceholder')}
                    value={roomId}
                    onChange={(event) => setRoomId(normalizeRoomCode(event.target.value))}
                    className="text-center text-lg font-bold tracking-[0.3em]"
                  />
                </div>
              )}

              {/* As chaves impedem o React de reaproveitar o mesmo <button>
                  entre os dois grupos. Sem elas, o clique em "Criar nova sala"
                  troca o type para submit no meio do evento e envia o form. */}
              {mode === null ? (
                <div key="choose" className="flex flex-col gap-3">
                  <Button type="button" onClick={() => setMode('create')}>
                    {t('lobby.create')}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setMode('join')}>
                    {t('lobby.join')}
                  </Button>
                </div>
              ) : (
                <div key="confirm" className="flex flex-col gap-3">
                  <Button type="submit">{mode === 'create' ? t('lobby.submitCreate') : t('lobby.submitJoin')}</Button>
                  <Button type="button" variant="outline" onClick={() => setMode(null)}>
                    {t('lobby.back')}
                  </Button>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center gap-2 text-center text-sm text-foreground/80">
          <p>{t('lobby.hint')}</p>
          <div className="flex items-center gap-3">
            <span>{transport === 'ws' ? t('lobby.modeWs') : t('lobby.modeFirebase')}</span>
            <button
              type="button"
              className="chip-btn"
              onClick={() => setLocale(getLocale() === 'pt-BR' ? 'en' : 'pt-BR')}
              aria-label={t('lobby.language')}
            >
              <Languages />
              <span>{getLocale() === 'pt-BR' ? 'PT' : 'EN'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RoomSetup;
