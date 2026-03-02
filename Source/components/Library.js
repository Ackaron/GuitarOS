import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Search, Download } from 'lucide-react';
import { Button } from './UI';
import { useLanguage } from '../context/LanguageContext';
import { useDialog } from '../context/DialogContext';
import { CreateFolderModal, RenameModal, ImportModal, DeleteModal } from './LibraryModals';
import { FolderGridItem, FileGridItem } from './Library/LibraryGridItems';

export default function Library({ onBack }) {
    const { t } = useLanguage();
    const { showAlert, showConfirm } = useDialog();
    const [history, setHistory] = useState(['/']);
    const currentPath = history[history.length - 1];

    const [libraryData, setLibraryData] = useState([]);
    const [currentItems, setCurrentItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Modal State: type: 'create', 'delete', 'rename', 'import', 'edit'
    const [modal, setModal] = useState({ type: null, data: null });

    useEffect(() => {
        if (currentPath === '/') loadLibrary();
        else loadFolder(currentPath);
    }, [currentPath]);

    const loadLibrary = async () => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            setIsLoading(true);
            try {
                const data = await window.electronAPI.invoke('fs:get-library');
                setLibraryData(data);
            } catch (e) { console.error("Failed to load library", e); }
            finally { setIsLoading(false); }
        }
    };

    const loadFolder = async (folderId) => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            setIsLoading(true);
            try {
                const items = await window.electronAPI.invoke('fs:get-folder', folderId);
                setCurrentItems(items);
            } catch (e) { console.error("Failed to load folder", e); }
            finally { setIsLoading(false); }
        }
    };

    const openFolder = (folderId) => setHistory(prev => [...prev, folderId]);

    const handleBack = () => {
        if (history.length > 1) setHistory(prev => prev.slice(0, -1));
    };

    const refresh = () => {
        if (currentPath === '/') loadLibrary();
        else loadFolder(currentPath);
    };

    // --- Actions ---

    const confirmCreateFolder = async (name) => {
        if (name && window.electronAPI) {
            const res = await window.electronAPI.invoke('fs:create-folder', { name, parent: currentPath === '/' ? null : currentPath });
            if (res.success) { setModal({ type: null, data: null }); refresh(); }
            else await showAlert(res.error, { icon: 'error' });
        }
    };

    const confirmDelete = async () => {
        const { id, parent } = modal.data;
        if (window.electronAPI) {
            const res = await window.electronAPI.invoke('fs:delete-item', { id, parent });
            if (res.success) { setModal({ type: null, data: null }); refresh(); }
            else await showAlert(res.error, { icon: 'error' });
        }
    };

    const confirmRename = async (newName) => {
        const { id, parent } = modal.data;
        if (window.electronAPI) {
            const res = await window.electronAPI.invoke('fs:rename-item', { id, newName, parent });
            if (res.success) { setModal({ type: null, data: null }); refresh(); }
            else await showAlert(res.error, { icon: 'error' });
        }
    };

    const confirmImport = async (importData) => {
        if (window.electronAPI) {
            let target = 'Exercises';
            if (importData.targetFolder) target = importData.targetFolder;
            else if (currentPath !== '/') target = currentPath;

            const res = await window.electronAPI.invoke('fs:import-exercise', {
                filePaths: { gp: importData.gpPath, audioBacking: importData.audioBackingPath, audioOriginal: importData.audioOriginalPath },
                folder: target,
                metadata: importData.metadata
            });

            if (res.success) { setModal({ type: null, data: null }); refresh(); }
            else await showAlert(res.error, { icon: 'error' });
        }
    }

    const confirmEdit = async (editData) => {
        const { id, parent, fsName } = modal.data;
        if (window.electronAPI) {
            const res = await window.electronAPI.invoke('fs:update-metadata', {
                id: fsName,
                metadata: editData.metadata,
                parent,
                targetFolder: editData.targetFolder,
                newFiles: { audioBacking: editData.audioBackingPath, audioOriginal: editData.audioOriginalPath }
            });

            if (res.success) { setModal({ type: null, data: null }); refresh(); }
            else await showAlert(res.error, { icon: 'error' });
        }
    };

    const handleFileClick = async (file) => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            try {
                const res = await window.electronAPI.invoke('reaper:load-exercise', file);
                if (!res.success) await showAlert('Failed to start session: ' + res.error, { icon: 'error' });
            } catch (e) {
                console.error("IPC Error:", e);
                await showAlert('Connection to backend failed', { icon: 'error' });
            }
        }
    };

    const handleExportPack = async (folderPathToExport) => {
        if (!window.electronAPI) return;

        // Ensure folderPathToExport is cleanly mapped to empty string for root
        const pathArg = folderPathToExport === '/' ? '' : folderPathToExport;

        const res = await window.electronAPI.invoke('library:export-pack', pathArg);
        if (res && res.success) await showAlert(`Успешно экспортировано:\n${res.path}`, { icon: 'success' });
        else if (res && res.error !== 'User canceled') await showAlert(`Ошибка экспорта: ${res.error}`, { icon: 'error' });
    };

    const handleImportPack = async () => {
        if (!window.electronAPI) return;

        const res = await window.electronAPI.invoke('library:import-pack');
        if (res && res.success) {
            await showAlert(`Успешно импортировано:\n${res.folder}`, { icon: 'success' });
            refresh();
        } else if (res && res.error !== 'User canceled') {
            await showAlert(`Ошибка импорта: ${res.error}`, { icon: 'error' });
        }
    };

    const isRoot = currentPath === '/';

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
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    {!isRoot && (
                        <button onClick={handleBack} className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all">
                            <ArrowLeft size={20} /> Back
                        </button>
                    )}
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full bg-transparent border-b border-white/20 rounded-none py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#E63946] transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button onClick={handleImportPack} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 flex items-center gap-2">
                        <Download size={16} className="rotate-180" /> Импорт Пака
                    </Button>
                    <Button onClick={() => handleExportPack(currentPath)} className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 flex items-center gap-2">
                        <Download size={16} /> {isRoot ? 'Полный Бэкап' : 'Экспорт'}
                    </Button>
                    <Button onClick={() => setModal({ type: 'import' })} className="bg-red-600 hover:bg-red-700 text-white border-none flex items-center gap-2">
                        <Plus size={16} /> {t('library.import_gp')}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-gray-500 text-center mt-20">Loading Library...</div>
            ) : (
                <div className="grid grid-cols-4 gap-6 animate-in fade-in duration-300">
                    {/* Folders (Root) */}
                    {isRoot && visibleLibraryData.map(folder => (
                        <FolderGridItem
                            key={folder.id}
                            folder={folder}
                            onClick={() => openFolder(folder.id)}
                            onDeleteClick={(f) => setModal({ type: 'delete', data: { id: f.name, parent: null, name: f.name } })}
                            onRenameClick={(f) => setModal({ type: 'rename', data: { id: f.name, parent: null, name: f.name } })}
                        />
                    ))}

                    {/* Items & Subfolders */}
                    {!isRoot && visibleCurrentItems.map(item => (
                        item.type === 'folder' ? (
                            <FolderGridItem
                                key={item.id}
                                folder={item}
                                onClick={() => openFolder(`${currentPath}/${item.name}`)}
                                onDeleteClick={(f) => setModal({ type: 'delete', data: { id: f.fsName || f.name, parent: currentPath, name: f.title || f.name } })}
                                onRenameClick={(f) => setModal({ type: 'rename', data: { id: f.fsName || f.name, parent: currentPath, name: f.title || f.name } })}
                            />
                        ) : (
                            <FileGridItem
                                key={item.id}
                                item={item}
                                onClick={() => handleFileClick(item)}
                                onDeleteClick={(i) => setModal({ type: 'delete', data: { id: i.fsName || i.name, parent: currentPath, name: i.title || i.name } })}
                                onEditClick={(i) => {
                                    if (i.type === 'smart_item') setModal({ type: 'edit', data: { fsName: i.fsName, parent: currentPath, item: i } });
                                    else setModal({ type: 'rename', data: { id: i.fsName || i.name, parent: currentPath, name: i.title || i.name } });
                                }}
                            />
                        )
                    ))}

                    {/* Create Folder Button (Always at the end) */}
                    <div
                        onClick={() => setModal({ type: 'create' })}
                        className={`bg-white/[0.01] rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/[0.03] transition-all group ${isRoot ? 'aspect-[4/3] flex-col' : 'min-w-[200px] h-[100px] flex-row gap-3'
                            }`}
                    >
                        <div className={`rounded-full bg-white/[0.05] flex items-center justify-center group-hover:bg-white/10 transition-colors ${isRoot ? 'w-14 h-14 mb-3' : 'w-10 h-10'
                            }`}>
                            <Plus size={isRoot ? 32 : 24} className="text-white opacity-50 group-hover:opacity-100" />
                        </div>
                        <span className="text-gray-400 text-sm font-medium">{t('library.create_folder').toUpperCase()}</span>
                    </div>
                </div>
            )}

            {/* Modals */}
            {modal.type === 'create' && <CreateFolderModal onClose={() => setModal({ type: null })} onConfirm={confirmCreateFolder} />}
            {modal.type === 'delete' && <DeleteModal data={modal.data} onClose={() => setModal({ type: null })} onConfirm={confirmDelete} />}
            {modal.type === 'rename' && <RenameModal data={modal.data} onClose={() => setModal({ type: null })} onConfirm={confirmRename} />}
            {modal.type === 'import' && <ImportModal defaultFolder={currentPath} onClose={() => setModal({ type: null })} onConfirm={confirmImport} />}
            {modal.type === 'edit' && <ImportModal isEdit={true} defaultFolder={currentPath} initialData={modal.data.item} onClose={() => setModal({ type: null })} onConfirm={confirmEdit} />}
        </div>
    );
}
