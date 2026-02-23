import React, { useState, useEffect } from 'react';
import { Folder, Plus, ArrowLeft, Search, X, AlertTriangle, Pencil, Music, FileCode, Disc, Tag, Calendar } from 'lucide-react';
import { Button } from './UI';
import { useLanguage } from '../context/LanguageContext';

// Internal Modal Component (Generic)
const Modal = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1A1C28] border border-white/10 rounded-xl p-6 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="mb-6 max-h-[70vh] overflow-y-auto pr-2">
                    {children}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    {footer}
                </div>
            </div>
        </div>
    );
};

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
                <Modal
                    isOpen={true}
                    title="Delete Item"
                    onClose={() => setModal({ type: null })}
                    footer={
                        <>
                            <Button variant="ghost" onClick={() => setModal({ type: null })}>Cancel</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>Delete</Button>
                        </>
                    }
                >
                    <div className="flex items-center gap-4 text-gray-300">
                        <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p>Are you sure you want to delete <b>{modal.data?.name}</b>?</p>
                            <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
                        </div>
                    </div>
                </Modal>
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

// Sub-components ... CreateFolder, Rename ...

const CreateFolderModal = ({ onClose, onConfirm }) => {
    const [name, setName] = useState('');
    return (
        <Modal
            isOpen={true}
            title="Create New Folder"
            onClose={onClose}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => onConfirm(name)}
                        disabled={!name.trim()}
                    >
                        Create
                    </Button>
                </>
            }
        >
            <input
                autoFocus
                type="text"
                className="w-full bg-black/20 border border-white/10 rounded p-3 text-white focus:border-red-500 outline-none"
                placeholder="Folder Name (e.g. My Solos)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && onConfirm(name)}
            />
        </Modal>
    );
};

const RenameModal = ({ data, onClose, onConfirm }) => {
    const [name, setName] = useState(data.name || '');

    return (
        <Modal
            isOpen={true}
            title="Rename Item"
            onClose={onClose}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => onConfirm(name)}
                        disabled={!name.trim() || name === data.name}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <input
                autoFocus
                type="text"
                className="w-full bg-black/20 border border-white/10 rounded p-3 text-white focus:border-red-500 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && onConfirm(name)}
            />
        </Modal>
    );
};

