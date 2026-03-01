import React from 'react';
import { Play, Activity, ChevronLeft } from 'lucide-react';
import { formatTime } from '../utils/formatTime';

const SessionTopNav = ({
    viewMode,
    setViewMode,
    stepTimer,
    isTimerRunning,
    onToggleTimer,
    onPrev,
    currentStepIndex,
    routineLength,
    onNextWithFeedback,
    onFinishWithFeedback,
    isReview
}) => {
    return (
        <div className="absolute top-0 right-0 z-20 flex items-center gap-4">
            {/* Tab-view Nav Buttons */}
            {viewMode === 'tab' && (
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                    {/* Mini Timer & Start/Pause */}
                    <div className="flex items-center gap-1 mr-1">
                        <div className={`font-mono text-sm font-bold tabular-nums px-2 ${stepTimer < 30 && stepTimer > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            {formatTime(stepTimer)}
                        </div>
                        <button
                            onClick={onToggleTimer}
                            className={`p-1.5 rounded-lg transition-all ${isTimerRunning
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                            title={isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                        >
                            {isTimerRunning
                                ? <span className="text-[10px] font-bold px-0.5">⏸</span>
                                : <Play size={14} fill="currentColor" />}
                        </button>
                    </div>

                    <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

                    <button
                        onClick={onPrev}
                        disabled={currentStepIndex === 0}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 transition-all"
                        title="Previous Step"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-[10px] font-mono text-gray-600 px-2 uppercase tracking-tighter">
                        {currentStepIndex + 1}/{routineLength}
                    </div>
                    <button
                        onClick={onNextWithFeedback}
                        disabled={currentStepIndex === routineLength - 1}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 transition-all"
                        title="Next Step"
                    >
                        <ChevronLeft size={18} className="rotate-180" />
                    </button>
                    <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                    <button
                        onClick={onFinishWithFeedback}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500/60 hover:text-red-500 transition-all"
                        title="End Session"
                    >
                        <Activity size={18} />
                    </button>
                </div>
            )}


            <div className="flex gap-2 items-center">
                <button
                    onClick={() => setViewMode('timer')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'timer' ? 'bg-[#E63946] text-white' : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                    Focus
                </button>
                <button
                    onClick={() => setViewMode('tab')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${viewMode === 'tab' ? 'bg-[#E63946] text-white' : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                    Tab
                </button>
            </div>
        </div>
    );
};

export default SessionTopNav;
