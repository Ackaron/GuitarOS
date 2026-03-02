import React from 'react';
import ActivityHeatmap from '../ActivityHeatmap';

const ItemDetails = ({ selectedItem, itemMastery, itemHistory }) => {
    const lastEntry = itemHistory[itemHistory.length - 1];

    return (
        <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-2">{selectedItem?.title}</h2>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs border border-white/10">{selectedItem?.key}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500 uppercase tracking-widest mb-1">Последняя оценка</div>
                        {itemMastery.length > 0 ? (
                            <div className="text-3xl font-mono font-bold text-[#2563eb]">
                                {itemMastery[itemMastery.length - 1].mastery}%
                            </div>
                        ) : (
                            <div className="text-3xl font-mono font-bold text-gray-700">--</div>
                        )}
                    </div>
                </div>

                <div className="h-80 w-full mb-8">
                    <ActivityHeatmap data={itemMastery} />
                </div>

                <div className="bg-white/[0.01] p-4 rounded-xl text-center border border-white/5">
                    <div className="text-gray-500 text-xs uppercase mb-2 tracking-wider">Макс. Темп</div>
                    <div className="text-white font-bold text-2xl font-mono">
                        {lastEntry && lastEntry.bpm ? `${lastEntry.bpm} BPM` : '--'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemDetails;
