import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

import CourseDaysSidebar from './CourseBuilder/CourseDaysSidebar';
import CourseTimeline from './CourseBuilder/CourseTimeline';
import CourseLibraryPanel from './CourseBuilder/CourseLibraryPanel';

const CourseBuilder = ({ catalog }) => {
    const { showAlert } = useDialog();
    const [packName, setPackName] = useState('Новый Мульти-Курс');
    const [author, setAuthor] = useState('GuitarOS Author');
    const [days, setDays] = useState([{ day: 1, title: 'Введение', items: [] }]);
    const [activeDayIndex, setActiveDayIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPath, setCurrentPath] = useState('');

    const handleAddDay = () => {
        setDays([...days, { day: days.length + 1, title: `День ${days.length + 1}`, items: [] }]);
        setActiveDayIndex(days.length);
    };

    const handleRemoveDay = (index) => {
        const newDays = days.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 }));
        setDays(newDays);
        if (activeDayIndex >= newDays.length) setActiveDayIndex(Math.max(0, newDays.length - 1));
    };

    const handleDayTitleChange = (val) => {
        const newDays = [...days];
        newDays[activeDayIndex].title = val;
        setDays(newDays);
    }

    const handleAddItemToDay = (catalogItem) => {
        const newDays = [...days];
        newDays[activeDayIndex].items.push({ ...catalogItem, duration: 300 });
        setDays(newDays);
    };

    const handleRemoveItemFromDay = (itemIndex) => {
        const newDays = [...days];
        newDays[activeDayIndex].items.splice(itemIndex, 1);
        setDays(newDays);
    };

    const handleUpdateItemDuration = (itemIndex, minutesString) => {
        const mins = parseInt(minutesString) || 1;
        const newDays = [...days];
        newDays[activeDayIndex].items[itemIndex].duration = mins * 60;
        setDays(newDays);
    };

    const handleExportCourse = async () => {
        if (!packName) return await showAlert('Введите название курса!', { icon: 'alert' });
        if (days.length === 0) return await showAlert('Курс должен содержать хотя бы один день!', { icon: 'alert' });
        for (const d of days) {
            if (d.items.length === 0) return await showAlert(`День ${d.day} не содержит упражнений!`, { icon: 'alert' });
        }

        const payload = { packName, type: "multi_day_course", author, days };
        if (window.electronAPI) {
            const res = await window.electronAPI.invoke('library:export-routine', payload);
            if (res && res.success) await showAlert(`Успешно экспортировано:\n${res.path}`, { icon: 'success' });
            else if (res && res.error !== 'User canceled') await showAlert(`Ошибка: ${res.error}`, { icon: 'error' });
        }
    };

    return (
        <div className="w-full max-w-[1400px] mx-auto p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 h-full flex flex-col">
            <header className="mb-8 border-b border-white/[0.05] pb-6 flex justify-between items-end shrink-0">
                <div>
                    <h1 className="text-4xl font-normal text-white mb-2 tracking-tight">Конструктор</h1>
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Multi-Day Course Builder</p>
                </div>
                <button onClick={handleExportCourse} className="bg-[#E63946] hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                    <Download size={18} /> Скомпилировать .gpack
                </button>
            </header>

            <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
                <div className="col-span-12 lg:col-span-3 min-h-0">
                    <CourseDaysSidebar
                        packName={packName} setPackName={setPackName}
                        author={author} setAuthor={setAuthor}
                        days={days} activeDayIndex={activeDayIndex}
                        onAddDay={handleAddDay} onRemoveDay={handleRemoveDay} setActiveDayIndex={setActiveDayIndex}
                    />
                </div>
                <div className="col-span-12 lg:col-span-5 min-h-0">
                    <CourseTimeline
                        activeDay={days[activeDayIndex]}
                        onTitleChange={handleDayTitleChange}
                        onRemoveItem={handleRemoveItemFromDay}
                        onUpdateDuration={handleUpdateItemDuration}
                    />
                </div>
                <div className="col-span-12 lg:col-span-4 min-h-0">
                    <CourseLibraryPanel
                        catalog={catalog}
                        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                        currentPath={currentPath} setCurrentPath={setCurrentPath}
                        onAddItem={handleAddItemToDay}
                    />
                </div>
            </div>
        </div>
    );
};

export default CourseBuilder;
