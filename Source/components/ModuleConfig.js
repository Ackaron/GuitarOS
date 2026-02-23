import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Settings, X, Music, BookOpen, Dumbbell, Zap, FileAudio } from 'lucide-react';
import { Button } from './UI';
import SearchableSelect from './SearchableSelect';
import { useLanguage } from '../context/LanguageContext';

export default function ModuleConfig({ modules, setModules, catalog, onGenerate }) {
    const { t, language } = useLanguage();

    // Split modules into categories
    const routineModules = modules.filter(m => ['theory', 'technique'].includes(m.type));
    const goalModules = modules.filter(m => ['exercise', 'repertoire'].includes(m.type));

    // Get unique folders
    const folders = [...new Set(catalog.items.map(i => i.category).filter(Boolean))].sort();

    const totalPercentage = modules.reduce((sum, m) => sum + Number(m.percentage), 0);
    const isValid = totalPercentage === 100;

    const [editingId, setEditingId] = useState(null);

    const handleAddModule = () => {
        setModules([...modules, { id: Date.now(), type: 'exercise', strategy: 'item', target: '', percentage: 10 }]);
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

    const renderModuleCard = (module) => {
        let icon = <Zap size={20} />;
        let colorClass = "border-l-4 border-l-yellow-500";
        let defaultLabel = "Exercise";

        if (module.type === 'theory') { icon = <BookOpen size={20} />; colorClass = "border-l-4 border-l-blue-500"; defaultLabel = t('module.theory'); }
        if (module.type === 'technique') { icon = <Dumbbell size={20} />; colorClass = "border-l-4 border-l-red-500"; defaultLabel = t('module.technique'); }
        if (module.type === 'repertoire') { icon = <Music size={20} />; colorClass = "border-l-4 border-l-purple-500"; defaultLabel = t('module.repertoire'); }
        if (module.type === 'exercise') { icon = <Zap size={20} />; colorClass = "border-l-4 border-l-green-500"; defaultLabel = t('module.exercises'); }

        // Logic for localized custom names:
        // 1. Try specific language override (module.customNames[lang])
        // 2. Try fallback generic customName (legacy)
        // 3. Use default localized standard label
        let label = defaultLabel;

        if (module.customNames && module.customNames[language]) {
            label = module.customNames[language];
        } else if (module.customName) {
            label = module.customName;
        }

        const isWeekly = ['theory', 'technique'].includes(module.type);

        return (
            <div key={module.id} className={`bg-[#1A1D2D] rounded-lg p-5 border border-white/5 relative group hover:border-white/10 transition-all shadow-lg ${colorClass}`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm w-full">
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
                                className="bg-white/10 text-white px-2 py-1 rounded outline-none border border-white/20 w-32"
                            />
                        ) : (
                            <span
                                onClick={() => setEditingId(module.id)}
                                className="cursor-pointer hover:text-cyan-400 hover:underline decoration-dashed underline-offset-4"
                                title="Click to rename"
                            >
                                {label}
                            </span>
                        )}

                        {isWeekly ? (
                            <span className="ml-2 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded whitespace-nowrap">{t('module.weekly')}</span>
                        ) : (
                            <span className="ml-2 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded whitespace-nowrap">{t('module.goal')}</span>
                        )}
                    </div>
                    <button onClick={() => handleRemoveModule(module.id)} className="text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Target Selector */}
                    <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                            {module.type === 'theory' ? t('module.key_center') :
                                module.type === 'technique' ? t('module.focus_tag') : t('module.select_file')}
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

                        {/* STANDARD EXERCISE (ETUDE) - Restricted to Etude folder per user request */}
                        {module.type === 'exercise' && (module.id === 'exercise' || module.id === 'exercises') && (
                            <SearchableSelect
                                options={catalog.items
                                    // Strictly filter by "Etude" category to avoid showing other folders
                                    .filter(i => i.category === 'Etude')
                                    .map(i => ({
                                        label: i.title,
                                        value: i.id
                                    }))
                                }
                                value={module.target}
                                onChange={(val) => {
                                    updateModule(module.id, { target: val, strategy: 'item' });
                                }}
                                placeholder="Pick an exercise..."
                            />
                        )}

                        {/* CUSTOM GOAL - Full Power */}
                        {module.type === 'exercise' && module.id !== 'exercise' && module.id !== 'exercises' && (
                            <div className="space-y-2">
                                {/* Strategy Selector */}
                                <div className="flex bg-[#0F111A] rounded p-1 gap-1">
                                    {['item', 'folder', 'tag', 'key'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => updateModule(module.id, 'strategy', s)}
                                            className={`flex-1 text-[10px] uppercase font-bold py-1 rounded transition-colors ${(module.strategy || 'item') === s
                                                ? 'bg-green-500 text-black'
                                                : 'text-gray-500 hover:text-white'
                                                }`}
                                        >
                                            {s === 'item' ? 'Specific' : s}
                                        </button>
                                    ))}
                                </div>

                                {/* Target Selector based on Strategy */}
                                {(!module.strategy || module.strategy === 'item') && (
                                    <SearchableSelect
                                        options={catalog.items
                                            // Allow ALL playable items (Theory, Songs, Exercises)
                                            .map(i => ({
                                                label: i.category && i.category !== 'Exercises' ? `${i.category}: ${i.title}` : i.title,
                                                value: i.id
                                            }))
                                        }
                                        value={module.target}
                                        onChange={(val) => updateModule(module.id, 'target', val)}
                                        placeholder="Pick any track..."
                                    />
                                )}

                                {module.strategy === 'folder' && (
                                    <select
                                        value={module.target}
                                        onChange={(e) => updateModule(module.id, 'target', e.target.value)}
                                        className="w-full bg-[#0F111A] text-white border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-green-500"
                                    >
                                        <option value="">Select Folder...</option>
                                        {folders.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                )}

                                {module.strategy === 'tag' && (
                                    <SearchableSelect
                                        options={catalog.tags || []}
                                        value={module.target}
                                        onChange={(val) => updateModule(module.id, 'target', val)}
                                        placeholder={t('module.e.g_sweep')}
                                        multi={true}
                                        freeSolo={true}
                                    />
                                )}

                                {module.strategy === 'key' && (
                                    <SearchableSelect
                                        options={catalog.keys || []}
                                        value={module.target}
                                        onChange={(val) => updateModule(module.id, 'target', val)}
                                        placeholder={t('module.e_g_c_major')}
                                        freeSolo={true}
                                    />
                                )}
                            </div>
                        )}

                        {module.type === 'repertoire' && (
                            <SearchableSelect
                                options={catalog.items
                                    .filter(i => i.parent === 'songs' || (i.category === 'Songs' && i.type === 'smart_item'))
                                    .map(i => ({ label: i.title, value: i.id }))
                                }
                                value={module.target}
                                onChange={(val) => updateModule(module.id, 'target', val)}
                                placeholder={t('module.pick_song')}
                            />
                        )}
                    </div>

                    {/* Percentage */}
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-[10px] text-gray-500 font-bold uppercase">{t('module.allocated_time')}</div>
                            <div className="text-sm font-mono text-white font-bold">{module.percentage}%</div>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="100"
                            step="5"
                            value={module.percentage}
                            onChange={(e) => updateModule(module.id, 'percentage', Number(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-gray-500 hover:accent-white transition-all"
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8 pb-32">

                {/* Section 1: Routine Constructor */}
                <section>
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">{t('module.routine_constructor')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {routineModules.map(m => renderModuleCard(m))}
                    </div>
                </section>

                {/* Section 2: Goals */}
                <section>
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">{t('module.monthly_goals')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {goalModules.map(m => renderModuleCard(m))}
                    </div>
                </section>

            </div>

            {/* Footer Controls */}
            <div className="absolute bottom-0 left-0 w-full pt-6 bg-gradient-to-t from-[#0F111A] via-[#0F111A] to-transparent flex items-center justify-between">

                <div className="flex items-center gap-4">
                    <Button onClick={handleAddModule} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-orange-500/20 flex items-center gap-2">
                        <Plus size={18} /> {t('dashboard.add_custom_goal')}
                    </Button>

                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`font-mono font-bold ${isValid ? 'text-green-500' : 'text-red-500'}`}>{t('dashboard.total')}: {totalPercentage}%</span>
                    </div>
                </div>

                <Button
                    onClick={isValid ? onGenerate : null}
                    className={`py-3 px-8 text-lg font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all ${isValid ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                    {t('dashboard.save_generate')}
                </Button>
            </div>
        </div>
    );
}
