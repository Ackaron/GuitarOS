import React, { useState, useEffect } from 'react';
import { Folder, Plus, ArrowLeft, Search, X, Pencil } from 'lucide-react';
import { Button } from './UI';
import { useLanguage } from '../context/LanguageContext';
import { CreateFolderModal, RenameModal, ImportModal, DeleteModal } from './LibraryModals';

export default function Library({ onBack }) {
    const { t } = useLanguage();
    const [history, setHistory] = useState(['/']);
    const currentPath = history[history.length - 1];

    const [libraryData, setLibraryData] = useState([]);
    const [currentItems, setCurrentItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    // type: 'create', 'delete', 'rename', 'import', 'edit'
    const [modal, setModal] = useState({ type: null, data: null });

    useEffect(() => {
        if (currentPath === '/') {
            loadLibrary();
        } else {
            loadFolder(currentPath);
        }
    }, [currentPath]);

    const loadLibrary = async () => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            setIsLoading(true);
            try {
                const data = await window.electronAPI.invoke('fs:get-library');
                setLibraryData(data);
            } catch (e) {
                console.error("Failed to load library", e);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const loadFolder = async (folderId) => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            setIsLoading(true);
            try {
                const items = await window.electronAPI.invoke('fs:get-folder', folderId);
                setCurrentItems(items);
            } catch (e) {
                console.error("Failed to load folder", e);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const openFolder = (folderId) => {
        setHistory(prev => [...prev, folderId]);
    };

    const handleBack = () => {
        if (history.length > 1) {
            setHistory(prev => prev.slice(0, -1));
        }
    };

    const refresh = () => {
        if (currentPath === '/') loadLibrary();
        else loadFolder(currentPath);
    };

    const confirmCreateFolder = async (name) => {
        if (name && window.electronAPI) {
            const res = await window.electronAPI.invoke('fs:create-folder', { name, parent: currentPath === '/' ? null : currentPath });
            if (res.success) {
                setModal({ type: null, data: null });
                refresh();
            } else {
                alert(res.error);
            }
        }
    };

    const confirmDelete = async () => {
        const { id, parent } = modal.data;
        if (window.electronAPI) {
            const res = await window.electronAPI.invoke('fs:delete-item', { id, parent });
            if (res.success) {
                setModal({ type: null, data: null });
                refresh();
            } else {
                alert(res.error);
            }
        }
    };

    const confirmRename = async (newName) => {
        const { id, parent } = modal.data;
        if (window.electronAPI) {
            const res = await window.electronAPI.invoke('fs:rename-item', { id, newName, parent });
            if (res.success) {
                setModal({ type: null, data: null });
                refresh();
            } else {
                alert(res.error);
            }
        }
    };

    const confirmImport = async (importData) => {
        if (window.electronAPI) {
            // Priority: User Selected > Current Path (if inside subfolder) > Default
            let target = 'Exercises'; // Default
            if (importData.targetFolder) target = importData.targetFolder;
            else if (currentPath !== '/') target = currentPath;

            const res = await window.electronAPI.invoke('fs:import-exercise', {
                filePaths: {
                    gp: importData.gpPath,
                    audioBacking: importData.audioBackingPath,
                    audioOriginal: importData.audioOriginalPath
                },
                folder: target,
                metadata: importData.metadata
            });

            if (res.success) {
                setModal({ type: null, data: null });
                refresh();
            } else {
                alert(res.error);
            }
        }
    }

    const confirmEdit = async (editData) => {
        const { id, parent, fsName } = modal.data;

        if (window.electronAPI) {
            const res = await window.electronAPI.invoke('fs:update-metadata', {
                id: fsName, // Use fsName for directory lookup 
                metadata: editData.metadata,
                parent,
                targetFolder: editData.targetFolder, // New
                newFiles: { // New
                    audioBacking: editData.audioBackingPath,
                    audioOriginal: editData.audioOriginalPath
                }
            });

            if (res.success) {
                setModal({ type: null, data: null });
                refresh();
            } else {
                alert(res.error);
            }
        }
    };


    const handleFileClick = async (file) => {
        console.log("Starting Practice Session:", file);
        if (typeof window !== 'undefined' && window.electronAPI) {
            try {
                // Trigger Automation
                const res = await window.electronAPI.invoke('reaper:load-exercise', file);

                if (res.success) {
                    console.log("Session started successfully");
                    // Future: Switch to Focus Mode
                } else {
                    alert('Failed to start session: ' + res.error);
                }
            } catch (e) {
                console.error("IPC Error:", e);
                alert('Connection to backend failed');
            }
        }
    };

    const isRoot = currentPath === '/';

    // Client-side search filter — matches title, name, and key (Theory tonality search)
    const filterItems = (items) => {
        if (!searchQuery.trim()) return items;
        const q = searchQuery.toLowerCase();
        return items.filter(item =>
            (item.title || '').toLowerCase().includes(q) ||
            (item.name || '').toLowerCase().includes(q) ||
            (item.key || '').toLowerCase().includes(q)
        );
    };

    const visibleLibraryData = filterItems(libraryData);
    const visibleCurrentItems = filterItems(currentItems);

    return (
        <div className="h-full flex flex-col pt-2 relative">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    {!isRoot && (
                        <Button variant="ghost" onClick={handleBack} className="text-gray-400 hover:text-white">
                            <ArrowLeft size={20} /> Back
                        </Button>
                    )}
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full bg-[#1A1C28] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF5555]/50 transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button onClick={() => setModal({ type: 'import' })} className="bg-red-600 hover:bg-red-700 text-white border-none flex items-center gap-2">
                        <Plus size={16} /> {t('library.import_gp')}
                    </Button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="text-gray-500 text-center mt-20">Loading Library...</div>
            ) : (
                <div className="grid grid-cols-4 gap-6 animate-in fade-in duration-300">
                    {/* Folders (Root) */}
                    {isRoot && visibleLibraryData.map(folder => (
                        <div key={folder.id}
                            onClick={() => openFolder(folder.id)}
                            className="relative aspect-[4/3] border border-red-500/30 rounded-xl bg-[#151722] flex flex-col items-center justify-center cursor-pointer hover:border-red-500 hover:shadow-[0_0_15px_rgba(255,85,85,0.15)] transition-all group"
                        >
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setModal({ type: 'delete', data: { id: folder.name, parent: null, name: folder.name } });
                                }}
                                className="absolute top-2 right-2 p-2 hover:bg-red-500/20 rounded-full text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-20"
                                title="Delete Folder"
                            >
                                <X size={16} />
                            </div>

                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setModal({ type: 'rename', data: { id: folder.name, parent: null, name: folder.name } });
                                }}
                                className="absolute top-2 right-9 p-2 hover:bg-white/10 rounded-full text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-20"
                                title="Rename Folder"
                            >
                                <Pencil size={16} />
                            </div>

                            <Folder size={64} className="text-gray-200 fill-gray-200/10 mb-3 group-hover:text-white transition-colors" />
                            <span className="text-gray-300 font-medium tracking-wider group-hover:text-white text-sm">{folder.name}</span>
                            <span className="text-xs text-gray-600 mt-1">{folder.itemCount} items</span>
                        </div>
                    ))}

                    {/* New Folder Button */}
                    <div
                        onClick={() => setModal({ type: 'create' })}
                        className="aspect-[4/3] border border-red-500/30 border-dashed rounded-xl bg-[#151722]/50 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group"
                    >
                        <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center mb-3 group-hover:bg-gray-600 transition-colors">
                            <Plus size={32} className="text-white" />
                        </div>
                        <span className="text-gray-400 text-sm">{t('library.create_folder').toUpperCase()}</span>
                    </div>

                    {/* Items & Subfolders */}
                    {!isRoot && visibleCurrentItems.map(item => (
                        item.type === 'folder' ? (
                            <div key={item.id}
                                onClick={() => openFolder(currentPath + '/' + item.name)}
                                className="relative aspect-[4/3] border border-red-500/30 rounded-xl bg-[#151722] flex flex-col items-center justify-center cursor-pointer hover:border-red-500 hover:shadow-[0_0_15px_rgba(255,85,85,0.15)] transition-all group"
                            >
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setModal({ type: 'delete', data: { id: item.fsName || item.name, parent: currentPath, name: item.title || item.name } });
                                    }}
                                    className="absolute top-2 right-2 p-2 hover:bg-red-500/20 rounded-full text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-20"
                                    title="Delete Folder"
                                >
                                    <X size={16} />
                                </div>
                                <Folder size={48} className="text-gray-400 fill-gray-400/10 mb-2 group-hover:text-white transition-colors" />
                                <span className="text-gray-300 font-medium group-hover:text-white text-xs text-center px-2">{item.name}</span>
                            </div>
                        ) : (
                            <div key={item.id}
                                onClick={() => handleFileClick(item)}
                                className="relative min-w-[200px] h-[100px] border border-red-500/30 rounded-lg bg-[#151722] p-4 flex flex-col justify-between hover:bg-red-500/5 hover:border-red-500/60 cursor-pointer transition-all group overflow-hidden"
                                title={item.fsName}
                            >
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setModal({ type: 'delete', data: { id: item.fsName || item.name, parent: currentPath, name: item.title || item.name } });
                                    }}
                                    className="absolute top-2 right-2 p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    title="Delete Item"
                                >
                                    <X size={16} />
                                </div>

                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.type === 'smart_item') {
                                            setModal({ type: 'edit', data: { fsName: item.fsName, parent: currentPath, item: item } });
                                        } else {
                                            setModal({ type: 'rename', data: { id: item.fsName || item.name, parent: currentPath, name: item.title || item.name } });
                                        }
                                    }}
                                    className="absolute top-2 right-8 p-1 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    title="Edit Metadata"
                                >
                                    <Pencil size={16} />
                                </div>

                                <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-300 ${item.status === 'weekly' ? 'bg-green-500' : item.status === 'monthly' ? 'bg-blue-500' : 'bg-red-500/0 group-hover:bg-red-500'}`}></div>
                                <div className="font-medium text-white text-sm relative z-10 truncate pr-16">{item.title || item.name}</div>

                                {/* Badges */}
                                <div className="mt-2 flex gap-1 flex-wrap">
                                    {item.status === 'weekly' && <span className="text-[10px] bg-green-500/20 text-green-400 px-1 rounded">Weekly</span>}
                                    {item.status === 'monthly' && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded">Monthly</span>}
                                    {item.tags && item.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="text-[10px] bg-white/10 text-gray-300 px-1 rounded">{tag}</span>
                                    ))}
                                </div>

                                <div className="text-xs text-gray-500 font-mono relative z-10 flex justify-between items-end mt-auto">
                                    <span>{item.bpm || '?'} BPM</span>
                                    {item.key && <span className="text-[#FF5555] bg-[#FF5555]/10 px-1 rounded">{item.key}</span>}
                                </div>
                            </div>
                        )
                    ))}

                    {!isRoot && visibleCurrentItems.length === 0 && (
                        <div className="col-span-4 text-center text-gray-500 py-10">
                            Folder is empty. Import a file to get started.
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {modal.type === 'create' && (
                <CreateFolderModal
                    onClose={() => setModal({ type: null })}
                    onConfirm={confirmCreateFolder}
                />
            )}
            {modal.type === 'delete' && (
                <DeleteModal
                    data={modal.data}
                    onClose={() => setModal({ type: null })}
                    onConfirm={confirmDelete}
                />
            )}
            {modal.type === 'rename' && (
                <RenameModal
                    data={modal.data}
                    onClose={() => setModal({ type: null })}
                    onConfirm={confirmRename}
                />
            )}
            {modal.type === 'import' && (
                <ImportModal
                    defaultFolder={currentPath}
                    onClose={() => setModal({ type: null })}
                    onConfirm={confirmImport}
                />
            )}
            {modal.type === 'edit' && (
                <ImportModal
                    isEdit={true}
                    defaultFolder={currentPath}
                    initialData={modal.data.item}
                    onClose={() => setModal({ type: null })}
                    onConfirm={confirmEdit}
                />
            )}
        </div>
    );
}


