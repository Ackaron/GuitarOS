import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import TabPlayer from './TabPlayer';
import SessionTopNav from './SessionTopNav';
import SessionFocusTimer from './SessionFocusTimer';
import SessionPlaylist from './SessionPlaylist';
import { calculateScore } from '../utils/ScoreCalculator';

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
    onUpdateTotalTime,
    launchGuitarPro = true
}) => {
    const [currentBpm, setCurrentBpm] = useState(0);
    const [bpmChanged, setBpmChanged] = useState(false);
    const [isEditingBpm, setIsEditingBpm] = useState(false);

    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [newTargetBpm, setNewTargetBpm] = useState('');

    const [viewMode, setViewMode] = useState(launchGuitarPro ? 'timer' : 'tab'); // Default to Tab if GP is off

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

    const handleBpmChange = async (delta, absolute = false) => {
        const newBpm = absolute ? delta : Math.max(40, Math.min(300, currentBpm + delta));
        setCurrentBpm(newBpm);
        setBpmChanged(true);

        // Send to Reaper immediately
        if (window.electronAPI) {
            await window.electronAPI.invoke('reaper:set-bpm', newBpm);
        }
    };

    const handleFeedbackTrigger = async (action) => {
        // Automatically save progress for valid items (e.g. exercises)
        if (currentItem && currentItem.bpm > 0) {
            await saveProgress(currentBpm);
        }

        // Proceed immediately without showing a modal
        if (action) {
            action();
        }
    };

    const saveProgress = async (bpm) => {
        if (window.electronAPI) {
            const planned = currentItem.duration || 300;
            const remaining = stepTimer;
            const elapsed = Math.max(0, planned - remaining);

            // Fetch current session prefs to get dayFocus
            const prefsData = await window.electronAPI.invoke('prefs:get');
            const dayFocus = prefsData?.session?.dayFocus || 'speed';

            const score = calculateScore({
                moduleType: currentItem.type || currentItem.category?.toLowerCase() || 'exercise',
                dayFocus,
                targetBpm: currentItem.targetBPM,
                actualBpm: currentBpm,
                userRating: 'good', // assume 'good' for auto-saves since it focuses on objective time discipline
                confidence: null,
                plannedDuration: planned,
                actualDuration: elapsed
            });

            await window.electronAPI.invoke('library:update-progress', {
                id: currentItem.id,
                rating: 'manual', // legacy support
                explicitBpm: bpm,
                bpm: currentBpm,
                actualDuration: elapsed,
                plannedDuration: planned,
                score
            });

            // Immediate UI update
            currentItem.lastSuccessBPM = bpm;
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
        <div className="w-full h-full p-8 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="h-full grid grid-cols-12 gap-8 max-w-[1600px] mx-auto min-h-0">
                {/* LEFT: Focus Mode or Tab View */}
                <div className="col-span-12 lg:col-span-7 flex flex-col relative min-h-0 overflow-y-auto pr-4 custom-scrollbar pb-12">
                    <SessionTopNav
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        stepTimer={stepTimer}
                        isTimerRunning={isTimerRunning}
                        onToggleTimer={onToggleTimer}
                        onPrev={onPrev}
                        currentStepIndex={currentStepIndex}
                        routineLength={routine.length}
                        onNextWithFeedback={() => handleFeedbackTrigger(onNext)}
                        onFinishWithFeedback={() => handleFeedbackTrigger(onFinishSession)}
                        isReview={currentItem?.isReview}
                    />

                    {currentItem && viewMode === 'tab' && (
                        <div className="flex-1 min-h-0 pt-12 overflow-hidden">
                            <TabPlayer
                                filePath={(() => {
                                    if (!currentItem.files?.tab) return null;
                                    // Ensure absolute path
                                    if (window.electronAPI && !currentItem.files.tab.includes(':') && !currentItem.files.tab.startsWith('/')) {
                                        return `${currentItem.path}/${currentItem.files.tab}`.replace(/\\/g, '/');
                                    }
                                    return currentItem.files.tab.replace(/\\/g, '/');
                                })()}
                            />
                        </div>
                    )}

                    {currentItem && viewMode === 'timer' && (
                        <SessionFocusTimer
                            currentItem={currentItem}
                            currentStepIndex={currentStepIndex}
                            routineLength={routine.length}
                            stepTimer={stepTimer}
                            isTimerRunning={isTimerRunning}
                            onToggleTimer={onToggleTimer}
                            onSetStepTimer={onSetStepTimer}
                            onPrev={onPrev}
                            onNextWithFeedback={() => handleFeedbackTrigger(onNext)}
                            onFinishWithFeedback={() => handleFeedbackTrigger(onFinishSession)}
                            currentBpm={currentBpm}
                            isEditingBpm={isEditingBpm}
                            setIsEditingBpm={setIsEditingBpm}
                            handleBpmChange={handleBpmChange}
                            bpmChanged={bpmChanged}
                            isTargetReached={isTargetReached}
                            isEditingTarget={isEditingTarget}
                            setIsEditingTarget={setIsEditingTarget}
                            newTargetBpm={newTargetBpm}
                            setNewTargetBpm={setNewTargetBpm}
                            handleSaveTargetBpm={handleSaveTargetBpm}
                            isReview={currentItem?.isReview}
                        />
                    )}
                </div>

                {/* RIGHT: Playlist */}
                <div className="col-span-12 lg:col-span-5 flex flex-col h-full max-h-[calc(100vh-100px)]">
                    <SessionPlaylist
                        routine={routine}
                        currentStepIndex={currentStepIndex}
                        totalMinutes={totalMinutes}
                        onUpdateTotalTime={onUpdateTotalTime}
                        onLoadStep={onLoadStep}
                        onFinishWithFeedback={() => handleFeedbackTrigger(onFinishSession)}
                    />
                </div>
            </div>
        </div>
    );
};

export default SessionView;
