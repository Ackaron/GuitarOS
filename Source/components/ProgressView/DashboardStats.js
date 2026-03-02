import React from 'react';
import { Activity, Target, Flame, Calendar, Hexagon } from 'lucide-react';
import ActivityHeatmap from '../ActivityHeatmap';
import { Button } from '../UI';

const KPICard = ({ icon: Icon, label, value, sub, color, bg }) => (
    <div className="bg-white/[0.02] p-6 rounded-2xl relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-4 rounded-bl-2xl ${bg} ${color}`}>
            <Icon size={24} />
        </div>
        <div className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">{label}</div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-xs text-gray-500">{sub}</div>
    </div>
);

const DashboardStats = ({ globalStats, heatmapData, categories, onCategoryClick, onSkillsClick }) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard icon={Activity} label="Всего часов" value={globalStats?.totalHours || 0} sub="За все время" color="text-[#2563eb]" bg="bg-[#2563eb]/10" />
                <KPICard icon={Target} label="Ср. Оценка" value={`${globalStats?.averageScore || 0}%`} sub="За сессию" color="text-yellow-500" bg="bg-yellow-500/10" />
                <KPICard icon={Flame} label="Серия" value={`${globalStats?.daysActive || 0} Дней`} sub="Регулярность" color="text-orange-500" bg="bg-orange-500/10" />
                <KPICard icon={Calendar} label="Сессии" value={globalStats?.totalCheckins || 0} sub="Завершено" color="text-blue-500" bg="bg-blue-500/10" />
            </div>

            {/* Global Quality Graph */}
            <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-[#2563eb]" /> Тренд качества
                    </h3>
                    <Button
                        onClick={onSkillsClick}
                        variant="ghost"
                        className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 border border-blue-500/20 text-sm px-4 rounded-full flex items-center gap-2"
                    >
                        <Hexagon size={16} /> Матрица навыков
                    </Button>
                </div>
                <ActivityHeatmap data={heatmapData} />
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(cat => (
                    <div
                        key={cat.name}
                        onClick={() => onCategoryClick(cat.name)}
                        className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-lg bg-white/5 group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
                                    <div className="w-6 h-6 flex items-center justify-center font-bold">{cat.name.charAt(0)}</div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white">{cat.name}</h4>
                                    <div className="text-sm text-gray-500">{cat.sessions} сессий</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white">{cat.hours}h</div>
                                <div className="text-xs text-green-500 font-mono">+{cat.growth} BPM</div>
                            </div>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500/50 group-hover:bg-red-500 transition-all" style={{ width: `${Math.min(100, cat.sessions * 2)}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardStats;
