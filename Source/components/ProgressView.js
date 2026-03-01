import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
    Activity, Target, Flame, ChevronLeft, Calendar,
    Music, Zap, BookOpen, Layers, Star, Hexagon
} from 'lucide-react';
import ActivityHeatmap from './ActivityHeatmap';
import SkillMatrixChart from './SkillMatrixChart';
import { Button } from './UI';

const ProgressView = () => {
    const [viewLevel, setViewLevel] = useState('dashboard'); // dashboard | category | detail
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    // Data State
    const [globalStats, setGlobalStats] = useState(null);
    const [heatmapData, setHeatmapData] = useState([]);
    const [skillMatrixData, setSkillMatrixData] = useState([]);
    const [categories, setCategories] = useState([]);
    const [itemHistory, setItemHistory] = useState([]);
    const [catalogItems, setCatalogItems] = useState([]); // For Category View list

    const [categoryMastery, setCategoryMastery] = useState([]);
    const [itemMastery, setItemMastery] = useState([]);

    useEffect(() => {
        loadGlobalData();
    }, []);

    const loadGlobalData = async () => {
        if (!window.electronAPI) return;
        const stats = await window.electronAPI.invoke('analytics:get-global');
        // Retrieve Mastery Trend (Global)
        const history = await window.electronAPI.invoke('analytics:get-mastery');
        const cats = await window.electronAPI.invoke('analytics:get-categories');
        const matrix = await window.electronAPI.invoke('analytics:get-skill-matrix');

        setGlobalStats(stats);
        setHeatmapData(history);
        setCategories(cats);
        setSkillMatrixData(matrix);
    };

    const handleCategoryClick = async (categoryName) => {
        setSelectedCategory(categoryName);
        setViewLevel('category');

        // Load items for this category
        const catalog = await window.electronAPI.invoke('fs:get-catalog');
        const categoryItems = catalog.items.filter(i => {
            // ... existing filter logic
            if (categoryName === 'Technique') return i.path.includes('Technique');
            if (categoryName === 'Songs') return i.path.includes('Songs');
            return i.parent === categoryName.toLowerCase() || i.path.includes(categoryName);
        });
        setCatalogItems(categoryItems);

        // Load Mastery for Category
        const mastery = await window.electronAPI.invoke('analytics:get-mastery', categoryName); // Filter by cat
        setCategoryMastery(mastery);
    };

    const handleItemClick = async (item) => {
        setSelectedItem(item);
        setViewLevel('detail');
        // Fetch Mastery trend for specific Item
        const mastery = await window.electronAPI.invoke('analytics:get-mastery', null, item.id);
        setItemMastery(mastery);
        // Fetch raw check-in history for confidence/stars display
        const history = await window.electronAPI.invoke('analytics:get-item-history', item.id);
        setItemHistory(history || []);
    };

    const handleBack = () => {
        if (viewLevel === 'detail') setViewLevel('category');
        else if (viewLevel === 'category') setViewLevel('dashboard');
    };

    // --- RENDERERS ---

    const renderDashboard = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard icon={Activity} label="Всего часов" value={globalStats?.totalHours || 0} sub="За все время" color="text-[#2563eb]" bg="bg-[#2563eb]/10" />
                <KPICard icon={Target} label="Ср. Оценка" value={`${globalStats?.averageScore || 0}%`} sub="За сессию" color="text-yellow-500" bg="bg-yellow-500/10" />
                <KPICard icon={Flame} label="Серия" value={`${globalStats?.daysActive || 0} Дней`} sub="Регулярность" color="text-orange-500" bg="bg-orange-500/10" />
                <KPICard icon={Calendar} label="Сессии" value={globalStats?.totalCheckins || 0} sub="Завершено" color="text-blue-500" bg="bg-blue-500/10" />
            </div>

            {/* Global Quality Graph */}
            <div className="bg-[#1A1D2D] p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-[#2563eb]" /> Тренд качества
                    </h3>
                    <Button
                        onClick={() => setViewLevel('skills')}
                        variant="ghost"
                        className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-blue-500/20 text-sm px-4 rounded-full flex items-center gap-2"
                    >
                        <Hexagon size={16} /> Матрица навыков
                    </Button>
                </div>
                <ActivityHeatmap data={heatmapData} />
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(cat => (
                    <div
                        key={cat.name}
                        onClick={() => handleCategoryClick(cat.name)}
                        className="bg-[#1A1D2D] p-6 rounded-2xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-lg bg-white/5 group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
                                    {cat.name === 'Technique' && <Zap size={24} />}
                                    {cat.name === 'Songs' && <Music size={24} />}
                                    {cat.name === 'Theory' && <BookOpen size={24} />}
                                    {cat.name === 'Exercises' && <Layers size={24} />}
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white">{cat.name}</h4>
                                    <div className="text-sm text-gray-500">{cat.sessions} сессий</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white">{cat.hours}h</div>
                                <div className="text-xs text-green-500 font-mono">+{cat.growth} BPM</div>
                            </div>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500/50 group-hover:bg-red-500 transition-all" style={{ width: `${Math.min(100, cat.sessions * 2)}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSkillsView = () => (
        <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
            <div className="bg-[#1A1D2D] p-8 rounded-3xl border border-white/5 shadow-2xl flex flex-col xl:flex-row gap-8">
                {/* Radar Chart */}
                <div className="flex-1 min-h-[500px] flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Hexagon size={24} className="text-[#2563eb]" /> Матрица навыков
                    </h3>
                    <div className="flex-1 bg-white/5 rounded-2xl p-4 flex items-center justify-center">
                        <SkillMatrixChart data={skillMatrixData} />
                    </div>
                </div>

                {/* Score List */}
                <div className="w-full xl:w-[400px] flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-[#2563eb]" /> Очки техник
                    </h3>
                    <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {skillMatrixData.map(skill => (
                            <div key={skill.subject} className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">{skill.subject}</span>
                                    <span className="text-blue-400 font-mono text-sm">{skill.A} / 100</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${skill.A}%` }} />
                                </div>
                            </div>
                        ))}
                        {skillMatrixData.length === 0 && (
                            <div className="text-center text-gray-500 text-sm mt-8">Техники пока не зафиксированы.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCategoryView = () => (
        <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
            {/* Category Quality Graph */}
            <div className="bg-[#1A1D2D] p-6 rounded-2xl border border-white/5 mb-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Activity size={20} className="text-[#2563eb]" /> Качество: {selectedCategory}
                </h3>
                <ActivityHeatmap data={categoryMastery} />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {catalogItems.map(item => (
                    <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="bg-[#1A1D2D] p-4 rounded-xl border border-white/5 hover:bg-[#202436] hover:border-white/20 cursor-pointer flex items-center justify-between transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center font-bold text-gray-500">
                                {item.title.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-white text-lg">{item.title}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-widest">{item.key || 'Нет тональности'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <ChevronLeft className="rotate-180 text-gray-600" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderDetailView = () => (
        <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="bg-[#1A1D2D] p-8 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-2">{selectedItem?.title}</h2>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs border border-white/10">{selectedItem?.key}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500 uppercase tracking-widest mb-1">Последняя оценка качества</div>
                        {itemMastery.length > 0 ? (
                            <div className="text-3xl font-mono font-bold text-[#2563eb]">
                                {itemMastery[itemMastery.length - 1].mastery}%
                            </div>
                        ) : (
                            <div className="text-3xl font-mono font-bold text-gray-700">--</div>
                        )}
                    </div>
                </div>

                {/* CHART: Replaced AreaChart with Mastery Heatmap */}
                <div className="h-80 w-full mb-8">
                    <ActivityHeatmap data={itemMastery} />
                </div>

                {/* Objective Stats / Future Telemetry Placeholders */}
                {(() => {
                    const lastEntry = itemHistory[itemHistory.length - 1];
                    return (
                        <div className="bg-black/20 p-4 rounded-xl text-center border border-white/5">
                            <div className="text-gray-500 text-xs uppercase mb-2 tracking-wider">Макс. Темп</div>
                            <div className="text-white font-bold text-2xl font-mono">
                                {lastEntry && lastEntry.bpm ? `${lastEntry.bpm} BPM` : '--'}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );

    const handleClearStats = async () => {
        if (confirm("Вы уверены, что хотите удалить ВСЮ статистику? Отменить действие будет невозможно.")) {
            if (window.electronAPI) {
                await window.electronAPI.invoke('analytics:clear-history');
                loadGlobalData(); // Refresh
                alert("Статистика удалена!");
            }
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen relative">

            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    {viewLevel !== 'dashboard' && (
                        <Button
                            onClick={handleBack}
                            variant="ghost"
                            className="rounded-full w-12 h-12 p-0 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white border border-white/5"
                            title="Go Back"
                        >
                            <ChevronLeft size={24} />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            {viewLevel === 'dashboard' ? 'Прогресс' :
                                viewLevel === 'skills' ? 'Дерево навыков' :
                                    viewLevel === 'category' ? selectedCategory :
                                        'Детализация'}
                        </h1>
                        {/* Breadcrumbs / Subtitle */}
                        {viewLevel === 'detail' && selectedCategory && (
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                <span>{selectedCategory}</span>
                                <span className="text-gray-700">/</span>
                                <span className="text-gray-300">{selectedItem?.title}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Clear Stats Button (Only visible on Dashboard) */}
                {viewLevel === 'dashboard' && (
                    <Button
                        onClick={handleClearStats}
                        variant="outline"
                        className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 text-xs px-4 py-2 h-auto"
                    >
                        Сбросить статистику
                    </Button>
                )}
            </div>

            {viewLevel === 'dashboard' && renderDashboard()}
            {viewLevel === 'skills' && renderSkillsView()}
            {viewLevel === 'category' && renderCategoryView()}
            {viewLevel === 'detail' && renderDetailView()}
        </div>
    );
};

const KPICard = ({ icon: Icon, label, value, sub, color, bg }) => (
    <div className="bg-[#1A1D2D] p-6 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-4 rounded-bl-2xl ${bg} ${color}`}>
            <Icon size={24} />
        </div>
        <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">{label}</div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-gray-500">{sub}</div>
    </div>
);

export default ProgressView;
