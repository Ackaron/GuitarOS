import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const CourseDaysSidebar = ({
    packName, setPackName,
    author, setAuthor,
    days, activeDayIndex,
    onAddDay, onRemoveDay, setActiveDayIndex
}) => {
    return (
        <div className="flex flex-col h-full gap-6 overflow-y-auto">
            <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-xl shrink-0">
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Название курса</label>
                <input
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded py-2 px-3 text-white w-full outline-none focus:border-[#E63946]"
                />

                <label className="text-xs font-bold text-gray-500 uppercase mt-4 mb-2 block">Автор</label>
                <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded py-2 px-3 text-white w-full outline-none focus:border-[#E63946]"
                />
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                    <span className="font-bold text-gray-300">Дни Курса</span>
                    <button onClick={onAddDay} className="text-gray-400 hover:text-white p-1 bg-white/5 rounded">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {days.map((d, i) => (
                        <div
                            key={i}
                            onClick={() => setActiveDayIndex(i)}
                            className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border ${activeDayIndex === i ? 'bg-[#E63946]/10 border-[#E63946]/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                        >
                            <div className="flex flex-col">
                                <span className={`font-bold ${activeDayIndex === i ? 'text-[#E63946]' : 'text-gray-300'}`}>День {d.day}</span>
                                <span className="text-xs text-gray-500 truncate max-w-[120px]">{d.title}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">{d.items.length} упр</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemoveDay(i); }}
                                    className="text-gray-600 hover:text-red-400"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CourseDaysSidebar;
