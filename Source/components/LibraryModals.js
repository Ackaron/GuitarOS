import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, FileCode, Music, Disc } from 'lucide-react';
import { Button } from './UI';

// Generic Modal Component
export const Modal = ({ isOpen, onClose, title, children, footer }) => {
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

export const CreateFolderModal = ({ onClose, onConfirm }) => {
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

export const RenameModal = ({ data, onClose, onConfirm }) => {
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

export const DeleteModal = ({ data, onClose, onConfirm }) => {
    return (
        <Modal
            isOpen={true}
            title="Delete Item"
            onClose={onClose}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>Delete</Button>
                </>
            }
        >
            <div className="flex items-center gap-4 text-gray-300">
                <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <p>Are you sure you want to delete <b>{data?.name}</b>?</p>
                    <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
                </div>
            </div>
        </Modal>
    );
};

export const ImportModal = ({ onClose, onConfirm, isEdit = false, initialData = null, defaultFolder = '' }) => {
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
                    >
                        {availableFolders.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>

                {/* File Uploads */}
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
