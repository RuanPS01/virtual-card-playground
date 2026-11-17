import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT, type MessageKey } from '@/lib/i18n';

// Os gestos da mesa não têm botão visível (tocar para virar, soltar sobre
// outra carta para agrupar), então precisam estar escritos em algum lugar.

const ITEMS: MessageKey[] = [
  'help.draw',
  'help.drag',
  'help.flip',
  'help.group',
  'help.reorder',
  'help.face',
  'help.give',
  'help.return',
];

interface HelpDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

const HelpDialog = ({ open, onOpenChange }: HelpDialogProps) => {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('help.title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('help.title')}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2.5 text-sm leading-snug">
          {ITEMS.map((key) => (
            <li key={key} className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
