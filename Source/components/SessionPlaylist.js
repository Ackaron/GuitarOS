import { Activity, Download } from 'lucide-react';
import { Button } from './UI';
import { useDialog } from '../context/DialogContext';

const SessionPlaylist = ({
    routine,
    currentStepIndex,
    totalMinutes,
    onUpdateTotalTime,
    onLoadStep,
    onFinishWithFeedback,
    isGuidedMode
}) => {
    const { showAlert } = useDialog();

    return (
        <div className="bg-transparent rounded-none border-l border-white/[0.05] p-8 flex flex-col h-full">
            <div className="mb-6 flex flex-col gap-4">
                <h3 className="text-2xl font-bold text-white flex justify-between items-center px-2">
                    {isGuidedMode ? 'Готовый Курс' : 'Session Map'}
                    <div className="flex gap-2 items-center">
                        {!isGuidedMode && (
                            <Button
                                variant="outline"
                                className="bg-white/5 border-white/10 hover:bg-white/10 text-xs px-3 py-1 flex gap-2 h-auto"
                                onClick={async () => {
                                    if (window.electronAPI) {
                                        const res = await window.electronAPI.invoke('library:export-routine', routine);
                                        if (res && res.success) await showAlert(`Пользовательский курс успешно спакован:\n${res.path}`, { icon: 'success' });
                                        else if (res && res.error !== 'User canceled') await showAlert(`Ошибка экспорта: ${res.error}`, { icon: 'error' });
                                    }
                                }}
                                title="Экспортировать этот плейлист в виде готового курса .gpack"
                            >
                                <Download size={14} /> В Курс
                            </Button>
                        )}
                        <span className="text-sm font-sans font-normal text-gray-500 bg-white/5 px-3 py-1 rounded-full">{routine.length} Steps</span>
                    </div>
                </h3>

                {/* Total Time Input */}
                <div className="flex items-center gap-4 bg-white/[0.02] p-3 rounded-xl border-none">
                    <div className="text-sm text-gray-400 font-bold uppercase tracking-wider">Total Time</div>
                    <div className="flex-1 flex items-center justify-end gap-2">
                        {isGuidedMode ? (
                            <div className="text-white font-mono font-bold text-lg">{totalMinutes}</div>
                        ) : (
                            <input
                                type="number"
                                min="1"
                                value={totalMinutes}
                                onChange={(e) => onUpdateTotalTime(e.target.value)}
                                className="bg-transparent text-white font-mono font-bold text-lg w-full outline-none text-right"
                            />
                        )}
                        <span className="text-brand-gray text-sm font-bold">min</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar mask-linear-fade">
                {routine.map((item, idx) => {
                    const isActive = idx === currentStepIndex;
                    const isPast = idx < currentStepIndex;
                    return (
                        <div
                            key={idx + item.id}
                            onClick={() => onLoadStep(idx)}
                            className={`relative p-4 rounded-xl transition-all cursor-pointer flex items-center justify-between group overflow-hidden ${isActive
                                ? 'bg-white/[0.04]'
                                : isPast ? 'bg-transparent opacity-40 grayscale' : 'bg-transparent hover:bg-white/[0.02]'
                                } `}
                        >
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E63946] rounded-l-xl"></div>}
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isActive ? 'bg-red-500/20 text-red-500' : 'bg-white/[0.02] text-gray-600'} `}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className={`font-bold text-lg ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'} `}>{item.title}</div>
                                        {item.isReview && (
                                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[9px] font-bold uppercase tracking-wider">
                                                Review
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-600 font-mono uppercase tracking-wider">
                                        {item.slotType} • {Math.floor(item.duration / 60)}m
                                    </div>
                                </div>
                            </div>
                            {isActive && <Activity size={20} className="text-red-500 animate-pulse" />}
                        </div>
                    )
                })}
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.02]">
                <Button onClick={onFinishWithFeedback} variant="outline" className="w-full border-red-900/30 text-red-800 hover:bg-red-900/20 hover:text-red-500 hover:border-red-500/50 py-4">
                    End Session
                </Button>
            </div>
        </div>
    );
};

export default SessionPlaylist;
