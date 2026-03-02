import React, { useState } from 'react';
import { Lock, Play, ChevronLeft, Trash2, Download } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

const CoursesView = ({ courses, onLaunchCourse, onDeleteCourse, onRefreshCourses }) => {
    const { showAlert } = useDialog();
    const [selectedCourse, setSelectedCourse] = useState(null);

    const handleImportCourse = async () => {
        if (!window.electronAPI) return;

        const res = await window.electronAPI.invoke('library:import-pack');
        if (res && res.success) {
            await showAlert(`Курс успешно импортирован:\n${res.folder}`, { icon: 'success' });
            if (onRefreshCourses) onRefreshCourses();
        } else if (res && res.error !== 'User canceled') {
            await showAlert(`Ошибка импорта: ${res.error}`, { icon: 'error' });
        }
    };

    const handleCourseClick = (course) => {
        if (course.type === 'multi_day_course') {
            setSelectedCourse(course);
        } else {
            onLaunchCourse(course);
        }
    };

    if (selectedCourse) {
        return (
            <div className="w-full max-w-[1400px] mx-auto p-16 animate-in fade-in slide-in-from-right-4 duration-500 relative z-10 h-full flex flex-col">
                <header className="mb-12 border-b border-white/[0.05] pb-8 flex items-center gap-6">
                    <button onClick={() => setSelectedCourse(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-4xl font-normal text-white mb-3 tracking-tight">{selectedCourse.name}</h1>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">MULTI-DAY COURSE</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto pr-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {selectedCourse.days.map((day, idx) => {
                            const dayNumber = idx + 1;
                            const isLocked = dayNumber > selectedCourse.highestUnlockedDay;

                            let totalMinutes = 0;
                            day.items.forEach(item => totalMinutes += Math.round(item.duration / 60));

                            return (
                                <div
                                    key={idx}
                                    onClick={() => !isLocked && onLaunchCourse(selectedCourse, idx)}
                                    className={`relative p-8 rounded-xl border flex flex-col items-center justify-center text-center gap-3 transition-all ${isLocked
                                        ? 'bg-transparent border-white/[0.02] opacity-50 cursor-not-allowed'
                                        : 'bg-white/[0.02] border-white/[0.05] hover:border-[#E63946]/50 hover:bg-white/[0.05] cursor-pointer group'
                                        }`}
                                >
                                    <div className={`text-5xl font-bold font-mono tracking-tighter ${isLocked ? 'text-gray-600' : 'text-white group-hover:text-[#E63946]'}`}>
                                        {dayNumber}
                                    </div>
                                    <div className="text-sm font-medium text-gray-400 mt-2 truncate w-full px-2" title={day.title || `День ${dayNumber}`}>
                                        {day.title || `День ${dayNumber}`}
                                    </div>
                                    <div className="text-xs font-mono text-gray-500 flex items-center justify-center gap-2 mt-2 bg-white/5 px-3 py-1 pb-1.5 rounded-full">
                                        <span>{day.items.length} упр</span>
                                        <span className="opacity-50">•</span>
                                        <span>{totalMinutes} м</span>
                                    </div>

                                    {isLocked && (
                                        <div className="absolute top-4 right-4 text-gray-600">
                                            <Lock size={16} />
                                        </div>
                                    )}
                                    {!isLocked && (
                                        <div className="absolute top-4 right-4 text-[#E63946] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play size={16} fill="currentColor" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto p-16 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 h-full flex flex-col">
            <header className="mb-12 border-b border-white/[0.05] pb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-normal text-white mb-3 tracking-tight">Готовые Курсы</h1>
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">СТРОГИЕ И МНОГОДНЕВНЫЕ ПРОГРАММЫ</p>
                </div>
                <button onClick={handleImportCourse} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors">
                    <Download size={16} className="rotate-180" /> Импорт Курса
                </button>
            </header>

            <div className="flex-1 relative space-y-8">
                {courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => {
                            let totalMinutes = 0;
                            course.playlist.forEach(item => totalMinutes += Math.round(item.duration / 60));

                            return (
                                <div
                                    key={course.id}
                                    onClick={() => handleCourseClick(course)}
                                    className="relative bg-white/[0.02] border border-white/[0.05] hover:border-[#E63946]/50 hover:bg-white/[0.05] p-6 rounded-xl cursor-pointer transition-all flex flex-col gap-4 group overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#E63946]/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                    <div className="font-bold text-xl text-white group-hover:text-[#E63946] transition-colors relative z-10 pr-6">
                                        {course.name}
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-400 font-mono relative z-10">
                                        <span className="bg-white/5 py-1 px-3 rounded text-xs">{course.itemsCount || course.days?.length} шагов/дней</span>
                                        <span className="font-bold text-white">{totalMinutes} мин</span>
                                    </div>

                                    {onDeleteCourse && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteCourse(course.id);
                                            }}
                                            className="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                            title="Удалить курс"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] rounded-2xl border border-white/[0.02]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <span className="text-2xl">📦</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Нет готовых курсов</h3>
                        <p className="text-gray-500 text-center max-w-sm mb-6">
                            Импортируйте .gpack файлы с экспортированными программами, чтобы они появились здесь.
                        </p>
                        <button onClick={handleImportCourse} className="bg-[#E63946] hover:bg-red-600 text-white font-medium flex items-center gap-2 px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-red-500/20">
                            <Download size={18} className="rotate-180" /> Импорт Курса
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoursesView;
