import { useState, useEffect, useCallback } from 'react';
import { playTimerEndSound } from '../utils/audio';

export const useSessionTimer = (initialTimer = 0) => {
    const [stepTimer, setStepTimer] = useState(initialTimer);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    useEffect(() => {
        let interval;
        if (isTimerRunning && stepTimer > 0) {
            interval = setInterval(() => {
                setStepTimer(prev => {
                    if (prev <= 1) {
                        playTimerEndSound();
                        setIsTimerRunning(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, stepTimer]);

    const toggleTimer = useCallback(async () => {
        const nextState = !isTimerRunning;
        setIsTimerRunning(nextState);

        if (!nextState) {
            // Paused -> Send Stop to Reaper
            if (window.electronAPI) {
                await window.electronAPI.invoke('reaper:command', '1016'); // Transport: Stop
            }
        }
    }, [isTimerRunning]);

    return {
        stepTimer,
        setStepTimer,
        isTimerRunning,
        setIsTimerRunning,
        toggleTimer
    };
};
