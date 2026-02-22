import React, { useState } from 'react';
import { Play, Square, Mic, Pause, Volume2, VolumeX, Timer } from 'lucide-react';
import { Button } from './UI';

const ReaperControls = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [tracks, setTracks] = useState([
        { id: 1, name: 'Guitar', volume: 100, muted: false, color: 'text-red-500' },
        { id: 2, name: 'Backing', volume: 100, muted: false, color: 'text-blue-500' },
        { id: 3, name: 'Original', volume: 100, muted: false, color: 'text-purple-500' } // Default unmuted per user request
    ]);

    const [isMetronomeOn, setIsMetronomeOn] = useState(false);

    const handleTransport = async (action) => {
        if (window.electronAPI) {
            if (action === 'metronome') {
                // Toggle Metronome (ID 40364)
                await window.electronAPI.invoke('reaper:command', '40364');
                setIsMetronomeOn(!isMetronomeOn);
                return;
            }

            await window.electronAPI.invoke('reaper:transport', action);
            if (action === 'play') setIsPlaying(true);
            if (action === 'pause') setIsPlaying(false);
            if (action === 'stop') setIsPlaying(false);
        }
    };

    const handleVolume = async (trackIndex, level) => {
        // level: 0, 25, 50, 75, 100
        const vol = level / 100;

        // Update Local State
        const newTracks = [...tracks];
        const track = newTracks.find(t => t.id === trackIndex);
        if (track) {
            track.volume = level;
            // If setting volume > 0, unmute? Usually yes.
            if (level > 0 && track.muted) {
                track.muted = false;
                if (window.electronAPI) await window.electronAPI.invoke('reaper:set-mute', { trackIndex, isMuted: false });
            }
        }
        setTracks(newTracks);

        // Send to Reaper
        if (window.electronAPI) {
            await window.electronAPI.invoke('reaper:set-volume', { trackIndex, volume: vol });
        }
    };

    const toggleMute = async (trackIndex) => {
        const newTracks = [...tracks];
        const track = newTracks.find(t => t.id === trackIndex);
        if (track) {
            track.muted = !track.muted;
            setTracks(newTracks);
            if (window.electronAPI) {
                await window.electronAPI.invoke('reaper:set-mute', { trackIndex, isMuted: track.muted });
            }
        }
    };

    return (
        <div className="flex flex-col gap-4 bg-[#1A1D2D] p-4 rounded-3xl border border-white/5 shadow-2xl w-full max-w-2xl mx-auto mt-8">
            {/* Header / Transport */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Reaper Control
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleTransport('record')}
                        className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center group"
                        title="Record"
                    >
                        <div className="w-4 h-4 bg-current rounded-full group-hover:scale-110 transition-transform shadow-[0_0_10px_currentColor]" />
                    </button>

                    <div className="w-px bg-white/10 mx-2 h-12"></div>

                    {!isPlaying ? (
                        <button
                            onClick={() => handleTransport('play')}
                            className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center"
                            title="Play"
                        >
                            <Play size={24} fill="currentColor" />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleTransport('pause')}
                            className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all flex items-center justify-center"
                            title="Pause"
                        >
                            <Pause size={24} fill="currentColor" />
                        </button>
                    )}

                    <button
                        onClick={() => handleTransport('stop')}
                        className="w-12 h-12 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center"
                        title="Stop"
                    >
                        <Square size={20} fill="currentColor" />
                    </button>

                    <div className="w-px bg-white/10 mx-2 h-12"></div>

                    <button
                        onClick={() => handleTransport('metronome')}
                        className={`w-12 h-12 rounded-xl transition-all flex items-center justify-center ${isMetronomeOn ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}`}
                        title="Toggle Metronome"
                    >
                        <Timer size={20} />
                    </button>
                </div>
            </div>

            {/* Mixer */}
            <div className="grid grid-cols-3 gap-4">
                {tracks.map(track => (
                    <div key={track.id} className="bg-[#13151F] rounded-xl p-3 border border-white/5 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <span className={`font-bold text-sm ${track.color}`}>{track.name}</span>
                            <button
                                onClick={() => toggleMute(track.id)}
                                className={`p-1.5 rounded-lg transition-colors ${track.muted ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                title={track.muted ? "Unmute" : "Mute"}
                            >
                                {track.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            </button>
                        </div>

                        {/* Volume Levels */}
                        <div className="flex gap-1 justify-between">
                            {[25, 50, 75, 100].map(level => (
                                <button
                                    key={level}
                                    onClick={() => handleVolume(track.id, level)}
                                    className={`h-8 flex-1 rounded text-[10px] font-bold transition-all border ${track.volume >= level && !track.muted
                                        ? `bg-white/10 text-white border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]`
                                        : 'bg-[#0F111A] text-gray-600 border-transparent hover:bg-white/5'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                        {/* Progress Bar Visual */}
                        <div className="h-1 w-full bg-[#0F111A] rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${track.muted ? 'bg-gray-700' : track.volume > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${track.muted ? 0 : track.volume}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReaperControls;
