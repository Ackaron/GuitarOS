import React from 'react';
import { Button } from './UI';
import { ThumbsUp, ThumbsDown, Minus, Star } from 'lucide-react';

const FeedbackModal = ({ isOpen, exerciseTitle, onRate, isTargetReached }) => {
    if (!isOpen) return null;

    // Musicality Mode (Target Reached)
    if (isTargetReached) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-[#1A1D2D] border border-yellow-500/20 p-8 rounded-3xl max-w-lg w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
                    {/* Golden Glow */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />

                    <h2 className="text-2xl font-bold text-yellow-500 mb-2 uppercase tracking-widest">Target Reached</h2>
                    <p className="text-gray-400 mb-8">How confident was this performace?</p>

                    <div className="flex justify-center gap-4 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => onRate('good', star)} // Rate as 'good' (no bpm change), but with confidence
                                className="group flex flex-col items-center gap-2"
                            >
                                <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-600 group-hover:text-yellow-400 group-hover:bg-yellow-500/20 group-hover:scale-110 transition-all">
                                    <Star size={32} fill={star <= 0 ? "transparent" : "currentColor"} className="transition-all" />
                                </div>
                                <span className="text-xs font-bold text-gray-500 group-hover:text-yellow-500 uppercase">{star === 1 ? 'Shaky' : star === 5 ? 'Solid' : star}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Standard Mode (Speed Building)
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1A1D2D] border border-white/10 p-8 rounded-3xl max-w-lg w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">How was it?</h2>
                <p className="text-gray-400 mb-8">"{exerciseTitle}"</p>

                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => onRate('hard')}
                        className="group flex flex-col items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-red-500/20 border border-white/5 hover:border-red-500/50 transition-all"
                    >
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                            <ThumbsDown size={32} />
                        </div>
                        <span className="font-bold text-gray-300 group-hover:text-red-400">Hard</span>
                    </button>

                    <button
                        onClick={() => onRate('good')}
                        className="group flex flex-col items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/50 transition-all"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                            <Minus size={32} />
                        </div>
                        <span className="font-bold text-gray-300 group-hover:text-blue-400">Good</span>
                    </button>

                    <button
                        onClick={() => onRate('easy')}
                        className="group flex flex-col items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-green-500/20 border border-white/5 hover:border-green-500/50 transition-all"
                    >
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                            <ThumbsUp size={32} />
                        </div>
                        <span className="font-bold text-gray-300 group-hover:text-green-400">Easy</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
