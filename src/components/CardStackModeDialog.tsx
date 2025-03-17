import React from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Card, { Suit, Rank } from './Card';

interface CardStackModeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectMode: (mode: 'fan' | 'stack') => void;
    baseSuit: Suit;
    baseRank: Rank;
    mousePosition: { x: number, y: number } | null;
}

const CardStackModeDialog = ({
    open,
    onOpenChange,
    onSelectMode,
    baseSuit,
    baseRank,
    mousePosition
}: CardStackModeDialogProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="p-4 absolute w-auto"
                style={{
                    position: 'fixed',
                    top: mousePosition ? `${mousePosition.y}px` : '50%',
                    left: mousePosition ? `${mousePosition.x}px` : '50%',
                    transform: mousePosition ? 'translate(-50%, -80%)' : 'translate(-50%, -50%)'
                }}
            >
                <DialogHeader>
                    <DialogTitle>Como agrupar as cartas?</DialogTitle>
                </DialogHeader>
                <div className="flex justify-between gap-12 mt-4">
                    <motion.div
                        className="text-center cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => onSelectMode('fan')}
                    >
                        <div className="relative mb-2 h-36 w-32">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="absolute"
                                    style={{
                                        left: `${i * 25}px`,
                                        top: `${i * 0}px`,
                                        transform: `rotate(${i * 5}deg)`,
                                        zIndex: i
                                    }}
                                >
                                    <Card
                                        suit={baseSuit}
                                        rank={baseRank}
                                        faceUp={true}
                                        draggable={false}
                                    />
                                </div>
                            ))}
                        </div>
                        <span className="font-medium">Leque</span>
                    </motion.div>

                    <motion.div
                        className="text-center cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => onSelectMode('stack')}
                    >
                        <div className="relative mb-2 h-36 w-28">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="absolute"
                                    style={{
                                        left: `${i * 2}px`,
                                        top: `${i * 2}px`,
                                        zIndex: i
                                    }}
                                >
                                    <Card
                                        suit={baseSuit}
                                        rank={baseRank}
                                        faceUp={true}
                                        draggable={false}
                                    />
                                </div>
                            ))}
                        </div>
                        <span className="font-medium">Pilha</span>
                    </motion.div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CardStackModeDialog;