import React from 'react';
import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import Card, { Suit, Rank } from './Card';
import { cn } from '@/lib/utils';

export interface GroupedCard {
    id: string;
    suit: Suit;
    rank: Rank;
    faceUp: boolean;
}

export interface CardGroupType {
    id: string;
    cards: GroupedCard[];
    x: number;
    y: number;
    mode: 'fan' | 'stack';
}

interface CardGroupProps {
    cards: GroupedCard[];
    x: number;
    y: number;
    mode: 'fan' | 'stack';
    onDragStart: (cardId: string, suit: Suit, rank: Rank) => void;
    groupId: string;
    onRemoveCard?: (groupId: string, cardIndex: number) => void;
}

const CardGroup: React.FC<CardGroupProps> = ({
    cards,
    x,
    y,
    mode,
    onDragStart,
    groupId,
    onRemoveCard
}) => {
    const [rotation] = React.useState(() => Math.random() * 20 - 10);
    const [lastClickTime, setLastClickTime] = React.useState<number>(0);
    const [lastClickedCard, setLastClickedCard] = React.useState<number>(-1);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, card: GroupedCard, index: number) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'card',
            id: card.id,
            suit: card.suit,
            rank: card.rank,
            faceUp: card.faceUp,
            isGrouped: true,
            groupId: groupId,
            groupIndex: index
        }));

        onDragStart(card.id, card.suit, card.rank);
    };

    const handleCardClick = (index: number) => {
        const now = Date.now();
        // Check if this is a double click (within 300ms)
        if (lastClickedCard === index && now - lastClickTime < 300) {
            console.log("Double click detected on card", index, "in group", groupId);
            if (onRemoveCard) {
                onRemoveCard(groupId, index);
            }
        }
        setLastClickTime(now);
        setLastClickedCard(index);
    };

    // Calcula a posição do botão de arrasto com base no modo e no número de cartas
    const getHandlePosition = () => {
        if (mode === 'fan') {
            const lastCardOffset = (cards.length - 1) * 25;
            const lastCardYOffset = (cards.length - 1) * 5;
            return {
                x: lastCardOffset + 10, // Posicionar após a última carta
                y: lastCardYOffset + 140 // Posicionar na parte inferior do grupo
            };
        } else {
            // Modo stack
            return {
                x: 10, // Centralizar no grupo
                y: 140 // Posicionar na parte inferior
            };
        }
    };

    const handlePosition = getHandlePosition();

    return (
        <motion.div
            className="absolute"
            style={{
                left: x,
                top: y,
                zIndex: 10,
            }}
            initial={{
                scale: 0.8,
                opacity: 0,
                rotate: rotation
            }}
            animate={{
                scale: 1,
                opacity: 1,
                rotate: rotation
            }}
            exit={{
                scale: 0.8,
                opacity: 0,
                rotate: rotation
            }}
            layoutId={groupId}
            drag
            dragMomentum={false}
            onDragEnd={(e, info) => {
                // Disparar evento para atualizar a posição no Firebase
                const event = new CustomEvent('cardgroup-moved', {
                    detail: {
                        groupId: groupId,
                        x: x + info.offset.x,
                        y: y + info.offset.y
                    }
                });
                window.dispatchEvent(event);
            }}
        >
            <div className={cn("relative")}>
                {cards.map((card, index) => {
                    const offset = mode === 'fan'
                        ? { x: index * 25, y: index * 5, rotate: index * 5 }
                        : { x: index * 2, y: index * 2, rotate: 0 };

                    return (
                        <div
                            key={card.id}
                            className="absolute cursor-pointer"
                            style={{
                                left: offset.x,
                                top: offset.y,
                                transform: `rotate(${offset.rotate}deg)`,
                                zIndex: index
                            }}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, card, index)}
                            onClick={() => handleCardClick(index)}
                            title="Double-click to remove card from group"
                        >
                            <Card
                                suit={card.suit}
                                rank={card.rank}
                                faceUp={card.faceUp}
                                draggable={false}
                            />
                        </div>
                    );
                })}

                {/* Botão de arrasto para reposicionar o grupo */}
                <motion.div
                    className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md cursor-move z-50"
                    style={{
                        left: handlePosition.x,
                        top: handlePosition.y
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Arraste para mover o grupo"
                >
                    <GripVertical size={18} className="text-gray-600" />
                </motion.div>
            </div>
        </motion.div>
    );
};

export default CardGroup;