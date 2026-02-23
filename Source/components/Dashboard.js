'use client';
import React, { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { Button, Card } from './UI';
import Sidebar from './Sidebar';
import SessionView from './SessionView';
import Library from './Library';
import ProgressView from './ProgressView';
import ModuleConfig from './ModuleConfig';
import SettingsView from './SettingsView';
import LoginScreen from './LoginScreen';
import { useLanguage } from '../context/LanguageContext';
import { formatTime } from '../utils/formatTime';

export default function Dashboard() {
    const { userName, init, setUserName, logout } = useStore();
    const { t } = useLanguage();
    const [activeView, setActiveView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        init();
    }, []);

    const handleNav = (id) => {
        setActiveView(id);
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleLogin = (name) => {
        setUserName(name);
    };

    const handleLogout = async () => {
        await logout();
        setActiveView('dashboard');
    };

    // --- Session Flow State (ALL hooks must be before any early return) ---
    const [viewMode, setViewMode] = useState('start');
    const [totalMinutes, setTotalMinutes] = useState(60);
    const [routine, setRoutine] = useState([]);
    const [modules, setModules] = useState([
        { id: 'theory', type: 'theory', target: 'C Major', percentage: 15 },
        { id: 'technique', type: 'technique', target: ['Alternate Picking'], percentage: 25 },
        { id: 'exercise', type: 'exercise', target: '', percentage: 25 },
        { id: 'repertoire', type: 'repertoire', target: '', percentage: 35 }
    ]);

    // Persistent Session State
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepTimer, setStepTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [catalog, setCatalog] = useState({ items: [], tags: [], keys: [] });
    const [prefs, setPrefs] = useState(null);

    // Initial Data Load
    useEffect(() => {
        const initDashboard = async () => {
            if (window.electronAPI) {
                // 1. Get Catalog (Items, Tags, Keys)
                const cat = await window.electronAPI.invoke('fs:get-catalog');
                setCatalog(cat || { items: [], tags: [], keys: [] });

                // 2. Get User Prefs (Modules + Session)
                const prefsData = await window.electronAPI.invoke('prefs:get');
                if (prefsData) {
                    setPrefs(prefsData);
                    if (prefsData.routine?.modules) {
                        setModules(prefsData.routine.modules);
                    }

                    // Check for active session logic...
                    if (prefsData.session?.isActive && prefsData.session.currentRoutine?.length > 0) {
                        // ... (keep existing persistence logic) ...
                        if (confirm("Resume previous session?")) {
                            setRoutine(prefsData.session.currentRoutine);
                            setCurrentStepIndex(prefsData.session.currentIndex);
                            setTotalMinutes(Math.floor(prefsData.session.elapsedTime / 60));
                            setActiveView('session');
                            setViewMode('session');
                            const item = prefsData.session.currentRoutine[prefsData.session.currentIndex];
                            setStepTimer(item.duration);
                        } else {
                            await window.electronAPI.invoke('prefs:update-session', { isActive: false });
                        }
                    }
                }
            }
        };
        initDashboard();
    }, []);

    // Timer-end beep sound via Web Audio API
    const playTimerEndSound = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const playTone = (freq, startTime, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.4, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            playTone(880, ctx.currentTime, 0.25);
            playTone(1100, ctx.currentTime + 0.28, 0.35);
        } catch (e) {
            console.warn('Timer sound failed:', e);
        }
    };

    // Timer Logic
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

    // Persist session state when step changes
    useEffect(() => {
        if (viewMode === 'session' && routine.length > 0) {
            const saveState = async () => {
                if (window.electronAPI) {
                    await window.electronAPI.invoke('prefs:update-session', {
                        isActive: true,
                        currentRoutine: routine,
                        currentIndex: currentStepIndex,
                        elapsedTime: 0,
                    });
                }
            };
            saveState();
        }
    }, [currentStepIndex, routine, viewMode]);

    // Auto-save Module Config (Renaming/Sliders)
    useEffect(() => {
        const saveModules = setTimeout(async () => {
            if (window.electronAPI && modules.length > 0) {
                await window.electronAPI.invoke('prefs:save', { routine: { modules } });
            }
        }, 1000); // Debounce 1s

        return () => clearTimeout(saveModules);
    }, [modules]);

    // ── Early returns (MUST be after all hooks) ──────────────────────────────

    // Show loading state while initializing
    if (userName === null) {
        return (
            <div className="flex h-screen bg-[#0F111A] items-center justify-center">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Show login screen when no user
    if (!userName) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    // --- UI Helpers ---
    const handleUpdateTotalTime = (val) => {
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
                if (!isTimerRunning) {
                    setStepTimer(newRoutine[currentStepIndex].duration);
                }
            }
        }
    };

    // --- Actions ---

    const handleGenerateRoutine = async () => {
        if (window.electronAPI) {
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

                // Launch REAPER once for the session and load first exercise
                const firstItem = generated[0];
                setCurrentStepIndex(0);
                setStepTimer(firstItem.duration || 300);
                setIsTimerRunning(false);
                await window.electronAPI.invoke('reaper:start-session', firstItem);
                await window.electronAPI.invoke('prefs:update-session', {
                    isActive: true, currentRoutine: generated, currentIndex: 0
                });
            } else {
                alert('No items found! Check your Library and Module settings.');
            }
        }
    };

    const loadStep = async (index, currentRoutine = routine) => {
        if (index >= 0 && index < currentRoutine.length) {
            setCurrentStepIndex(index);
            const item = currentRoutine[index];
            setStepTimer(item.duration || 300);
            setIsTimerRunning(false);

            if (window.electronAPI) {
                // Send exercise command to running REAPER (no restart)
                await window.electronAPI.invoke('reaper:load-exercise', item);
                await window.electronAPI.invoke('prefs:update-session', {
                    isActive: true,
                    currentRoutine,
                    currentIndex: index
                });
            }
        }
    };

    const handleNext = () => {
        if (currentStepIndex < routine.length - 1) {
            loadStep(currentStepIndex + 1);
        } else {
            finishSession();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            loadStep(currentStepIndex - 1);
        }
    };

    const toggleTimer = async () => {
        const nextState = !isTimerRunning;
        setIsTimerRunning(nextState);

        if (!nextState) {
            // Paused -> Send Stop to Reaper
            if (window.electronAPI) {
                await window.electronAPI.invoke('reaper:command', '1016'); // Transport: Stop
            }
        } else {
            // Resumed -> Maybe Play? User didn't explicitly ask for Play on resume, but commonly desired.
            // Requirement says: "Button 'Pause' should stop internal timer and send Transport: Stop".
            // It doesn't explicitly say Resume should send Play. Let's stick to Stop on Pause.
        }
    };

    const finishSession = async () => {
        if (window.electronAPI) {
            // End REAPER session (kills REAPER + Guitar Pro)
            await window.electronAPI.invoke('reaper:end-session');
            await window.electronAPI.invoke('prefs:update-session', { isActive: false, currentRoutine: [] });
            setActiveView('progress');
            setViewMode('start');
            setRoutine([]);
        }
    };

    // --- REAPER Controls ---
    const reaperTransport = async (cmd) => {
        if (window.electronAPI) {
            await window.electronAPI.invoke('reaper:command', cmd);
        }
    };

    const currentItem = routine[currentStepIndex];

    // --- Render Logic ---

    return (
        <div className="flex h-screen bg-[#0F111A] overflow-hidden font-sans text-gray-100">
            {/* Sidebar */}
            <Sidebar
                activeView={activeView}
                onNavigate={handleNav}
                isOpen={isSidebarOpen}
                onToggle={toggleSidebar}
                onLogout={handleLogout}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-0 bg-gradient-to-br from-[#0F111A] via-[#13151F] to-[#0F111A]">
                {/* Background Ambient Glow */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

                {activeView === 'dashboard' && (
                    <div className="w-full max-w-[1400px] mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 h-full flex flex-col">
                        <header className="mb-8">
                            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">{t('dashboard.title')}</h1>
                            <p className="text-lg text-gray-400">{t('dashboard.subtitle')}</p>
                        </header>

                        <div className="flex-1 relative">
                            <ModuleConfig
                                modules={modules}
                                setModules={setModules}
                                catalog={catalog}
                                onGenerate={() => {
                                    handleGenerateRoutine();
                                    // setActiveView('session'); // Done inside handleGenerateRoutine success
                                }}
                            />
                        </div>
                    </div>
                )}

                {activeView === 'session' && (
                    <SessionView
                        routine={routine}
                        currentStepIndex={currentStepIndex}
                        stepTimer={stepTimer}
                        isTimerRunning={isTimerRunning}
                        totalMinutes={totalMinutes}
                        onLoadStep={loadStep}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onToggleTimer={toggleTimer}
                        onFinishSession={finishSession}
                        onSetStepTimer={setStepTimer}
                        onReaperTransport={reaperTransport}
                        onUpdateTotalTime={handleUpdateTotalTime}
                        launchGuitarPro={prefs?.general?.launchGuitarPro !== false}
                    />
                )}

                {activeView === 'library' && <Library />}
                {activeView === 'progress' && <ProgressView />}
                {activeView === 'settings' && <SettingsView />}
            </main>
        </div>
    );
}
