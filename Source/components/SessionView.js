import React, { useState, useEffect } from 'react';
import { Play, Activity, Settings, ChevronLeft, Edit2, Star } from 'lucide-react';
import { Button } from './UI';
import { formatTime } from '../utils/formatTime';
import FeedbackModal from './FeedbackModal';
import ReaperControls from './ReaperControls';

const SessionView = ({
    routine,
    currentStepIndex,
    stepTimer,
    isTimerRunning,
    totalMinutes,
    onLoadStep,
    onNext,
    onPrev,
    onToggleTimer,
    onFinishSession,
    onSetStepTimer,
    onReaperTransport,
    onUpdateTotalTime
}) => {
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const [currentBpm, setCurrentBpm] = useState(0);
    const [bpmChanged, setBpmChanged] = useState(false);
    const [isEditingBpm, setIsEditingBpm] = useState(false);

    // Target BPM Editing
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [newTargetBpm, setNewTargetBpm] = useState('');

    const currentItem = routine[currentStepIndex];

    useEffect(() => {
        if (currentItem) {
            // REAPER always starts with original (Identity)
            // Fallback to 120 only if everything is missing
            const startBpm = currentItem.originalBpm || currentItem.bpm || 120;

            setCurrentBpm(startBpm);
            setBpmChanged(false);


        }
    }, [currentItem]); // Re-run when step changes

    const currentItemStepInfo = (idx, total) => {
        return `Step ${idx + 1} of ${total}`;
    };

    const handleBpmChange = async (delta) => {
        const newBpm = Math.max(40, Math.min(300, currentBpm + delta));
        setCurrentBpm(newBpm);
        setBpmChanged(true);

        // Send to Reaper immediately
        if (window.electronAPI) {
            await window.electronAPI.invoke('reaper:set-bpm', newBpm);
        }
    };

    const handleFeedbackTrigger = async (action) => {
        // Only trigger for items that have tracks/BPM (exercises)
        if (currentItem && currentItem.bpm > 0) {

            // PRIORITY 1: Check if Target Reached (ALWAYS show rating if reached)
            // Use targetBPM if available, else originalBpm/bpm
            const target = currentItem.targetBPM || currentItem.originalBpm || currentItem.bpm || 120;
            const isTargetReached = currentBpm >= target;

            if (isTargetReached) {
                if (isTimerRunning) onToggleTimer(); // Pause
                setPendingAction(() => action);
                setIsFeedbackOpen(true);
                return;
            }

            // PRIORITY 2: BPM Changed but Target NOT reached -> Auto-save and skip
            if (bpmChanged) {
                // Save new BPM as 'manual' entry (Knowledge Base update)
                await saveManualBpm(currentBpm);
                action(); // Proceed immediately
                return;
            }

            // Default: Target not reached, BPM not changed -> Proceed (or logic for pure practice loop?)
            // Just proceed for now
            action();
        } else {
            action();
        }
    };

    const saveManualBpm = async (bpm) => {
        if (window.electronAPI) {
            const planned = currentItem.duration || 300;
            const remaining = stepTimer;
            const elapsed = Math.max(0, planned - remaining);

            await window.electronAPI.invoke('library:update-progress', {
                id: currentItem.id,
                rating: 'manual',
                explicitBpm: bpm,
                bpm: currentBpm,
                actualDuration: elapsed, // Fixed: Send elapsed, not remaining
                plannedDuration: planned
            });

            // Immediate UI update
            currentItem.lastSuccessBPM = bpm;
        }
    };

    const handleRate = async (rating, confidence = null) => {
        try {
            if (window.electronAPI) {
                const planned = currentItem.duration || 300;
                const remaining = stepTimer;
                const elapsed = Math.max(0, planned - remaining);

                await window.electronAPI.invoke('library:update-progress', {
                    id: currentItem.id,
                    rating,
                    confidence,
                    bpm: currentBpm,
                    actualDuration: elapsed, // Fixed: Send elapsed, not remaining
                    plannedDuration: planned
                });

                currentItem.lastSuccessBPM = currentBpm;
            }
        } catch (e) {
            console.error("Failed to update progress:", e);
        }

        setIsFeedbackOpen(false);
        if (pendingAction) {
            pendingAction();
            setPendingAction(null);
        }
    };

    const handleSaveTargetBpm = async () => {
        if (newTargetBpm && !isNaN(newTargetBpm)) {
            const bpmVal = parseInt(newTargetBpm);

            // Optimistic Update
            currentItem.targetBPM = bpmVal;

            if (window.electronAPI) {
                await window.electronAPI.invoke('library:update-metadata', {
                    fsName: currentItem.fsName || currentItem.id, // Fallback might fail if ID != fsName, but usually for Smart Items they match or we need fsName passed
                    id: currentItem.id, // PASS ID FOR FALLBACK LOOKUP
                    metadata: { targetBPM: bpmVal },
                    parent: currentItem.parent,
                    category: currentItem.category
                });
            }
        }
        setIsEditingTarget(false);
    };

    if (routine.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Activity size={48} className="text-gray-600" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">No Active Session</h2>
                <p className="text-gray-500 max-w-md mb-8">Configure your goals in the Dashboard to generate a new practice routine.</p>
            </div>
        );
    }

    // Determine Mode
    const isTargetReached = currentItem?.targetBPM && currentBpm >= currentItem.targetBPM;

    return (
        <div className="w-full h-full p-8 animate-in fade-in zoom-in-95 duration-500 relative">
            <FeedbackModal
                isOpen={isFeedbackOpen}
                exerciseTitle={currentItem?.title}
                onRate={handleRate}
                isTargetReached={isTargetReached}
            />

            <div className="h-full grid grid-cols-12 gap-8 max-w-[1600px] mx-auto">
                {/* LEFT: Focus Mode */}
                <div className="col-span-12 lg:col-span-7 flex flex-col justify-center relative">
                    {currentItem && (
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                {onFinishSession && (
                                    <button
                                        onClick={() => handleFeedbackTrigger(onFinishSession)}
                                        className="p-2 mr-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                        title="Exit Session"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                )}

                                <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-widest border border-red-500/20">
                                    {currentItem.slotType || 'Focus'}
                                </span>

                                {/* Last Temp Badge */}
                                {(() => {
                                    const lastBpm = currentItem.lastSuccessBPM ||
                                        (currentItem.history?.length > 0 ? currentItem.history[currentItem.history.length - 1].bpm : null) ||
                                        '--';
                                    const isHigher = lastBpm !== '--' && currentBpm > lastBpm;

                                    return (
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border flex items-center gap-2 transition-all ${isHigher
                                            ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                            : 'bg-white/5 text-gray-400 border-white/10'
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

                                <span className="text-gray-500 text-sm font-mono">{currentItemStepInfo(currentStepIndex, routine.length)}</span>
                            </div>

                            <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight mb-4 tracking-tight text-shadow-glow">{currentItem.title}</h1>
                            <div className="mb-8 text-gray-500 font-mono text-sm flex items-center gap-2 h-8">
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
                                            className="w-16 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-white text-sm outline-none focus:border-green-500"
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

                            <div className="flex flex-wrap gap-4 text-gray-400 mb-12">
                                {/* BPM Control */}
                                <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                                    {/* Edit Mode for Current BPM */}
                                    <div className="flex items-center gap-2">
                                        <Activity size={16} className="text-gray-400" />
                                        <div className="flex flex-col relative group">
                                            {isEditingBpm ? (
                                                <form
                                                    onSubmit={(e) => { e.preventDefault(); setIsEditingBpm(false); handleBpmChange(0); /* Trigger change logic with 0 delta to save/send? handleBpmChange mainly updates state. */ }}
                                                    className="flex items-center"
                                                >
                                                    <input
                                                        autoFocus
                                                        type="number"
                                                        value={currentBpm}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (!isNaN(val)) {
                                                                setCurrentBpm(val);
                                                                setBpmChanged(true);
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            setIsEditingBpm(false);
                                                            // Send Update on Blur
                                                            if (window.electronAPI) window.electronAPI.invoke('reaper:set-bpm', currentBpm);
                                                        }}
                                                        className="w-16 bg-black/50 border border-blue-500 rounded px-1 text-xl font-mono text-white outline-none"
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

                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                                    <span className="font-bold text-blue-400">{currentItem.key || 'Key?'}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                                    <span className={`h - 2 w - 2 rounded - full ${currentItem.difficulty > 5 ? 'bg-red-500' : 'bg-green-500'} `} />
                                    <span>Lvl {currentItem.difficulty || 1}</span>
                                </div>
                            </div>

                            {/* Timer */}
                            <div className="mb-12">
                                <div className="text-[10rem] font-bold text-white font-mono leading-none tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                    {formatTime(stepTimer)}
                                </div>
                                <div className="flex gap-6 mt-8">
                                    <button
                                        onClick={onToggleTimer}
                                        className={`h-16 px-10 rounded-2xl font-bold text-xl transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 ${isTimerRunning
                                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black border border-yellow-300'
                                            : 'bg-gradient-to-br from-green-500 to-green-700 text-white border border-green-400'} `}
                                    >
                                        {isTimerRunning ? <span className="flex items-center gap-2">PAUSE</span> : <span className="flex items-center gap-2"><Play size={24} fill="currentColor" /> START SESSION</span>}
                                    </button>
                                    <button onClick={() => onSetStepTimer(currentItem.duration)} className="h-16 w-16 rounded-2xl bg-[#1A1C28] text-gray-400 hover:text-white hover:bg-[#252836] transition-all flex items-center justify-center border border-white/10 shadow-lg hover:border-white/20">
                                        <Settings size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center gap-4 mb-8">
                                <button
                                    onClick={onPrev}
                                    disabled={currentStepIndex === 0}
                                    className="h-14 w-14 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center disabled:opacity-20 transition-all border border-white/5"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={() => handleFeedbackTrigger(onNext)}
                                    className="h-14 flex-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center gap-2 transition-all border border-white/5 hover:border-red-500/30 hover:text-red-400"
                                >
                                    <span>NEXT STEP</span>
                                    <ChevronLeft className="rotate-180" size={20} />
                                </button>
                            </div>

                            {/* Reaper Controls */}
                            <ReaperControls />
                        </div>
                    )}
                </div>

                {/* RIGHT: Playlist */}
                <div className="col-span-12 lg:col-span-5 flex flex-col h-full max-h-[calc(100vh-100px)]">
                    <div className="bg-[#13151F]/80 backdrop-blur-md rounded-3xl border border-white/5 p-6 flex flex-col h-full shadow-2xl">
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
                                        className={`relative p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group overflow-hidden ${isActive
                                            ? 'bg-[#1E2030] border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                            : isPast ? 'bg-[#0F111A]/50 border-transparent opacity-40 grayscale' : 'bg-[#1A1D2D] border-white/5 hover:border-white/20 hover:bg-[#202436]'
                                            } `}
                                    >
                                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600"></div>}
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-inner ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-[#0F111A] text-gray-600'} `}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className={`font - bold text - lg ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'} `}>{item.title}</div>
                                                <div className="text-xs text-gray-600 font-mono uppercase tracking-wider">{item.slotType} • {Math.floor(item.duration / 60)}m</div>
                                            </div>
                                        </div>
                                        {isActive && <Activity size={20} className="text-red-500 animate-pulse" />}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <Button onClick={() => handleFeedbackTrigger(onFinishSession)} variant="outline" className="w-full border-red-900/30 text-red-800 hover:bg-red-900/20 hover:text-red-500 hover:border-red-500/50 py-4">
                                End Session
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionView;
