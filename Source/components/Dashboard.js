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
import CoursesView from './CoursesView';
import CourseBuilder from './CourseBuilder';
import { useLanguage } from '../context/LanguageContext';
import { formatTime } from '../utils/formatTime';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useSession } from '../hooks/useSession';
import { useDialog } from '../context/DialogContext';

export default function Dashboard() {
    const { userName, init, setUserName, logout } = useStore();
    const { t } = useLanguage();
    const { showAlert, showConfirm } = useDialog();
    const [activeView, setActiveView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        init();
    }, []);

    const handleNav = (id) => {
        if (id === 'session') {
            if (routine.length > 0) {
                setActiveView('session');
            } else {
                showAlert('Нет активной сессии!');
            }
            return;
        }
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
        updateRoutineItem,
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
    const [dayFocus, setDayFocus] = useState('speed'); // speed, clarity, stability
    const [smartReview, setSmartReview] = useState(true); // Toggle for Smart Review Engine

    const [courses, setCourses] = useState([]); // List of strict courses
    const [isGuidedMode, setIsGuidedMode] = useState(false);
    const [activeCourseId, setActiveCourseId] = useState(null);
    const [activeCourseDayIndex, setActiveCourseDayIndex] = useState(null);


    const { stepTimer, setStepTimer, isTimerRunning, setIsTimerRunning, toggleTimer } = useSessionTimer(0);
    const [catalog, setCatalog] = useState({ items: [], tags: [], keys: [] });
    const [prefs, setPrefs] = useState(null);
    const [sessionBpm, setSessionBpm] = useState(0);

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

                // 3. Get Strict Courses
                const loadedCourses = await window.electronAPI.invoke('fs:get-courses');
                if (loadedCourses) {
                    setCourses(loadedCourses);
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
        setIsGuidedMode(false); // standard mode
        await generateRoutine(modules, setStepTimer, setIsTimerRunning, setActiveView, dayFocus, smartReview);
    };

    const handleLaunchCourse = (course, dayIndex = null) => {
        setIsGuidedMode(true);
        setActiveCourseId(course.id);

        let playlistToLaunch = course.playlist;
        if (dayIndex !== null && course.days) {
            playlistToLaunch = course.days[dayIndex].items;
            setActiveCourseDayIndex(dayIndex);
        } else {
            setActiveCourseDayIndex(null);
        }

        setRoutine(playlistToLaunch);

        let totalTime = 0;
        playlistToLaunch.forEach(step => {
            totalTime += (step.duration / 60);
        });
        setTotalMinutes(Math.round(totalTime));

        loadStep(0, playlistToLaunch, setStepTimer, setIsTimerRunning);
        setActiveView('session');
    };

    const fetchCourses = async () => {
        if (window.electronAPI) {
            const updatedCourses = await window.electronAPI.invoke('fs:get-courses');
            setCourses(updatedCourses);
        }
    };

    const handleDeleteCourse = async (courseId) => {
        const confirmed = await showConfirm('Вы уверены, что хотите удалить этот курс?');
        if (!confirmed) return;

        const res = await window.electronAPI.invoke('library:delete-course', courseId);
        if (res && res.success) {
            fetchCourses();
            if (activeCourseId === courseId) {
                setActiveCourseId(null);
                setActiveCourseDayIndex(null);
            }
        } else {
            await showAlert('Ошибка при удалении курса: ' + (res?.error || 'Неизвестная ошибка'), { icon: 'error' });
        }
    };

    const handleNext = () => {
        // Save current progress before switching
        updateRoutineItem(currentStepIndex, {
            sessionRemainingTime: stepTimer,
            sessionBpm: sessionBpm || currentItem?.sessionBpm
        });

        if (currentStepIndex < routine.length - 1) {
            loadStep(currentStepIndex + 1, null, setStepTimer, setIsTimerRunning);
            setSessionBpm(0); // Reset for next item
        } else {
            handleFinishSession();
        }
    };

    const handleFinishSession = async () => {
        // If we just finished a day in a multi_day_course
        if (isGuidedMode && activeCourseId && activeCourseDayIndex !== null) {
            const course = courses.find(c => c.id === activeCourseId);
            const currentDayNumber = activeCourseDayIndex + 1;

            if (course && currentDayNumber === course.highestUnlockedDay) {
                // Determine max days 
                const maxDays = course.days?.length || 0;
                if (currentDayNumber < maxDays) {
                    const newHighest = course.highestUnlockedDay + 1;
                    await window.electronAPI.invoke('library:update-course-progress', activeCourseId, newHighest);

                    // Refetch courses silently to update UI
                    const updatedCourses = await window.electronAPI.invoke('fs:get-courses');
                    setCourses(updatedCourses);
                }
            }
        }

        finishSession(setActiveView);
        setIsGuidedMode(false);
        setActiveCourseId(null);
        setActiveCourseDayIndex(null);
    };

    const handlePrev = () => {
        // Save current progress before switching
        updateRoutineItem(currentStepIndex, {
            sessionRemainingTime: stepTimer,
            sessionBpm: sessionBpm || currentItem?.sessionBpm
        });

        if (currentStepIndex > 0) {
            loadStep(currentStepIndex - 1, null, setStepTimer, setIsTimerRunning);
            setSessionBpm(0); // Reset for next item
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
            <main className="flex-1 overflow-y-auto relative z-0 bg-[#0F111A]">
                {activeView === 'dashboard' && (
                    <div className="w-full max-w-[1400px] mx-auto p-16 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 h-full flex flex-col">
                        <header className="mb-12 border-b border-white/[0.05] pb-8">
                            <h1 className="text-4xl font-normal text-white mb-3 tracking-tight">{t('dashboard.title')}</h1>
                            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">{t('dashboard.subtitle')}</p>
                        </header>

                        <div className="flex-1 relative space-y-8">
                            <ModuleConfig
                                modules={modules}
                                setModules={setModules}
                                catalog={catalog}
                                onGenerate={onGenerateRoutine}
                                dayFocus={dayFocus}
                                setDayFocus={setDayFocus}
                                smartReview={smartReview}
                                setSmartReview={setSmartReview}
                                totalMinutes={totalMinutes}
                                setTotalMinutes={setTotalMinutes}
                            />
                        </div>
                    </div>
                )}

                {activeView === 'courses' && (
                    <CoursesView
                        courses={courses}
                        onLaunchCourse={handleLaunchCourse}
                        onDeleteCourse={handleDeleteCourse}
                        onRefreshCourses={fetchCourses}
                        catalog={catalog}
                    />
                )}

                {activeView === 'session' && (
                    <SessionView
                        routine={routine}
                        currentStepIndex={currentStepIndex}
                        stepTimer={stepTimer}
                        isTimerRunning={isTimerRunning}
                        totalMinutes={totalMinutes}
                        onLoadStep={(idx) => {
                            // Save current before jumping
                            updateRoutineItem(currentStepIndex, {
                                sessionRemainingTime: stepTimer,
                                sessionBpm: sessionBpm || currentItem?.sessionBpm
                            });
                            loadStep(idx, null, setStepTimer, setIsTimerRunning);
                            setSessionBpm(0);
                        }}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onToggleTimer={toggleTimer}
                        onFinishSession={handleFinishSession}
                        onSetStepTimer={setStepTimer}
                        onReaperTransport={reaperTransport}
                        onUpdateTotalTime={(val) => handleUpdateTotalTime(val, setStepTimer, isTimerRunning)}
                        onBpmChange={setSessionBpm}
                        launchGuitarPro={prefs?.general?.launchGuitarPro !== false}
                        isGuidedMode={isGuidedMode}
                    />
                )}

                {activeView === 'library' && <Library />}
                {activeView === 'progress' && <ProgressView />}
                {activeView === 'settings' && <SettingsView />}
            </main>
        </div>
    );
}
