import React from 'react';
import { Activity, Folder, ChevronLeft, SortAsc, SortDesc, Download } from 'lucide-react';
import ActivityHeatmap from '../ActivityHeatmap';

const CategoryExplorer = ({
    selectedCategory, categoryMastery,
    history, currentItems,
    sortBy, setSortBy, sortDesc, setSortDesc,
    currentPath, onFolderClick, onItemClick
}) => {
    // Apply Sorting
    const sortedItems = [...currentItems].sort((a, b) => {
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
                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl mb-8">
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
                    <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
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
                            onClick={() => item.type === 'folder' ? onFolderClick(item.name) : onItemClick(item)}
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

export default CategoryExplorer;
