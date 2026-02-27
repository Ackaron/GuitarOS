import { useState, useCallback, useEffect } from 'react';

export const useSession = (initialTotalMinutes = 60) => {
    const [viewMode, setViewMode] = useState('start');
    const [totalMinutes, setTotalMinutes] = useState(initialTotalMinutes);
    const [routine, setRoutine] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Initial load of active session if any
    useEffect(() => {
        const checkActiveSession = async () => {
            if (window.electronAPI) {
                const prefsData = await window.electronAPI.invoke('prefs:get');
                if (prefsData?.session?.isActive && prefsData.session.currentRoutine?.length > 0) {
                    if (confirm("Resume previous session?")) {
                        setRoutine(prefsData.session.currentRoutine);
                        setCurrentStepIndex(prefsData.session.currentIndex);
                        setTotalMinutes(Math.floor(prefsData.session.elapsedTime / 60));
                        setViewMode('session');
                    } else {
                        await window.electronAPI.invoke('prefs:update-session', { isActive: false });
                    }
                }
            }
        };
        checkActiveSession();
    }, []);

    // Effect to auto-save session
    useEffect(() => {
        if (viewMode === 'session' && routine.length > 0) {
            const saveState = async () => {
                if (window.electronAPI) {
                    await window.electronAPI.invoke('prefs:update-session', {
                        isActive: true,
                        currentRoutine: routine,
                        currentIndex: currentStepIndex,
                        elapsedTime: 0, // This could be updated if we track total elapsed
                    });
                }
            };
            saveState();
        }
    }, [currentStepIndex, routine, viewMode]);

    const handleUpdateTotalTime = useCallback((val, setStepTimer, isTimerRunning) => {
        const newTotal = Number(val);
        setTotalMinutes(newTotal);
        if (newTotal > 0 && routine.length > 0) {
            const currentTotalSec = routine.reduce((sum, r) => sum + r.duration, 0);
            if (currentTotalSec > 0) {
                const newRoutine = routine.map(item => ({
                    ...item,
                    duration: Math.floor(item.duration / currentTotalSec * (newTotal * 60))
                }));
                setRoutine(newRoutine);
                if (!isTimerRunning && setStepTimer) {
                    setStepTimer(newRoutine[currentStepIndex].duration);
                }
            }
        }
    }, [routine, currentStepIndex]);

    const generateRoutine = useCallback(async (modules, setStepTimer, setIsTimerRunning, setActiveView) => {
        if (window.electronAPI) {
            // Save current module config
            await window.electronAPI.invoke('prefs:save', { routine: { modules } });

            const generated = await window.electronAPI.invoke('routine:generate', { minutes: totalMinutes, modules });

            if (generated && generated.length > 0) {
                const sessionId = window.crypto.randomUUID();
                setRoutine(generated);
                setActiveView('session');
                setViewMode('session');

                await window.electronAPI.invoke('prefs:update-session', {
                    isActive: true,
                    sessionId,
                    currentRoutine: generated,
                    currentIndex: 0,
                    elapsedTime: 0,
                    startDate: new Date().toISOString()
                });

                // Start REAPER session
                const firstItem = generated[0];
                setCurrentStepIndex(0);
                if (setStepTimer) setStepTimer(firstItem.duration || 300);
                if (setIsTimerRunning) setIsTimerRunning(false);

                await window.electronAPI.invoke('reaper:start-session', firstItem);

                return true;
            } else {
                alert('No items found! Check your Library and Module settings.');
                return false;
            }
        }
        return false;
    }, [totalMinutes]);

    const loadStep = useCallback(async (index, specificRoutine = null, setStepTimer = null, setIsTimerRunning = null) => {
        const currentRoutine = specificRoutine || routine;
        if (index >= 0 && index < currentRoutine.length) {
            setCurrentStepIndex(index);
            const item = currentRoutine[index];

            if (setStepTimer) setStepTimer(item.duration || 300);
            if (setIsTimerRunning) setIsTimerRunning(false);

            if (window.electronAPI) {
                await window.electronAPI.invoke('reaper:load-exercise', item);
                await window.electronAPI.invoke('prefs:update-session', {
                    isActive: true,
                    currentRoutine,
                    currentIndex: index
                });
            }
        }
    }, [routine]);

    const finishSession = useCallback(async (setActiveView) => {
        if (window.electronAPI) {
            await window.electronAPI.invoke('reaper:end-session');
            await window.electronAPI.invoke('prefs:update-session', { isActive: false, currentRoutine: [] });
            if (setActiveView) setActiveView('progress');
            setViewMode('start');
            setRoutine([]);
        }
    }, []);

    const reaperTransport = useCallback(async (cmd) => {
        if (window.electronAPI) {
            await window.electronAPI.invoke('reaper:command', cmd);
        }
    }, []);

    return {
        viewMode,
        setViewMode,
        totalMinutes,
        setTotalMinutes,
        routine,
        setRoutine,
        currentStepIndex,
        setCurrentStepIndex,
        handleUpdateTotalTime,
        generateRoutine,
        loadStep,
        finishSession,
        reaperTransport,
        currentItem: routine[currentStepIndex] || null
    };
};
