import React from 'react';
import { Folder, X, Pencil } from 'lucide-react';

export const FolderGridItem = ({ folder, onClick, onDeleteClick, onRenameClick }) => {
    return (
        <div
            onClick={onClick}
            className="relative aspect-[4/3] bg-white/[0.02] rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.04] transition-all group"
        >
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(folder);
                }}
                className="absolute top-2 right-2 p-2 hover:bg-red-500/20 rounded-full text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-20"
                title="Delete Folder"
            >
                <X size={16} />
            </div>

            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onRenameClick(folder);
                }}
                className="absolute top-2 right-9 p-2 hover:bg-white/10 rounded-full text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-20"
                title="Rename Folder"
            >
                <Pencil size={16} />
            </div>

            <Folder size={64} className="text-gray-200 fill-gray-200/10 mb-3 group-hover:text-white transition-colors" />
            <span className="text-gray-300 font-medium tracking-wider group-hover:text-white text-sm">
                {folder.title || folder.name}
            </span>
            {folder.itemCount !== undefined && (
                <span className="text-xs text-gray-600 mt-1">{folder.itemCount} items</span>
            )}
        </div>
    );
};

export const FileGridItem = ({ item, onClick, onDeleteClick, onEditClick }) => {
    return (
        <div
            onClick={onClick}
            className="relative min-w-[200px] h-[100px] rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] p-4 flex flex-col justify-between cursor-pointer transition-all group overflow-hidden"
            title={item.fsName}
        >
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(item);
                }}
                className="absolute top-2 right-2 p-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                title="Delete Item"
            >
                <X size={16} />
            </div>

            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onEditClick(item);
                }}
                className="absolute top-2 right-8 p-1 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                title={item.type === 'smart_item' ? "Edit Metadata" : "Rename"}
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
    );
};
