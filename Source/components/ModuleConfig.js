import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Settings, X, Music, BookOpen, Dumbbell, Zap, FileAudio, Target, Activity, Shield, Repeat } from 'lucide-react';
import { Button } from './UI';
import SearchableSelect from './SearchableSelect';
import { useLanguage } from '../context/LanguageContext';

export default function ModuleConfig({
    modules,
    setModules,
    catalog,
    onGenerate,
    dayFocus,
    setDayFocus,
    smartReview,
    setSmartReview
}) {
    const { t, language } = useLanguage();

    // Get unique folders
    const folders = [...new Set(catalog.items.map(i => i.category).filter(Boolean))].sort();

    const totalPercentage = modules.reduce((sum, m) => sum + Number(m.percentage), 0);
    const isValid = totalPercentage === 100;

    const [editingId, setEditingId] = useState(null);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [dragEnabledId, setDragEnabledId] = useState(null);

    const handleDragStart = (e, index) => {
        setDraggedIdx(index);
        // This is needed for Firefox
        if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', index);
            e.dataTransfer.effectAllowed = "move";
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === targetIndex) {
            setDraggedIdx(null);
            return;
        }

        const newModules = [...modules];
        const [removed] = newModules.splice(draggedIdx, 1);
        newModules.splice(targetIndex, 0, removed);

        setModules(newModules);
        setDraggedIdx(null);
    };

    const handleAddIntent = (intentType) => {
        setIsAddMenuOpen(false);

        const baseModule = {
            id: Date.now(),
            percentage: 10,
            target: '',
            customNames: {}
        };

        switch (intentType) {
            case 'theory':
                setModules([...modules, { ...baseModule, type: 'theory', customNames: { ru: 'Тональность', en: 'Theory' } }]);
                break;
            case 'technique':
                setModules([...modules, { ...baseModule, type: 'technique', customNames: { ru: 'Техника', en: 'Technique' } }]);
                break;
            case 'exercise':
                setModules([...modules, { ...baseModule, type: 'exercise', customNames: { ru: 'Этюд', en: 'Etude' } }]);
                break;
            case 'folder':
                setModules([...modules, { ...baseModule, type: 'folder', customNames: { ru: 'Раздел / Курс', en: 'Folder' } }]);
                break;
            case 'repertoire':
                setModules([...modules, { ...baseModule, type: 'repertoire', customNames: { ru: 'Конкретный трек', en: 'Specific Track' } }]);
                break;
            default:
                break;
        }
    };

    const handleRemoveModule = (id) => {
        setModules(modules.filter(m => m.id !== id));
    };

    const updateModule = (id, field, value) => {
        if (typeof field === 'object') {
            const updates = field;
            setModules(modules.map(m => m.id === id ? { ...m, ...updates } : m));
        } else {
            setModules(modules.map(m => m.id === id ? { ...m, [field]: value } : m));
        }
    };

    const renderModuleCard = (module, index) => {
        let icon = <Zap size={20} className="text-yellow-400" />;
        let defaultLabel = "Exercise";

        if (module.type === 'theory') { icon = <BookOpen size={20} className="text-blue-400" />; defaultLabel = 'Тональность'; }
        if (module.type === 'technique') { icon = <Dumbbell size={20} className="text-red-400" />; defaultLabel = 'Техника'; }
        if (module.type === 'exercise') { icon = <Zap size={20} className="text-green-400" />; defaultLabel = 'Этюд'; }
        if (module.type === 'folder') { icon = <BookOpen size={20} className="text-yellow-400" />; defaultLabel = 'Раздел / Курс'; }
        if (module.type === 'repertoire') { icon = <Music size={20} className="text-purple-400" />; defaultLabel = 'Конкретный трек'; }

        let label = defaultLabel;

        if (module.customNames && module.customNames[language]) {
            label = module.customNames[language];
        } else if (module.customName) {
            label = module.customName;
        }

        const isWeekly = ['theory', 'technique'].includes(module.type);
        const isDragging = draggedIdx === index;

        return (
            <div
                key={module.id}
                draggable={dragEnabledId === module.id}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                style={{ zIndex: 100 - index }}
                className={`p-6 rounded-2xl relative group transition-all h-full flex flex-col justify-between border-transparent 
                ${isDragging ? 'opacity-40 bg-white/5 scale-95' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}
            >
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4 text-white font-medium tracking-wide text-sm w-full">
                        <div
                            className="cursor-grab hover:text-white text-gray-600 active:cursor-grabbing mr-1 flex items-center justify-center p-1"
                            onMouseEnter={() => setDragEnabledId(module.id)}
                            onMouseLeave={() => setDragEnabledId(null)}
                        >
                            <GripVertical size={16} />
                        </div>
                        {icon}

                        {editingId === module.id ? (
                            <input
                                type="text"
                                autoFocus
                                defaultValue={label}
                                onBlur={(e) => {
                                    const val = e.target.value;
                                    // Update logic: preserve existing customNames, update current lang
                                    const currentCustomNames = module.customNames || {};
                                    // If legacy customName exists and we are creating a new structure, maybe migrate it? 
                                    // For now just set the new key.
                                    const newCustomNames = { ...currentCustomNames, [language]: val };

                                    updateModule(module.id, 'customNames', newCustomNames);
                                    setEditingId(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.currentTarget.value;
                                        const currentCustomNames = module.customNames || {};
                                        const newCustomNames = { ...currentCustomNames, [language]: val };

                                        updateModule(module.id, 'customNames', newCustomNames);
                                        setEditingId(null);
                                    }
                                }}
                                className="bg-transparent text-white px-0 py-1 border-b border-white/20 outline-none w-48 text-lg font-normal"
                            />
                        ) : (
                            <span
                                onClick={() => setEditingId(module.id)}
                                className="cursor-pointer text-lg font-normal hover:text-white text-gray-200 transition-colors"
                                title="Click to rename"
                            >
                                {label}
                            </span>
                        )}

                        {isWeekly ? (
                            <span className="ml-2 text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{t('module.weekly')}</span>
                        ) : (
                            <span className="ml-2 text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{t('module.goal')}</span>
                        )}
                    </div>
                    <button onClick={() => handleRemoveModule(module.id)} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Target Selector */}
                    <div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mb-2">
                            {module.type === 'theory' ? 'Тональность' :
                                module.type === 'technique' ? 'Какие теги улучшаем?' :
                                    module.type === 'folder' ? 'Раздел' :
                                        module.type === 'exercise' ? 'Какой этюд?' : 'Что играем?'}
                        </div>

                        {module.type === 'theory' && (
                            <SearchableSelect
                                options={catalog.keys || []}
                                value={module.target}
                                onChange={(val) => updateModule(module.id, 'target', val)}
                                placeholder={t('module.e_g_c_major')}
                                freeSolo={true}
                            />
                        )}

                        {module.type === 'technique' && (
                            <SearchableSelect
                                options={catalog.tags || []}
                                value={module.target}
                                onChange={(val) => updateModule(module.id, 'target', val)}
                                placeholder={t('module.e.g_sweep')}
                                multi={true}
                                freeSolo={true}
                            />
                        )}

                        {module.type === 'folder' && (
                            <SearchableSelect
                                options={folders.map(f => ({ label: f, value: f }))}
                                value={module.target}
                                onChange={(val) => updateModule(module.id, 'target', val)}
                                placeholder="Например: Alternate Picking"
                            />
                        )}

                        {module.type === 'exercise' && (
                            <SearchableSelect
                                options={catalog.items
                                    .filter(i => i.category === 'Etude' || i.path.includes('Etude'))
                                    .map(i => ({
                                        label: i.title,
                                        value: i.id
                                    }))
                                }
                                value={module.target}
                                onChange={(val) => {
                                    updateModule(module.id, { target: val, strategy: 'item' });
                                }}
                                placeholder="Поиск по названию..."
                            />
                        )}

                        {module.type === 'repertoire' && (
                            <SearchableSelect
                                options={catalog.items
                                    .filter(i => i.parent === 'songs' || (i.category === 'Songs' && i.type === 'smart_item'))
                                    .map(i => ({ label: i.title, value: i.id }))
                                }
                                value={module.target}
                                onChange={(val) => updateModule(module.id, 'target', val)}
                                placeholder="Поиск по названию..."
                            />
                        )}
                    </div>

                    {/* Percentage */}
                    <div className="pt-4 border-t border-white/[0.05]">
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{t('module.allocated_time')}</div>
                            <div className="text-sm font-light text-white">{module.percentage}%</div>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="100"
                            step="5"
                            value={module.percentage}
                            onChange={(e) => updateModule(module.id, 'percentage', Number(e.target.value))}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="w-full h-[1px] bg-white/10 appearance-none cursor-pointer accent-[#E63946] hover:bg-white/30 transition-all z-10 relative"
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8 pb-32">

                <section className="mb-8 relative z-20">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest">Сессия</h3>
                        <div className="h-[1px] flex-1 bg-white/[0.05]"></div>

                        {/* Smart Review Toggle Moved to Top */}
                        <button
                            onClick={() => setSmartReview(!smartReview)}
                            title="Automatically insert recent low-scoring exercises at the start of your session"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all 
                                ${smartReview
                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-lg shadow-purple-500/20'
                                    : 'bg-white/[0.02] border-white/5 text-gray-600 hover:text-gray-400'}`}
                        >
                            <Repeat size={14} /> Smart Review
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        {modules.map((m, i) => renderModuleCard(m, i))}
                    </div>
                </section>

            </div>

            {/* Footer Controls */}
            <div className="absolute bottom-0 left-0 w-full p-8 bg-[#0F111A]/90 backdrop-blur-lg border-t border-white/[0.02] flex items-center justify-between z-[999]">

                <div className="flex items-center gap-8 relative">
                    <div className="relative">
                        <Button
                            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                            variant="outline"
                            className={`flex items-center gap-2 transition-all ${isAddMenuOpen ? 'border-[#E63946] text-[#E63946]' : ''}`}
                        >
                            <Plus size={16} className={`transition-transform duration-300 ${isAddMenuOpen ? 'rotate-45' : ''}`} /> {t('dashboard.add_custom_goal')}
                        </Button>

                        {isAddMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-3 w-64 bg-[#1A1D27] border border-white/5 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                                <button
                                    onClick={() => handleAddIntent('repertoire')}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Music size={16} className="text-purple-400" /> Выучить конкретный трек
                                </button>
                                <button
                                    onClick={() => handleAddIntent('technique')}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Dumbbell size={16} className="text-red-400" /> Подтянуть технику
                                </button>
                                <button
                                    onClick={() => handleAddIntent('exercise')}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Zap size={16} className="text-green-400" /> Выучить конкретный этюд
                                </button>
                                <button
                                    onClick={() => handleAddIntent('folder')}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <BookOpen size={16} className="text-yellow-400" /> Пройти раздел/курс целиком
                                </button>
                                <button
                                    onClick={() => handleAddIntent('theory')}
                                    className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Zap size={16} className="text-blue-400" /> Изучить тональность
                                </button>
                            </div>
                        )}

                        {/* Back-click closer */}
                        {isAddMenuOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setIsAddMenuOpen(false)}></div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`text-xs uppercase tracking-widest ${isValid ? 'text-gray-400' : 'text-red-500'}`}>{t('dashboard.total')}: {totalPercentage}%</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        {/* Day Focus Selector */}
                        <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
                            <button
                                onClick={() => setDayFocus('speed')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${dayFocus === 'speed' ? 'bg-[#E63946] text-white shadow-lg shadow-red-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                <Activity size={14} /> Скорость
                            </button>
                            <button
                                onClick={() => setDayFocus('clarity')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${dayFocus === 'clarity' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                <Target size={14} /> Чистота
                            </button>
                            <button
                                onClick={() => setDayFocus('stability')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${dayFocus === 'stability' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                            >
                                <Shield size={14} /> Стабильность
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={isValid ? onGenerate : null}
                        disabled={!isValid}
                        className={`px-8 py-3 rounded-full font-medium text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-300 ${isValid ? 'bg-[#E63946] text-white shadow-lg shadow-red-500/20 hover:brightness-110 cursor-pointer' : 'bg-transparent border border-white/10 text-gray-600 cursor-not-allowed'}`}
                    >
                        {t('dashboard.save_generate')}
                    </button>
                </div>
            </div>
        </div>
    );
}
