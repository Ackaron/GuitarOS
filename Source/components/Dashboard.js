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
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useSession } from '../hooks/useSession'; export default function Dashboard() {
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
    // --- Session Flow State ---
    const {
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
        currentItem
    } = useSession(60);

    const [modules, setModules] = useState([
        { id: 'theory', type: 'theory', target: 'C Major', percentage: 15 },
        { id: 'technique', type: 'technique', target: ['Alternate Picking'], percentage: 25 },
        { id: 'exercise', type: 'exercise', target: '', percentage: 25 },
        { id: 'repertoire', type: 'repertoire', target: '', percentage: 35 }
    ]);

    const { stepTimer, setStepTimer, isTimerRunning, setIsTimerRunning, toggleTimer } = useSessionTimer(0);
    const [catalog, setCatalog] = useState({ items: [], tags: [], keys: [] });
    const [prefs, setPrefs] = useState(null);

    // Initial Data Load
    useEffect(() => {
        const initDashboard = async () => {
            if (window.electronAPI) {
                // 1. Get Catalog (Items, Tags, Keys)
                const cat = await window.electronAPI.invoke('fs:get-catalog');
                setCatalog(cat || { items: [], tags: [], keys: [] });

                // 2. Get User Prefs (Modules)
                const prefsData = await window.electronAPI.invoke('prefs:get');
                if (prefsData) {
                    setPrefs(prefsData);
                    if (prefsData.routine?.modules) {
                        setModules(prefsData.routine.modules);
                    }
                    // active session is handled by useSession
                }
            }
        };
        initDashboard();
    }, []);




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

    // --- Actions ---
    const onGenerateRoutine = async () => {
        await generateRoutine(modules, setStepTimer, setIsTimerRunning, setActiveView);
    };

    const handleNext = () => {
        if (currentStepIndex < routine.length - 1) {
            loadStep(currentStepIndex + 1, null, setStepTimer, setIsTimerRunning);
        } else {
            finishSession(setActiveView);
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            loadStep(currentStepIndex - 1, null, setStepTimer, setIsTimerRunning);
        }
    };


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
                                onGenerate={onGenerateRoutine}
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
                        onLoadStep={(idx) => loadStep(idx, null, setStepTimer, setIsTimerRunning)}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onToggleTimer={toggleTimer}
                        onFinishSession={() => finishSession(setActiveView)}
                        onSetStepTimer={setStepTimer}
                        onReaperTransport={reaperTransport}
                        onUpdateTotalTime={(val) => handleUpdateTotalTime(val, setStepTimer, isTimerRunning)}
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
