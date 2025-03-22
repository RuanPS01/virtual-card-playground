import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import Card, { Suit, Rank } from './Card';
import { cn } from '@/lib/utils';
import { createCardDragImage } from '@/utils/dragImageUtils';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

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
    onMoveToHand?: (cardIndex: number) => void;
    onFlipCard?: (groupId: string, cardIndex: number) => void;
    onPositionChange?: (groupId: string, x: number, y: number) => void; // Novo callback para atualizar posição
}

const CardGroup: React.FC<CardGroupProps> = ({
    cards,
    x,
    y,
    mode,
    onDragStart,
    groupId,
    onRemoveCard,
    onMoveToHand,
    onFlipCard,
    onPositionChange,
}) => {
    const [rotation] = useState(() => Math.random() * 20 - 10);
    const [lastClickTime, setLastClickTime] = useState<number>(0);
    const [lastClickedCard, setLastClickedCard] = useState<number>(-1);
    const [currentPosition, setCurrentPosition] = useState({ x, y });
    const [isDraggedOver, setIsDraggedOver] = useState(false);
    const groupRef = useRef<HTMLDivElement>(null);

    // Atualizar a posição atual quando as props mudam
    useEffect(() => {
        setCurrentPosition({ x, y });
    }, [x, y]);

    // Notificar componente pai sobre área do grupo para detecção de colisão
    useEffect(() => {
        const reportGroupArea = () => {
            if (groupRef.current && onPositionChange) {
                const rect = groupRef.current.getBoundingClientRect();
                // Não atualiza Firebase aqui, apenas registra a área para detecção
                window.dispatchEvent(new CustomEvent('register-card-group', {
                    detail: {
                        groupId,
                        rect: {
                            left: rect.left,
                            right: rect.right,
                            top: rect.top,
                            bottom: rect.bottom,
                            width: rect.width,
                            height: rect.height
                        }
                    }
                }));
            }
        };

        reportGroupArea();
        const interval = setInterval(reportGroupArea, 500);

        return () => {
            clearInterval(interval);
            window.dispatchEvent(new CustomEvent('unregister-card-group', {
                detail: { groupId }
            }));
        };
    }, [groupId, currentPosition.x, currentPosition.y, onPositionChange]);

    // Evento de dragover para feedback visual
    useEffect(() => {
        const handleDragOverGroup = (e: CustomEvent) => {
            if (e.detail.groupId === groupId) {
                setIsDraggedOver(true);
            }
        };

        const handleDragLeaveGroup = (e: CustomEvent) => {
            if (e.detail.groupId === groupId) {
                setIsDraggedOver(false);
            }
        };

        window.addEventListener('dragover-card-group' as any, handleDragOverGroup);
        window.addEventListener('dragleave-card-group' as any, handleDragLeaveGroup);

        return () => {
            window.removeEventListener('dragover-card-group' as any, handleDragOverGroup);
            window.removeEventListener('dragleave-card-group' as any, handleDragLeaveGroup);
        };
    }, [groupId]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, card: GroupedCard, index: number) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'card',
            id: card.id,
            suit: card.suit,
            rank: card.rank,
            faceUp: card.faceUp,
            isGrouped: true,
            groupId: groupId,
            groupIndex: index,
            groupX: x,
            groupY: y
        }));

        // Criar imagem personalizada para o arrasto
        createCardDragImage(card.suit, card.rank, card.faceUp, e.dataTransfer);

        onDragStart(card.id, card.suit, card.rank);
    };

    // Função auxiliar para obter o símbolo Unicode do naipe
    const getSuitSymbol = (suit: Suit): string => {
        switch (suit) {
            case 'hearts': return '♥';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            case 'spades': return '♠';
            default: return '';
        }
    };

    const handleCardClick = (index: number) => {
        const now = Date.now();
        // Check if this is a double click (within 300ms)
        if (lastClickedCard === index && now - lastClickTime < 300) {
            if (onRemoveCard) {
                onRemoveCard(groupId, index);
            }
        }
        setLastClickTime(now);
        setLastClickedCard(index);
    };

    const getHandlePosition = () => {
        // We're displaying cards horizontally, so handle should be positioned at the end
        const totalWidth = cards.length * 30 + 80; // 30px spacing between cards + card width

        return {
            x: totalWidth + 10, // Position handle to the right of the group
            y: 65 // Position in the middle of the card height
        };
    };

    // Calculate the actual area occupied by the cards
    const getAreaSize = () => {
        const cardWidth = 80; // Width of a card
        const cardHeight = 112; // Height of a card
        const cardSpacing = 30; // Horizontal spacing between cards

        // Calculate total width based on number of cards
        const totalWidth = cards.length > 1
            ? (cards.length - 1) * cardSpacing + cardWidth
            : cardWidth;

        return {
            width: totalWidth + 20, // Add padding
            height: cardHeight + 20 // Add padding
        };
    };

    const areaSize = getAreaSize();

    return (
        <motion.div
            ref={groupRef}
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
                rotate: 0 // Remove rotation to keep group straight
            }}
            exit={{
                scale: 0.8,
                opacity: 0,
                rotate: 0
            }}
            layoutId={groupId}
            drag
            dragMomentum={false}
            onDragEnd={(e, info) => {
                // Atualizar posição local
                const newX = x + info.offset.x;
                const newY = y + info.offset.y;
                setCurrentPosition({ x: newX, y: newY });

                // Usar o callback do React para notificar o componente pai sobre a mudança de posição
                if (onPositionChange) {
                    onPositionChange(groupId, newX, newY);
                }
            }}
        >
            {/* Visible rectangle showing the group area */}
            <div
                className={cn(
                    "absolute border-2 rounded-lg transition-colors",
                    isDraggedOver ? "border-blue-500 bg-blue-100 bg-opacity-30" : "border-gray-300 border-dashed"
                )}
                style={{
                    width: areaSize.width,
                    height: areaSize.height,
                    left: -10, // Small offset to center
                    top: -10, // Small offset to center
                    zIndex: 5
                }}
                data-card-group-dropzone={groupId}
            />

            <div className={cn("relative")}>
                {cards.map((card, index) => {
                    // Horizontal layout with uniform spacing and no rotation
                    const offset = {
                        x: index * 30, // Consistent horizontal spacing
                        y: 0,         // No vertical offset 
                        rotate: 0      // No rotation
                    };

                    return (
                        <ContextMenu key={card.id}>
                            <ContextMenuTrigger>
                                <div
                                    className="absolute cursor-pointer"
                                    style={{
                                        left: offset.x,
                                        top: offset.y,
                                        transform: `rotate(${offset.rotate}deg)`,
                                        zIndex: index + 10 // Garantir que as cartas fiquem acima da área pontilhada
                                    }}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, card, index)}
                                    onClick={() => handleCardClick(index)}
                                    title="Clique duplo para remover carta do grupo. Clique direito para mais opções."
                                >
                                    <Card
                                        suit={card.suit}
                                        rank={card.rank}
                                        faceUp={card.faceUp}
                                        draggable={false}
                                    />
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem onClick={() => onRemoveCard && onRemoveCard(groupId, index)}>
                                    Remover para a mesa
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => onMoveToHand && onMoveToHand(index)}>
                                    Mover para minha mão
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => {
                                    if (onFlipCard) onFlipCard(groupId, index);
                                }}>
                                    Virar carta
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    );
                })}

                {/* Reposition drag handle to the right end of the group */}
                <motion.div
                    className="absolute flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-md cursor-move z-50"
                    style={{
                        left: getHandlePosition().x,
                        top: getHandlePosition().y
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