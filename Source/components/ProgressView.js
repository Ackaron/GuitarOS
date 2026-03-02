import React, { useState, useEffect } from 'react';
import { ChevronLeft, Download, UploadCloud } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { Button } from './UI';

import DashboardStats from './ProgressView/DashboardStats';
import CategoryExplorer from './ProgressView/CategoryExplorer';
import SkillsMatrix from './ProgressView/SkillsMatrix';
import ItemDetails from './ProgressView/ItemDetails';

const ProgressView = () => {
    const { showAlert, showConfirm } = useDialog();
    const [viewLevel, setViewLevel] = useState('dashboard'); // dashboard | category | detail | skills
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
        const historyData = await window.electronAPI.invoke('analytics:get-mastery');
        const cats = await window.electronAPI.invoke('analytics:get-categories');
        const matrix = await window.electronAPI.invoke('analytics:get-skill-matrix');

        setGlobalStats(stats);
        setHeatmapData(historyData);
        setCategories(cats);
        setSkillMatrixData(matrix);
    };

    const handleCategoryClick = async (categoryName) => {
        setSelectedCategory(categoryName);
        setViewLevel('category');
        setHistory([categoryName]);
        loadFolder(categoryName);

        const mastery = await window.electronAPI.invoke('analytics:get-mastery', categoryName);
        setCategoryMastery(mastery);
    };

    const loadFolder = async (folderPath) => {
        if (!window.electronAPI) return;
        const items = await window.electronAPI.invoke('fs:get-folder', folderPath);

        const enhancedItems = await Promise.all(items.map(async item => {
            if (item.type === 'smart_item' || item.type === 'file') {
                const itemMasteryData = await window.electronAPI.invoke('analytics:get-mastery', null, item.id || item.fsName);
                const lastMastery = itemMasteryData && itemMasteryData.length > 0 ? itemMasteryData[itemMasteryData.length - 1].mastery : 0;
                return { ...item, lastMastery };
            }
            return { ...item, lastMastery: 0 };
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
        const mastery = await window.electronAPI.invoke('analytics:get-mastery', null, item.id);
        setItemMastery(mastery);
        const historyData = await window.electronAPI.invoke('analytics:get-item-history', item.id);
        setItemHistory(historyData || []);
    };

    const handleBack = () => {
        if (viewLevel === 'detail') {
            setViewLevel('category');
            loadFolder(currentPath);
        } else if (viewLevel === 'category') {
            if (history.length > 1) {
                const newHistory = history.slice(0, -1);
                setHistory(newHistory);
                loadFolder(newHistory[newHistory.length - 1]);
            } else {
                setViewLevel('dashboard');
                setHistory([]);
            }
        } else if (viewLevel === 'skills') {
            setViewLevel('dashboard');
        }
    };

    const handleWipeData = async () => {
        const confirmed = await showConfirm("Вы уверены, что хотите удалить ВСЮ статистику?", { icon: 'alert' });
        if (confirmed) {
            if (window.electronAPI) {
                await window.electronAPI.invoke('fs:reset-stats');
                await showAlert("Статистика удалена!", { icon: 'success' });
                loadGlobalData();
            }
        }
    };

    const handleImportPack = async () => {
        if (!window.electronAPI) return;
        const res = await window.electronAPI.invoke('library:import-pack');
        if (res && res.success) {
            await showAlert(`Курс успешно загружен в папку Imports/${res.folder}!`, { icon: 'success' });
            loadGlobalData();
        } else if (res && res.error !== 'User canceled') {
            await showAlert(`Ошибка импорта: ${res.error}`, { icon: 'error' });
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
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            {viewLevel === 'dashboard' ? 'Прогресс' :
                                viewLevel === 'skills' ? 'Дерево навыков' :
                                    viewLevel === 'category' ? selectedCategory : 'Детализация'}
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

                <div className="flex gap-4">
                    {/* Import Button */}
                    {viewLevel === 'dashboard' && (
                        <Button
                            onClick={handleImportPack}
                            variant="outline"
                            className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 text-xs px-4 py-2 h-auto flex gap-2 items-center"
                        >
                            <UploadCloud size={14} /> Импорт Курса (.gpack)
                        </Button>
                    )}

                    {viewLevel === 'dashboard' && (
                        <Button
                            onClick={handleWipeData}
                            variant="outline"
                            className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 text-xs px-4 py-2 h-auto"
                        >
                            Сбросить статистику
                        </Button>
                    )}
                </div>
            </div>

            {viewLevel === 'dashboard' && (
                <DashboardStats
                    globalStats={globalStats}
                    heatmapData={heatmapData}
                    categories={categories}
                    onCategoryClick={handleCategoryClick}
                    onSkillsClick={() => setViewLevel('skills')}
                />
            )}

            {viewLevel === 'skills' && (
                <SkillsMatrix skillMatrixData={skillMatrixData} />
            )}

            {viewLevel === 'category' && (
                <CategoryExplorer
                    selectedCategory={selectedCategory}
                    categoryMastery={categoryMastery}
                    history={history}
                    currentItems={currentItems}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    sortDesc={sortDesc}
                    setSortDesc={setSortDesc}
                    currentPath={currentPath}
                    onFolderClick={handleFolderClick}
                    onItemClick={handleItemClick}
                />
            )}

            {viewLevel === 'detail' && (
                <ItemDetails
                    selectedItem={selectedItem}
                    itemMastery={itemMastery}
                    itemHistory={itemHistory}
                />
            )}
        </div>
    );
};

export default ProgressView;