// Updated Import Modal with Tags & Status
const ImportModal = ({ onClose, onConfirm, isEdit = false, initialData = null, defaultFolder = '' }) => {
    const [gpPath, setGpPath] = useState(null);
    const [audioBackingPath, setAudioBackingPath] = useState(null);
    const [audioOriginalPath, setAudioOriginalPath] = useState(null);
    const [tagInput, setTagInput] = useState('');
    const [knownTags, setKnownTags] = useState([]);

    const [metadata, setMetadata] = useState({
        title: '',
        bpm: '',
        targetBPM: '',
        key: '',
        difficulty: 5,
        tags: [],
        status: 'none'
    });

    const [targetFolder, setTargetFolder] = useState(isEdit ? initialData.relPath : (defaultFolder && defaultFolder !== '/' ? defaultFolder : 'Exercises'));
    const [availableFolders, setAvailableFolders] = useState(['Exercises', 'Songs', 'Technique', 'Theory', 'Etude']); // Default + discovered

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.invoke('fs:get-tags').then(setKnownTags);
            // Fetch ALL subfolders recursively for the dropdown
            window.electronAPI.invoke('fs:get-all-folders').then(folders => {
                setAvailableFolders(folders);
                // If not editing, and we have a deep current path, ensure it's in the list and selected
                if (!isEdit && defaultFolder && defaultFolder !== '/') {
                    setTargetFolder(defaultFolder.replace(/\\/g, '/'));
                }
            });
        }

        if (isEdit && initialData) {
            setMetadata({
                title: initialData.title || '',
                bpm: initialData.bpm || '',
                targetBPM: initialData.targetBPM || '',
                key: initialData.key || '', // Allow empty
                difficulty: initialData.difficulty || 5,
                tags: initialData.tags || [],
                status: initialData.status || 'none'
            });
            setTargetFolder(initialData.relPath || 'Exercises');
        } else {
            // Import Mode Defaults
            setMetadata(prev => ({ ...prev, key: '' }));
        }
    }, [isEdit, initialData]);

    const handleSelectFile = async (type) => {
        if (window.electronAPI) {
            const result = await window.electronAPI.invoke('fs:select-file', type === 'gp' ? 'gp' : 'audio');
            if (!result.canceled && result.filePaths.length > 0) {
                if (type === 'gp') {
                    setGpPath(result.filePaths[0]);
                    if (!metadata.title) {
                        const name = result.filePaths[0].split('\\').pop().split('/').pop().replace(/\.[^/.]+$/, "");
                        setMetadata(prev => ({ ...prev, title: name }));
                    }
                } else if (type === 'backing') {
                    setAudioBackingPath(result.filePaths[0]);
                } else if (type === 'original') {
                    setAudioOriginalPath(result.filePaths[0]);
                }
            }
        }
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (!metadata.tags.includes(newTag)) {
                setMetadata(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tag) => {
        setMetadata(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const handleSubmit = () => {
        if (!isEdit && !gpPath) return;

        // Validation: Key required only for Theory
        if (targetFolder === 'Theory' && !metadata.key) {
            alert("Key is required for Theory items.");
            return;
        }

        onConfirm({
            gpPath,
            audioBackingPath,
            audioOriginalPath,
            metadata,
            targetFolder // Pass the selected folder
        });
    };

    const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

    return (
        <Modal
            isOpen={true}
            title={isEdit ? "Edit Metadata" : "Import Exercise"}
            onClose={onClose}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleSubmit}
                        disabled={!isEdit && (!gpPath || !metadata.title)}
                    >
                        {isEdit ? "Save Changes" : "Import"}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {/* Folder Selection (Move/Import) */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Location</label>
                    <select
                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm focus:border-red-500 outline-none"
                        value={targetFolder}
                        onChange={(e) => setTargetFolder(e.target.value)}
                    // Always enabled now
                    >
                        {availableFolders.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>

                {/* File Uploads (Always Visible now, but GP read-only on Edit) */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Files</label>

                    {!isEdit && (
                        <Button
                            onClick={() => handleSelectFile('gp')}
                            className={`w-full border border-dashed flex items-center justify-center gap-2 h-12 mb-2 ${gpPath ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-white/20 text-gray-400 hover:border-white/50'}`}
                        >
                            <FileCode size={18} />
                            <span className="truncate">{gpPath ? gpPath.split('\\').pop() : 'Select Guitar Pro File (.gp, .gp5)*'}</span>
                        </Button>
                    )}

                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleSelectFile('backing')}
                            className={`flex-1 border border-dashed flex items-center justify-center gap-2 h-12 ${audioBackingPath || (isEdit && initialData.files?.backing) ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/20 text-gray-400 hover:border-white/50'}`}
                        >
                            <Music size={18} />
                            <span className="truncate max-w-[150px]">
                                {audioBackingPath ? audioBackingPath.split('\\').pop() : (isEdit && initialData.files?.backing ? 'Replace Backing' : 'Add Backing')}
                            </span>
                        </Button>

                        <Button
                            onClick={() => handleSelectFile('original')}
                            className={`flex-1 border border-dashed flex items-center justify-center gap-2 h-12 ${audioOriginalPath || (isEdit && initialData.files?.original) ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/20 text-gray-400 hover:border-white/50'}`}
                        >
                            <Disc size={18} />
                            <span className="truncate max-w-[150px]">
                                {audioOriginalPath ? audioOriginalPath.split('\\').pop() : (isEdit && initialData.files?.original ? 'Replace Original' : 'Add Original')}
                            </span>
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Metadata</label>

                    <input
                        type="text"
                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm focus:border-red-500 outline-none"
                        placeholder="Title (e.g. Neon - John Mayer)"
                        value={metadata.title}
                        onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    />

                    <div className="grid grid-cols-3 gap-3">
                        <input
                            type="number"
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm focus:border-red-500 outline-none"
                            placeholder="BPM (Start)"
                            value={metadata.bpm}
                            onChange={(e) => setMetadata({ ...metadata, bpm: e.target.value })}
                        />

                        <input
                            type="number"
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm focus:border-red-500 outline-none"
                            placeholder="Target BPM"
                            value={metadata.targetBPM}
                            onChange={(e) => setMetadata({ ...metadata, targetBPM: e.target.value })}
                        />

                        <select
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm focus:border-red-500 outline-none"
                            value={metadata.key}
                            onChange={(e) => setMetadata({ ...metadata, key: e.target.value })}
                        >
                            <option value="">No Key</option>
                            {keys.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>

                    {/* Status Select */}
                    <div className="flex bg-black/20 rounded p-1 border border-white/10">
                        {['none', 'weekly', 'monthly'].map(status => (
                            <button
                                key={status}
                                onClick={() => setMetadata({ ...metadata, status })}
                                className={`flex-1 py-1 text-xs uppercase font-bold rounded ${metadata.status === status ? (status === 'none' ? 'bg-gray-600 text-white' : status === 'weekly' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white') : 'text-gray-500 hover:text-white'}`}
                            >
                                {status === 'none' ? 'No Plan' : status}
                            </button>
                        ))}
                    </div>

                    {/* Tags Input */}
                    <div className="bg-black/20 border border-white/10 rounded p-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {metadata.tags.map(tag => (
                                <span key={tag} className="bg-white/10 text-xs px-2 py-1 rounded flex items-center gap-1 group">
                                    {tag}
                                    <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeTag(tag)} />
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            className="w-full bg-transparent text-white text-sm outline-none"
                            placeholder="Add tags (Type & Enter)..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            list="known-tags"
                        />
                        <datalist id="known-tags">
                            {knownTags.map(tag => <option key={tag} value={tag} />)}
                        </datalist>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                        <span className="uppercase tracking-widest font-bold">Difficulty</span>
                        <span className="text-white font-bold">{metadata.difficulty}/10</span>
                    </div>
                    <input
                        type="range"
                        min="1" max="10"
                        className="w-full accent-red-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        value={metadata.difficulty}
                        onChange={(e) => setMetadata({ ...metadata, difficulty: e.target.value })}
                    />
                </div>
            </div>
        </Modal>
    );
};
