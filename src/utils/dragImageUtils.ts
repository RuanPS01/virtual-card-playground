import { Suit, Rank } from "@/components/Card";

/**
 * Cria uma imagem personalizada para ser usada durante o arrasto de uma carta
 */
export const createCardDragImage = (
    suit: Suit,
    rank: Rank,
    faceUp: boolean,
    dataTransfer: DataTransfer
): void => {
    if (!dataTransfer.setDragImage || typeof dataTransfer.setDragImage !== 'function') {
        return;
    }

    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.left = '0';
    dragImage.style.width = '80px';
    dragImage.style.height = '120px';
    dragImage.style.borderRadius = '4px';
    dragImage.style.overflow = 'hidden';
    dragImage.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';

    // Determinar qual carta mostrar baseado no status faceUp
    if (faceUp) {
        // Criar a frente da carta
        dragImage.style.backgroundColor = 'white';

        // Cor do naipe
        const isRed = suit === 'hearts' || suit === 'diamonds';
        const color = isRed ? '#e53e3e' : '#1a202c';

        // Criar o display de rank e naipe
        dragImage.innerHTML = `
      <div style="position: absolute; top: 5px; left: 5px; font-size: 16px; font-weight: bold; color: ${color};">
        ${rank}
      </div>
      <div style="position: absolute; top: 25px; left: 5px; font-size: 16px; color: ${color};">
        ${getSuitSymbol(suit)}
      </div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 30px; color: ${color};">
        ${getSuitSymbol(suit)}
      </div>
    `;
    } else {
        // Criar o verso da carta
        dragImage.style.backgroundImage = 'repeating-linear-gradient(45deg, #2c5282, #2c5282 5px, #2b6cb0 5px, #2b6cb0 10px)';
    }

    document.body.appendChild(dragImage);
    dataTransfer.setDragImage(dragImage, 40, 60);

    // Remover o elemento após um timeout
    setTimeout(() => {
        document.body.removeChild(dragImage);
    }, 0);
};

/**
 * Converte um naipe em seu símbolo Unicode correspondente
 */
export const getSuitSymbol = (suit: Suit): string => {
    switch (suit) {
        case 'hearts': return '♥';
        case 'diamonds': return '♦';
        case 'clubs': return '♣';
        case 'spades': return '♠';
        default: return '';
    }
};
