import React from 'react';
import { Card } from './UI';
import { Activity, Calendar, Trophy, TrendingUp } from 'lucide-react';

export default function Progress() {
    return (
        <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Progress</h1>
                    <p className="text-gray-500">Track your journey to mastery</p>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="flex items-center gap-4 p-6">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Activity size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">12.5 hrs</div>
                        <div className="text-sm text-gray-500">Practice this week</div>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 p-6">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">14 days</div>
                        <div className="text-sm text-gray-500">Current Streak</div>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 p-6">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">Level 5</div>
                        <div className="text-sm text-gray-500">Intermediate</div>
                    </div>
                </Card>
            </div>

            {/* Charts / Detailed Stats Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Practice History">
                    <div className="h-64 flex items-center justify-center border border-white/5 rounded bg-black/20">
                        <TrendingUp className="text-gray-600 mb-2" size={48} />
                        <span className="text-gray-500">Chart Placeholder</span>
                    </div>
                </Card>

                <Card title="Skill Breakdown">
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">Alternate Picking</span>
                                <span className="text-white">75%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 w-3/4"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">Legato</span>
                                <span className="text-white">40%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-2/5"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">Sweep Picking</span>
                                <span className="text-white">15%</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 w-[15%]"></div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
