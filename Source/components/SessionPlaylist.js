import React from 'react';
import { Activity } from 'lucide-react';
import { Button } from './UI';

const SessionPlaylist = ({
    routine,
    currentStepIndex,
    totalMinutes,
    onUpdateTotalTime,
    onLoadStep,
    onFinishWithFeedback
}) => {
    return (
        <div className="bg-transparent rounded-none border-l border-white/[0.05] p-8 flex flex-col h-full">
            <div className="mb-6 flex flex-col gap-4">
                <h3 className="text-2xl font-bold text-white flex justify-between items-center px-2">
                    Session Map
                    <span className="text-sm font-sans font-normal text-gray-500 bg-white/5 px-3 py-1 rounded-full">{routine.length} Steps</span>
                </h3>

                {/* Total Time Input */}
                <div className="flex items-center gap-4 bg-[#0F111A] p-3 rounded-xl border border-white/5">
                    <div className="text-sm text-gray-400 font-bold uppercase tracking-wider">Total Time</div>
                    <div className="flex-1 flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            value={totalMinutes}
                            onChange={(e) => onUpdateTotalTime(e.target.value)}
                            className="bg-transparent text-white font-mono font-bold text-lg w-full outline-none text-right"
                        />
                        <span className="text-brand-gray text-sm font-bold">min</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar mask-linear-fade">
                {routine.map((item, idx) => {
                    const isActive = idx === currentStepIndex;
                    const isPast = idx < currentStepIndex;
                    return (
                        <div
                            key={idx + item.id}
                            onClick={() => onLoadStep(idx)}
                            className={`relative p-4 rounded-none border-b transition-all cursor-pointer flex items-center justify-between group overflow-hidden ${isActive
                                ? 'bg-white/[0.02] border-white/[0.05]'
                                : isPast ? 'bg-transparent border-white/[0.02] opacity-40 grayscale' : 'bg-transparent border-white/[0.05] hover:bg-white/[0.02]'
                                } `}
                        >
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E63946]"></div>}
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-inner ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-[#0F111A] text-gray-600'} `}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className={`font-bold text-lg ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'} `}>{item.title}</div>
                                        {item.isReview && (
                                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[9px] font-bold uppercase tracking-wider">
                                                Review
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-600 font-mono uppercase tracking-wider">
                                        {item.slotType} • {Math.floor(item.duration / 60)}m
                                    </div>
                                </div>
                            </div>
                            {isActive && <Activity size={20} className="text-red-500 animate-pulse" />}
                        </div>
                    )
                })}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
                <Button onClick={onFinishWithFeedback} variant="outline" className="w-full border-red-900/30 text-red-800 hover:bg-red-900/20 hover:text-red-500 hover:border-red-500/50 py-4">
                    End Session
                </Button>
            </div>
        </div>
    );
};

export default SessionPlaylist;
