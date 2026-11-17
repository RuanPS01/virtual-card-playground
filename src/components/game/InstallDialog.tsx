import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT, type MessageKey } from '@/lib/i18n';
import type { InstallMethod } from '@/lib/pwa';

// Instalação do app. Onde o navegador oferece o pedido de instalação (Chrome,
// Edge, Android), ele abre direto. Onde não oferece (Safari do iPhone,
// Firefox), este diálogo explica o caminho pelo menu do navegador.

const STEPS: Record<Exclude<InstallMethod, 'prompt'>, MessageKey[]> = {
  ios: ['install.ios.1', 'install.ios.2', 'install.ios.3'],
  manual: ['install.manual.1', 'install.manual.2'],
};

interface InstallDialogProps {
  open: boolean;
  method: InstallMethod;
  onOpenChange(open: boolean): void;
}

const InstallDialog = ({ open, method, onOpenChange }: InstallDialogProps) => {
  const t = useT();
  const steps = STEPS[method === 'ios' ? 'ios' : 'manual'];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('install.title')}</DialogTitle>
          <DialogDescription>{t('install.benefits')}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-2.5 text-sm leading-snug">
          {steps.map((key, index) => (
            <li key={key} className="flex gap-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="pt-0.5">{t(key)}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
};

export default InstallDialog;
