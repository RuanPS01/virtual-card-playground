import { CircleHelp, Languages, LogOut, Menu, PackageMinus, PackagePlus, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getLocale, setLocale, useT } from '@/lib/i18n';
import { setMuted, useMuted } from '@/lib/sfx';

// Ações da mesa que não são de uso constante ficam em um menu só. No celular
// não há largura para uma coluna de botões flutuantes sobre a mesa.

export interface GameMenuProps {
  onAddDeck(): void;
  onRemoveCards(): void;
  onReset(): void;
  onHelp(): void;
  onLeave(): void;
}

const GameMenu = ({ onAddDeck, onRemoveCards, onReset, onHelp, onLeave }: GameMenuProps) => {
  const t = useT();
  const muted = useMuted();
  const locale = getLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="hud-pill" aria-label={t('hud.menu')}>
          <Menu className="size-4" />
          <span className="hidden sm:inline">{t('hud.menu')}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onSelect={onAddDeck}>
          <PackagePlus className="size-4" />
          {t('menu.addDeck')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRemoveCards}>
          <PackageMinus className="size-4" />
          {t('menu.removeCards')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onReset}>
          <RotateCcw className="size-4" />
          {t('menu.reset')}
        </DropdownMenuItem>
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
