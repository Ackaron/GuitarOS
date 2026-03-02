import React, { useState, useEffect } from 'react';
import { Search, Folder, ChevronLeft } from 'lucide-react';

const CourseLibraryPanel = ({ catalog, searchTerm, setSearchTerm, currentPath, setCurrentPath, onAddItem }) => {
    const allLibraryItems = catalog?.items || [];
    const [currentFolderItems, setCurrentFolderItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch live folder contents when not searching
    useEffect(() => {
        const loadPath = async () => {
            if (!window.electronAPI) return;
            setIsLoading(true);
            try {
                if (currentPath === '') {
                    const rootItems = await window.electronAPI.invoke('fs:get-library');
                    setCurrentFolderItems(rootItems || []);
                } else {
                    const items = await window.electronAPI.invoke('fs:get-folder', currentPath);
                    setCurrentFolderItems(items || []);
                }
            } catch (e) {
                console.error("Failed to load library path", e);
            } finally {
                setIsLoading(false);
            }
        };

        if (searchTerm.trim() === '') {
            loadPath();
        }
    }, [currentPath, searchTerm]);


    // Filter by search
    if (searchTerm.trim() !== '') {
        const searchChars = searchTerm.toLowerCase();
        const filtered = allLibraryItems.filter(item => {
            const nameChars = (item.title || item.name || '').toLowerCase();
            const catChars = (item.category || '').toLowerCase();
            return nameChars.includes(searchChars) || catChars.includes(searchChars);
        });

        return (
            <div className="flex flex-col h-full bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden relative">
                <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
                <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
                    <div className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase">Результаты поиска ({filtered.length})</div>
                    {filtered.slice(0, 100).map((item, i) => (
                        <div
                            key={`search_${i}`}
                            onClick={() => onAddItem(item)}
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg cursor-pointer transition-colors group"
                        >
                            <div className="flex justify-between items-start">
                                <div className="font-medium text-white text-sm group-hover:text-blue-400 transition-colors">{item.title || item.name}</div>
                                <button className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-3">
                                    Добавить
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded uppercase">{item.category}</span>
                                <span className="text-[10px] text-gray-600 truncate">{item.relPath || 'root'}</span>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <div className="text-center text-gray-500 p-8 text-sm">Ничего не найдено</div>}
                    {filtered.length > 100 && <div className="text-center text-xs text-gray-500 pt-2 pb-4">Показано 100 элементов. Используйте поиск.</div>}
                </div>
            </div>
        );
    }

    // Filter by live Folder Structure
    const folders = currentFolderItems.filter(item => item.type === 'folder');
    const files = currentFolderItems.filter(item => item.type !== 'folder');

    return (
        <div className="flex flex-col h-full bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden relative">
            <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
                {currentPath !== '' && (
                    <div
                        onClick={() => {
                            const parts = currentPath.split('/');
                            parts.pop();
                            setCurrentPath(parts.join('/'));
                        }}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer p-2 mb-2 bg-white/5 rounded-lg border border-white/5 transition-colors"
                    >
                        <ChevronLeft size={16} />
                        <Folder size={14} className="opacity-50" />
                        <span className="font-medium">
                            / {currentPath.split('/').pop()}
                        </span>
                    </div>
                )}
                {currentPath === '' && (
                    <div className="text-xs font-bold text-gray-500 mb-3 px-1 flex items-center gap-2">
                        <Folder size={12} /> Root
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center text-gray-500 p-8 text-sm">Загрузка...</div>
                ) : (
                    <>
                        {folders.map(folder => (
                            <div
                                key={`folder_${folder.id || folder.name}`}
                                onClick={() => setCurrentPath(currentPath ? `${currentPath}/${folder.name}` : folder.name)}
                                className="flex items-center gap-3 p-3 bg-black/40 hover:bg-white/10 border border-white/5 rounded-lg cursor-pointer transition-colors group"
                            >
                                <Folder size={18} className="text-blue-400 group-hover:text-blue-300" />
                                <span className="font-medium text-gray-300 group-hover:text-white text-sm">{folder.name}</span>
                            </div>
                        ))}

                        {files.map((item, i) => (
                            <div
                                key={`item_${item.id || i}`}
                                onClick={() => onAddItem(item)}
                                className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg cursor-pointer transition-colors group flex justify-between items-center"
                            >
                                <div className="flex flex-col flex-1 min-w-0 pr-4">
                                    <span className="font-medium text-white text-sm group-hover:text-blue-400 transition-colors truncate">
                                        {item.title || item.name}
                                    </span>
                                </div>
                                <button className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    Добавить
                                </button>
                            </div>
                        ))}

                        {folders.length === 0 && files.length === 0 && (
                            <div className="text-center text-gray-500 p-8 text-sm">Папка пуста</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const SearchBar = ({ searchTerm, setSearchTerm }) => (
    <div className="p-4 border-b border-white/5 bg-white/[0.01]">
        <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
                type="text"
                placeholder="Поиск по библиотеке..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
            />
        </div>
    </div>
);

export default CourseLibraryPanel;

