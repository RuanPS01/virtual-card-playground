// Assegure-se que seu CardGroup.tsx está assim:

import React from 'react';
import { motion } from 'framer-motion';
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
    onRemoveCard?: (groupId: string, cardIndex: number) => void; // Add this line
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
        >
            <div className={cn("relative")}>
                {cards.map((card, index) => {
                    const offset = mode === 'fan'
                        ? { x: index * 25, y: index * 5, rotate: index * 5 }
                        : { x: index * 2, y: index * 2 };

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
            </div>
        </motion.div>
    );
};

export default CardGroup;