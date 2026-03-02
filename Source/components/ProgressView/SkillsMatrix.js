import React from 'react';
import { Activity, Hexagon } from 'lucide-react';
import SkillMatrixChart from '../SkillMatrixChart';

const SkillsMatrix = ({ skillMatrixData }) => {
    return (
        <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
            <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl flex flex-col xl:flex-row gap-8">
                {/* Radar Chart */}
                <div className="flex-1 min-h-[500px] flex flex-col">
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Hexagon size={24} className="text-[#2563eb]" /> Матрица навыков
                    </h3>
                    <div className="flex-1 bg-white/5 rounded-2xl p-4 flex items-center justify-center">
                        <SkillMatrixChart data={skillMatrixData} />
                    </div>
                </div>

                {/* Score List */}
                <div className="w-full xl:w-[400px] flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-[#2563eb]" /> Очки техник
                    </h3>
                    <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {skillMatrixData.map(skill => (
                            <div key={skill.subject} className="bg-white/[0.01] border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">{skill.subject}</span>
                                    <span className="text-blue-400 font-mono text-sm">{skill.A} / 100</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${skill.A}%` }} />
                                </div>
                            </div>
                        ))}
                        {skillMatrixData.length === 0 && (
                            <div className="text-center text-gray-500 text-sm mt-8">Техники пока не зафиксированы.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkillsMatrix;
