import { FELTS, setFelt, useFelt } from '@/lib/felt';
import { useT } from '@/lib/i18n';

// Escolha da cor da mesa na tela de entrada: duas amostras de feltro. Dentro
// do jogo a mesma escolha fica no menu (GameMenu), como opção de rádio.
const FeltPicker = () => {
  const t = useT();
  const felt = useFelt();
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={t('menu.felt')}>
      {FELTS.map((option) => (
        <button
          key={option}
          type="button"
          className="felt-swatch felt-swatch-btn"
          data-felt={option}
          aria-pressed={felt === option}
          aria-label={`${t('menu.felt')}: ${t(`felt.${option}`)}`}
          title={t(`felt.${option}`)}
          onClick={() => setFelt(option)}
        />
      ))}
    </div>
  );
};

export default FeltPicker;
