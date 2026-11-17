import { CircleHelp, Crown, Download, Languages, ListFilter, ListRestart, LogOut, Menu, PackageMinus, PackagePlus, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FELTS, setFelt, useFelt, type Felt } from '@/lib/felt';
import { getLocale, setLocale, useT } from '@/lib/i18n';
import { OPPONENT_VIEWS, setOpponentsView, useOpponentsView, type OpponentsView } from '@/lib/opponentsView';
import { setMuted, useMuted } from '@/lib/sfx';

// Ações da mesa que não são de uso constante ficam em um menu só. No celular
// não há largura para uma coluna de botões flutuantes sobre a mesa.

export interface GameMenuProps {
  onAddDeck(): void;
  onRemoveDeck(): void;
  /** Falso quando a sala tem um baralho ou menos: não há o que remover. */
  canRemoveDeck: boolean;
  onRemoveCards(): void;
  onResetOriginal(): void;
  onManilha(): void;
  /** Nome da ordem de manilha atual da sala, mostrado ao lado do item. */
  manilhaLabel: string;
  onReset(): void;
  onHelp(): void;
  /** Ausente quando o app já está instalado e aberto como app. */
  onInstall?(): void;
  onLeave(): void;
}

const GameMenu = ({
  onAddDeck,
  onRemoveDeck,
  canRemoveDeck,
  onRemoveCards,
  onReset,
  onResetOriginal,
  onManilha,
  manilhaLabel,
  onHelp,
  onInstall,
  onLeave,
}: GameMenuProps) => {
  const t = useT();
  const muted = useMuted();
  const locale = getLocale();
  const felt = useFelt();
  const opponents = useOpponentsView();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="hud-pill" aria-label={t('hud.menu')}>
          <Menu className="size-4" />
          <span className="hidden sm:inline">{t('hud.menu')}</span>
        </button>
      </DropdownMenuTrigger>
      {/* Rola por dentro quando não cabe na altura (celular deitado). */}
      <DropdownMenuContent align="end" className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-64 overflow-y-auto">
        <DropdownMenuItem onSelect={onAddDeck}>
          <PackagePlus className="size-4" />
          {t('menu.addDeck')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRemoveDeck} disabled={!canRemoveDeck}>
          <PackageMinus className="size-4" />
          {t('menu.removeDeck')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRemoveCards}>
          <ListFilter className="size-4" />
          {t('menu.removeCards')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onReset}>
          <RotateCcw className="size-4" />
          {t('menu.reset')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onResetOriginal}>
          <ListRestart className="size-4" />
          {t('menu.resetOriginal')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onManilha}>
          <Crown className="size-4" />
          <span className="flex-1">{t('menu.manilha')}</span>
          <span className="text-xs text-muted-foreground">{manilhaLabel}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground">{t('menu.felt')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={felt} onValueChange={(value) => setFelt(value as Felt)}>
          {FELTS.map((option) => (
            <DropdownMenuRadioItem
              key={option}
              value={option}
              className="gap-2"
              // Mantém o menu aberto para comparar as duas mesas na hora.
              onSelect={(event) => event.preventDefault()}
            >
              <span className="felt-swatch" data-felt={option} />
              {t(`felt.${option}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuLabel className="text-muted-foreground">{t('menu.opponents')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={opponents} onValueChange={(value) => setOpponentsView(value as OpponentsView)}>
          {OPPONENT_VIEWS.map((option) => (
            <DropdownMenuRadioItem key={option} value={option} className="gap-2" onSelect={(event) => event.preventDefault()}>
              {t(`opponents.${option}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            // Mantém o menu aberto: dá para ouvir o efeito de ligar o som.
            event.preventDefault();
            setMuted(!muted);
          }}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          {muted ? t('menu.soundOff') : t('menu.soundOn')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR');
          }}
        >
          <Languages className="size-4" />
          {t('lobby.language')}: {locale === 'pt-BR' ? 'Português' : 'English'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onHelp}>
          <CircleHelp className="size-4" />
          {t('menu.help')}
        </DropdownMenuItem>
        {onInstall && (
          <DropdownMenuItem onSelect={onInstall}>
            <Download className="size-4" />
            {t('menu.install')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLeave} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" />
          {t('menu.leave')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GameMenu;
