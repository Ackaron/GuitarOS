import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
    Activity, Target, Flame, ChevronLeft, Calendar,
    Music, Zap, BookOpen, Layers, Star, Hexagon,
    Folder, ChevronDown, SortAsc, SortDesc
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

    // Folder Navigation State
    const [history, setHistory] = useState([]);
    const currentPath = history[history.length - 1];
    const [currentItems, setCurrentItems] = useState([]); // Folders & Files
    const [sortBy, setSortBy] = useState('name'); // 'name' | 'mastery'
    const [sortDesc, setSortDesc] = useState(false);

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
        setHistory([categoryName]); // Root for this category
        loadFolder(categoryName);

        // Load Global Mastery for this Category root
        const mastery = await window.electronAPI.invoke('analytics:get-mastery', categoryName);
        setCategoryMastery(mastery);
    };

    const loadFolder = async (folderPath) => {
        if (!window.electronAPI) return;
        const items = await window.electronAPI.invoke('fs:get-folder', folderPath);

        // Enhance items with mastery data for sorting purposes
        const enhancedItems = await Promise.all(items.map(async item => {
            if (item.type === 'smart_item' || item.type === 'file') {
                const itemMasteryData = await window.electronAPI.invoke('analytics:get-mastery', null, item.id || item.fsName);
                const lastMastery = itemMasteryData && itemMasteryData.length > 0 ? itemMasteryData[itemMasteryData.length - 1].mastery : 0;
                return { ...item, lastMastery };
            }
            return { ...item, lastMastery: 0 }; // Folders don't sort by mastery natively
        }));

        setCurrentItems(enhancedItems);
    };

    const handleFolderClick = (folderName) => {
        const nextPath = `${currentPath}/${folderName}`;
        setHistory(prev => [...prev, nextPath]);
        loadFolder(nextPath);
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
        if (viewLevel === 'detail') {
            setViewLevel('category');
            loadFolder(currentPath); // Refresh folder when leaving detail
        } else if (viewLevel === 'category') {
            if (history.length > 1) {
                // Pop the last folder, load the parent
                const newHistory = history.slice(0, -1);
                setHistory(newHistory);
                loadFolder(newHistory[newHistory.length - 1]);
            } else {
                // We're at the root of the category, return to dashboard
                setViewLevel('dashboard');
                setHistory([]);
            }
        } else if (viewLevel === 'skills') {
            setViewLevel('dashboard');
        }
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
            <div className="bg-white/[0.02] p-6 rounded-2xl">
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
                        className="bg-white/[0.02] p-6 rounded-2xl hover:bg-white/[0.04] transition-all cursor-pointer group"
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
            <div className="bg-white/[0.02] p-8 rounded-3xl flex flex-col xl:flex-row gap-8">
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
                            <div key={skill.subject} className="bg-white/[0.01] p-4 rounded-xl flex flex-col gap-2">
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

    const renderCategoryView = () => {
        // Apply Sorting
        const sortedItems = [...currentItems].sort((a, b) => {
            // Always keep folders at the top regardless of sort mode
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;

            if (sortBy === 'name') {
                const nameA = (a.title || a.name || '').toLowerCase();
                const nameB = (b.title || b.name || '').toLowerCase();
                return sortDesc ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
            } else if (sortBy === 'mastery') {
                const scoreA = a.lastMastery || 0;
                const scoreB = b.lastMastery || 0;
                return sortDesc ? scoreB - scoreA : scoreA - scoreB;
            }
            return 0;
        });

        return (
            <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
                {/* Category Quality Graph */}
                {history.length === 1 && ( // Only show global graph at root of category
                    <div className="bg-white/[0.02] p-6 rounded-2xl mb-8">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Activity size={20} className="text-[#2563eb]" /> Качество: {selectedCategory}
                        </h3>
                        <ActivityHeatmap data={categoryMastery} />
                    </div>
                )}

                {/* Directory Controls */}
                <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar max-w-[60%]">
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-bold whitespace-nowrap">
                            <Folder size={16} className="text-gray-500" />
                            {history.join(' / ')}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white/5 rounded-lg p-1">
                            <button
                                onClick={() => setSortBy('name')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${sortBy === 'name' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                А-Я
                            </button>
                            <button
                                onClick={() => setSortBy('mastery')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${sortBy === 'mastery' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                Мастерство
                            </button>
                        </div>
                        <button
                            onClick={() => setSortDesc(!sortDesc)}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                            {sortDesc ? <SortDesc size={16} /> : <SortAsc size={16} />}
                        </button>
                    </div>
                </div>

                {/* Item List */}
                <div className="grid grid-cols-1 gap-4">
                    {sortedItems.length === 0 ? (
                        <div className="text-center p-12 bg-white/[0.01] rounded-2xl border border-white/5 border-dashed">
                            <div className="text-gray-500 mb-2 font-medium">Папка пуста</div>
                        </div>
                    ) : (
                        sortedItems.map(item => (
                            <div
                                key={item.id || item.fsName}
                                onClick={() => item.type === 'folder' ? handleFolderClick(item.name) : handleItemClick(item)}
                                className="bg-white/[0.02] p-4 rounded-xl hover:bg-white/[0.04] cursor-pointer flex items-center justify-between transition-all group border border-transparent hover:border-white/5"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-colors ${item.type === 'folder' ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white'}`}>
                                        {item.type === 'folder' ? <Folder size={20} /> : (item.title || item.name).charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-lg">{item.title || item.name}</div>
                                        <div className="text-xs text-gray-500 uppercase tracking-widest">
                                            {item.type === 'folder' ? `${item.itemCount || 0} Файлов` : (item.key || 'Нет тональности')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    {item.type !== 'folder' && (
                                        <div className="text-right mr-4">
                                            <div className={`font-mono font-bold text-lg ${item.lastMastery > 80 ? 'text-green-400' : item.lastMastery > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {item.lastMastery}%
                                            </div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">Качество</div>
                                        </div>
                                    )}
                                    <ChevronLeft className="rotate-180 text-gray-600 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    const renderDetailView = () => (
        <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="bg-white/[0.02] p-8 rounded-3xl">
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
                        <div className="bg-white/[0.01] p-4 rounded-xl text-center">
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
                        <button
                            onClick={handleBack}
                            className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/20 transition-all"
                            title="Go Back"
                        >
                            <ChevronLeft size={24} />
                        </button>
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
    <div className="bg-white/[0.02] p-6 rounded-2xl relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-4 rounded-bl-2xl ${bg} ${color}`}>
            <Icon size={24} />
        </div>
        <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">{label}</div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-gray-500">{sub}</div>
    </div>
);

export default ProgressView;
