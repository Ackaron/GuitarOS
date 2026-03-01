import React from 'react';
import { Play, Activity, ChevronLeft, Edit2, Star } from 'lucide-react';
import ReaperControls from './ReaperControls';
import { formatTime } from '../utils/formatTime';

const SessionFocusTimer = ({
    currentItem,
    currentStepIndex,
    routineLength,
    stepTimer,
    isTimerRunning,
    onToggleTimer,
    onSetStepTimer,
    onPrev,
    onNextWithFeedback,
    onFinishWithFeedback,
    currentBpm,
    isEditingBpm,
    setIsEditingBpm,
    handleBpmChange,
    bpmChanged,
    isTargetReached,
    isEditingTarget,
    setIsEditingTarget,
    setNewTargetBpm,
    handleSaveTargetBpm,
    isReview
}) => {
    const currentItemStepInfo = (idx, total) => {
        return `Step ${idx + 1} of ${total}`;
    };

    return (
        <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 mb-6 pr-48">
                {onFinishWithFeedback && (
                    <button
                        onClick={onFinishWithFeedback}
                        className="p-2 mr-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                        title="Exit Session"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${isReview
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                    {currentItem.slotType || 'Focus'}
                </span>

                {/* Last Temp Badge */}
                {(() => {
                    const lastBpm = currentItem.lastSuccessBPM ||
                        (currentItem.history?.length > 0 ? currentItem.history[currentItem.history.length - 1].bpm : null) ||
                        '--';
                    const isHigher = lastBpm !== '--' && currentBpm > lastBpm;

                    return (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${isHigher
                            ? 'text-green-500'
                            : 'text-gray-500'
                            }`}>
                            <Activity size={14} />
                            <span>LAST: <span className="text-white">{lastBpm}</span></span>
                        </div>
                    );
                })()}

                {isTargetReached && (
                    <div className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                        <Star size={12} fill="currentColor" /> Target Reached
                    </div>
                )}

                <span className="text-gray-500 text-sm font-mono">{currentItemStepInfo(currentStepIndex, routineLength)}</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-2 tracking-tight">{currentItem.title}</h1>
            <div className="mb-6 text-gray-500 font-mono text-sm flex items-center gap-2 h-8">
                {isEditingTarget ? (
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSaveTargetBpm(); }}
                        className="flex items-center gap-2"
                    >
                        <span>Target:</span>
                        <input
                            autoFocus
                            type="number"
                            value={newTargetBpm}
                            onChange={(e) => setNewTargetBpm(e.target.value)}
                            onBlur={() => setTimeout(() => setIsEditingTarget(false), 200)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setIsEditingTarget(false);
                            }}
                            className="w-16 bg-white/[0.05] border-transparent rounded px-2 py-0.5 text-white text-sm outline-none focus:bg-white/10 transition-colors"
                        />
                        <span className="text-xs">BPM</span>
                        <button
                            type="submit"
                            className="ml-2 text-green-400 hover:text-green-300 text-xs uppercase font-bold"
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            Save
                        </button>
                    </form>
                ) : (
                    <>
                        <span>Target: {currentItem.targetBPM || '???'} BPM</span>
                        <button
                            onClick={() => {
                                setNewTargetBpm(currentItem.targetBPM || 120);
                                setIsEditingTarget(true);
                            }}
                            className="text-gray-600 hover:text-white transition-colors"
                            title="Edit Target BPM"
                        >
                            <Edit2 size={12} />
                        </button>
                    </>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-gray-400 mb-8 py-3 bg-white/[0.02] px-6 rounded-2xl">
                {/* BPM Control */}
                <div className="flex items-center gap-3">
                    {/* Edit Mode for Current BPM */}
                    <div className="flex items-center gap-2">
                        <Activity size={16} className="text-gray-400" />
                        <div className="flex flex-col relative group">
                            {isEditingBpm ? (
                                <form
                                    onSubmit={(e) => { e.preventDefault(); setIsEditingBpm(false); handleBpmChange(0); }}
                                    className="flex items-center"
                                >
                                    <input
                                        autoFocus
                                        type="number"
                                        value={currentBpm}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) {
                                                handleBpmChange(val - currentBpm, true); // true indicates absolute set if we adjust handleBpmChange
                                            }
                                        }}
                                        onBlur={() => {
                                            setIsEditingBpm(false);
                                            if (window.electronAPI) window.electronAPI.invoke('reaper:set-bpm', currentBpm);
                                        }}
                                        className="w-16 bg-transparent border-b border-[#E63946] rounded-none px-1 text-xl font-mono text-white outline-none"
                                    />
                                </form>
                            ) : (
                                <div
                                    onClick={() => setIsEditingBpm(true)}
                                    className="cursor-pointer hover:bg-white/10 rounded px-2 -ml-2 transition-colors"
                                    title="Click to Edit BPM"
                                >
                                    <span className="font-mono text-xl text-white leading-none">{currentBpm} <span className="text-xs text-gray-500 font-sans">BPM</span></span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                        <button
                            onClick={() => handleBpmChange(-5)}
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold"
                            title="-5 BPM"
                        >
                            -5
                        </button>
                        <button
                            onClick={() => handleBpmChange(-1)}
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold"
                            title="-1 BPM"
                        >
                            -
                        </button>
                        <button
                            onClick={() => handleBpmChange(1)}
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold"
                            title="+1 BPM"
                        >
                            +
                        </button>
                        <button
                            onClick={() => handleBpmChange(5)}
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold"
                            title="+5 BPM"
                        >
                            +5
                        </button>
                    </div>
                    {bpmChanged && <span className="text-yellow-500 text-xs ml-2 animate-pulse">Modified</span>}
                </div>

                <div className="w-px h-6 bg-white/10" />

                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-400">{currentItem.key || 'Key?'}</span>
                </div>

                <div className="w-px h-6 bg-white/10" />

                <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${currentItem.difficulty > 5 ? 'bg-red-500' : 'bg-green-500'}`} />
                    <span className="text-sm text-gray-300">Lvl {currentItem.difficulty || 1}</span>
                </div>
            </div>

            {/* Timer */}
            <div className="mb-8">
                <div className="text-[7rem] md:text-[8rem] font-bold text-white font-mono leading-none tracking-tighter tabular-nums drop-shadow-none">
                    {formatTime(stepTimer)}
                </div>
                <div className="flex gap-6 mt-8">
                    <button
                        onClick={onToggleTimer}
                        className={`h-16 px-10 rounded-full font-bold text-sm tracking-widest uppercase transition-all flex items-center gap-3 ${isTimerRunning
                            ? 'bg-white/10 text-white hover:bg-white/20'
                            : 'bg-[#E63946] text-white hover:brightness-110'}`}
                    >
                        {isTimerRunning ? <span className="flex items-center gap-2">PAUSE</span> : <span className="flex items-center gap-2"><Play size={24} fill="currentColor" /> START SESSION</span>}
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-8">
                <button
                    onClick={onPrev}
                    disabled={currentStepIndex === 0}
                    className="h-14 w-14 rounded-full bg-transparent hover:bg-white/5 text-gray-500 hover:text-white flex items-center justify-center disabled:opacity-20 transition-all border-none"
                >
                    <ChevronLeft size={24} />
                </button>
                <button
                    onClick={onNextWithFeedback}
                    className="h-14 px-8 rounded-full bg-transparent hover:bg-white/5 text-gray-400 font-bold tracking-widest flex items-center justify-center gap-2 transition-all border border-white/20 hover:border-white/40 hover:text-white"
                >
                    <span>NEXT STEP</span>
                    <ChevronLeft className="rotate-180" size={20} />
                </button>
            </div>

            {/* Reaper Controls */}
            <ReaperControls />
        </div >
    );
};

export default SessionFocusTimer;
