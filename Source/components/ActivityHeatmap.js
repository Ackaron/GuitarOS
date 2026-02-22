import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

const ActivityHeatmap = ({ data }) => {
    // Data: { index: 1, mastery: 85, title: '...', bpm: 120, time: 300, quality: '5★' }

    if (!data || data.length === 0) {
        return <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
            <span>No mastery data yet.</span>
            <span className="text-xs opacity-50">Sessions will appear here.</span>
        </div>;
    }

    // Custom Tooltip
    // "Session #X | Mastery: Y% | Time: Z min | [Quality Badge]"
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-[#0F111A]/95 border border-[#2563eb]/30 p-4 rounded-xl shadow-2xl backdrop-blur-md min-w-[180px]">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-xs font-mono uppercase">Session #{d.index}</span>
                        <span className="text-gray-500 text-[10px]">{d.date}</span>
                    </div>

                    <div className="text-white font-bold mb-1 truncate max-w-[200px]">{d.title}</div>

                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-bold text-cyan-400">{d.mastery}%</span>
                        <span className="text-xs text-gray-400">Mastery</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/10 pt-2">
                        <div>
                            <span className="text-gray-500 block">Time</span>
                            <span className="text-white font-mono">{(d.time / 60).toFixed(1)}m</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block">Tempo</span>
                            <span className="text-white font-mono">
                                {d.isBpmPercentage ? `${d.bpm}%` : `${d.bpm} BPM`}
                            </span>
                        </div>
                        {d.quality && d.quality !== '-' && (
                            <div className="col-span-2 mt-1">
                                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-[10px] font-bold">
                                    {d.quality} Quality
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-64 relative group">
            {/* Graph Title */}
            <div className="absolute top-2 left-4 z-10 flex items-center gap-2 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Mastery Index</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
                >
                    <defs>
                        <linearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#2563eb" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                        <filter id="neon-glow" height="200%" width="200%" x="-50%" y="-50%">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} opacity={0.3} />

                    {/* X-Axis: Session Number */}
                    <XAxis
                        dataKey="index"
                        stroke="#555"
                        tick={{ fill: '#666', fontSize: 10 }}
                        domain={['dataMin', 'dataMax']}
                        type="number"
                        tickCount={10}
                    />

                    {/* Y-Axis: 0-100% Fixed */}
                    <YAxis
                        stroke="#555"
                        tick={{ fill: '#666', fontSize: 10 }}
                        unit="%"
                        domain={[0, 100]}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'white', strokeWidth: 1, opacity: 0.2 }} />

                    {/* Reference Line for "Perfect" 100% */}
                    <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" opacity={0.3} />

                    <Line
                        type="monotone"
                        dataKey="mastery"
                        stroke="url(#lineColor)"
                        strokeWidth={3}
                        dot={{ r: 3, fill: '#0F111A', stroke: '#06b6d4', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#fff', stroke: '#06b6d4' }}
                        filter="url(#neon-glow)"
                        isAnimationActive={true}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ActivityHeatmap;
