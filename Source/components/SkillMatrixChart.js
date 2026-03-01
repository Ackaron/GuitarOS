import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Layers } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1A1D2D] p-3 border border-white/10 rounded-xl shadow-xl z-50">
                <p className="text-white font-semibold flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {payload[0].payload.subject}
                </p>
                <p className="text-blue-400 font-mono text-sm ml-4">
                    Score: {payload[0].value} / 100
                </p>
            </div>
        );
    }
    return null;
};

export default function SkillMatrixChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500 text-sm">
                <Layers size={32} className="mb-3 opacity-20" />
                No skill data available yet.
            </div>
        );
    }

    // Sort data for the bar chart so the highest score is at the top
    const sortedData = [...data].sort((a, b) => a.A - b.A);

    return (
        <div className="w-full h-full min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={sortedData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="subject"
                        tick={{ fill: '#e5e7eb', fontSize: 13, fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                        width={120}
                    />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
                    <Bar
                        dataKey="A"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        animationDuration={1500}
                    >
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.A >= 80 ? '#3b82f6' : entry.A >= 50 ? '#8b5cf6' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
