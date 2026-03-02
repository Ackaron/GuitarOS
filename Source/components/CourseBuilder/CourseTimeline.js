import React from 'react';
import { Search, GripVertical, Trash2 } from 'lucide-react';

const CourseTimeline = ({ activeDay, onTitleChange, onRemoveItem, onUpdateDuration }) => {
    if (!activeDay) {
        return (
            <div className="flex flex-col h-full bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden p-8 text-center text-gray-600 justify-center">
                Выберите или создайте день.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Название Дня {activeDay.day}</label>
                <input
                    value={activeDay.title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Например: Переменный штрих, ч.1"
                    className="bg-black/50 border border-white/10 rounded py-2 px-3 text-white w-full outline-none focus:border-[#E63946] text-lg font-bold"
                />
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {activeDay.items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center opacity-50 p-8">
                        <Search size={32} className="mb-4" />
                        <p>День пока пуст.</p>
                        <p className="text-sm">Ищите упражнения справа и кликайте на них, чтобы добавить.</p>
                    </div>
                ) : (
                    activeDay.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-black/40 border border-white/5 p-3 rounded-lg group">
                            <div className="text-gray-600 cursor-grab"><GripVertical size={16} /></div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-sm truncate">{item.title || item.name}</div>
                                <div className="text-xs text-gray-500">{item.category}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={Math.round(item.duration / 60)}
                                    onChange={(e) => onUpdateDuration(idx, e.target.value)}
                                    className="w-16 bg-white/5 border border-white/10 rounded-md py-1 px-2 text-center text-sm font-mono text-white outline-none focus:border-[#E63946]"
                                />
                                <span className="text-xs text-gray-500">мин</span>
                                <button onClick={() => onRemoveItem(idx)} className="text-gray-600 hover:text-red-400 ml-2">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CourseTimeline;
