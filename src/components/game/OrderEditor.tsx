import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useT } from '@/lib/i18n';

// Lista ordenável por toque: seleciona um item e move com os botões. Arrastar
// itens pequenos dentro de um diálogo é impreciso no celular; tocar e mover é
// garantido em qualquer tela.

interface OrderEditorProps<T> {
  items: readonly T[];
  keyOf(item: T): string;
  render(item: T): ReactNode;
  labelOf(item: T): string;
  onChange(items: T[]): void;
  /** Com ele, aparece o botão de remover o item selecionado. */
  removable?: boolean;
}

const OrderEditor = <T,>({ items, keyOf, render, labelOf, onChange, removable = false }: OrderEditorProps<T>) => {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const index = items.findIndex((item) => keyOf(item) === selected);

  const move = (delta: number) => {
    const target = index + delta;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = () => {
    if (index < 0) return;
    onChange(items.filter((_, i) => i !== index));
    setSelected(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="listbox">
        {items.map((item) => {
          const key = keyOf(item);
          return (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={key === selected}
              aria-label={labelOf(item)}
              className="order-item"
              onClick={() => setSelected(key === selected ? null : key)}
            >
              {render(item)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="chip-btn" disabled={index <= 0} onClick={() => move(-1)}>
          <ChevronLeft />
          <span>{t('manilha.weaker')}</span>
        </button>
        <button type="button" className="chip-btn" disabled={index < 0 || index >= items.length - 1} onClick={() => move(1)}>
          <span>{t('manilha.stronger')}</span>
          <ChevronRight />
        </button>
        {removable && (
          <button type="button" className="chip-btn" disabled={index < 0} onClick={remove}>
            <Trash2 />
            <span>{t('manilha.remove')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderEditor;
