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
import { useLanguage } from '../context/LanguageContext';
import { formatTime } from '../utils/formatTime';

export default function Dashboard() {
    const { userName, init } = useStore();
    const { t } = useLanguage();
    const [activeView, setActiveView] = useState('dashboard'); // dashboard, library, progress, settings
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        init();
    }, []);

    const handleNav = (id) => {
        setActiveView(id);
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // --- UI Helpers ---
    const handleUpdateTotalTime = (val) => {
        const newTotal = Number(val);
        setTotalMinutes(newTotal);
        // Rescale routine items
        if (newTotal > 0 && routine.length > 0) {
            // Calculate total existing duration to find proportions
            const currentTotalSec = routine.reduce((sum, r) => sum + r.duration, 0);
            if (currentTotalSec > 0) {
                const newRoutine = routine.map(item => ({
                    ...item,
                    duration: Math.floor(item.duration / currentTotalSec * (newTotal * 60))
                }));
                setRoutine(newRoutine);
                // Update current step timer if not running
                if (!isTimerRunning) {
                    setStepTimer(newRoutine[currentStepIndex].duration);
                }
            }
        }
    };

    // --- Session Flow State ---
    const [viewMode, setViewMode] = useState('start'); // start, session, summary
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

    // Initial Data Load
    useEffect(() => {
        const initDashboard = async () => {
            if (window.electronAPI) {
                // 1. Get Catalog (Items, Tags, Keys)
                const cat = await window.electronAPI.invoke('fs:get-catalog');
                setCatalog(cat || { items: [], tags: [], keys: [] });

                // 2. Get User Prefs (Modules + Session)
                const prefs = await window.electronAPI.invoke('prefs:get');
                if (prefs) {
                    if (prefs.routine?.modules) {
                        setModules(prefs.routine.modules);
                    }

                    // Check for active session logic...
                    if (prefs.session?.isActive && prefs.session.currentRoutine?.length > 0) {
                        // ... (keep existing persistence logic) ...
                        if (confirm("Resume previous session?")) {
                            setRoutine(prefs.session.currentRoutine);
                            setCurrentStepIndex(prefs.session.currentIndex);
                            setTotalMinutes(Math.floor(prefs.session.elapsedTime / 60));
                            setViewMode('session');
                            const item = prefs.session.currentRoutine[prefs.session.currentIndex];
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

    // Timer Logic
    useEffect(() => {
        let interval;
        if (isTimerRunning && stepTimer > 0) {
            interval = setInterval(() => {
                setStepTimer(prev => {
                    const next = prev - 1;
                    // Persist periodically (e.g. every 5s or on stop) - NOT every second here for performance
                    return next;
                });
            }, 1000);
        } else if (stepTimer === 0 && isTimerRunning) {
            setIsTimerRunning(false);
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

    // --- Actions ---

    const handleGenerateRoutine = async () => {
        if (window.electronAPI) {
            // Save current module config first
            await window.electronAPI.invoke('prefs:save', { routine: { modules } });

            const generated = await window.electronAPI.invoke('routine:generate', { minutes: totalMinutes, modules });

            if (generated && generated.length > 0) {
                const sessionId = window.crypto.randomUUID();
                setRoutine(generated);
                setActiveView('session'); // Fix: Redirect to session view
                setViewMode('session');

                // Initialize Session State with ID
                await window.electronAPI.invoke('prefs:update-session', {
                    isActive: true,
                    sessionId: sessionId,
                    currentRoutine: generated,
                    currentIndex: 0,
                    elapsedTime: 0,
                    startDate: new Date().toISOString()
                });

                loadStep(0, generated);
            } else {
                alert("No items found! Check your Library and Module settings.");
            }
        }
    };

    const loadStep = async (index, currentRoutine = routine) => {
        if (index >= 0 && index < currentRoutine.length) {
            // Close previous GP instance if exists
            // (Disabled for seamless transitions)

            setCurrentStepIndex(index);
            const item = currentRoutine[index];
            setStepTimer(item.duration || 300);
            setIsTimerRunning(false);

            // Trigger Reaper & GP (reaper:load-exercise handles GP launch if configured, but currently we might need explicit GP launch?)
            // Actually, reaper:load-exercise in main.js calls ReaperService.setupProject, 
            // but does it launch GP?
            // Let's check main.js handler for 'reaper:load-exercise'.

            if (window.electronAPI) {
                await window.electronAPI.invoke('reaper:load-exercise', item);
                // Save State immediately
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
            // Kill both apps
            await window.electronAPI.invoke('gp:close');
            await window.electronAPI.invoke('reaper:kill'); // Kill Reaper instead of just stopping

            // Clear session state
            await window.electronAPI.invoke('prefs:update-session', { isActive: false, currentRoutine: [] });

            // Redirect to Progress
            setActiveView('progress');
            setViewMode('start'); // Reset internal session mode
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
                    />
                )}

                {activeView === 'library' && <Library />}
                {activeView === 'progress' && <ProgressView />}
                {activeView === 'settings' && <SettingsView />}
            </main>
        </div>
    );
}
