'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    Play, Pause, Square, RotateCcw, RefreshCw,
    Volume2, Gauge, List, ZoomIn, ZoomOut,
    Timer, Hash, Music2, Settings, X, ChevronDown, Clock, Music
} from 'lucide-react';
import MetronomeService from '../services/MetronomeService';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
// Compute absolute base URL for AlphaTab assets.
// Dev:  http://localhost:3000/alphatab/
// Prod: file:///…/app.asar/out/alphatab/
function getAlphaTabBasePath() {
    if (typeof window === 'undefined') return './alphatab/';
    const href = window.location.href;

    // 🔥 ФИКС: В Electron production пути должны указывать на app.asar.unpacked
    if (window.location.protocol === 'file:') {
        const asarIdx = href.indexOf('app.asar');
        if (asarIdx > 0) {
            return href.substring(0, asarIdx) + 'app.asar.unpacked/out/alphatab/';
        }
    }

    const base = href.substring(0, href.lastIndexOf('/') + 1);
    return base + 'alphatab/';
}


// StaveProfile enum: Default=0, ScoreTab=1, Score=2, Tab=3, TabMixed=4
const STAVE = { DEFAULT: 0, SCORE_TAB: 1, SCORE: 2, TAB: 3 };
// TabRhythmMode enum: Hidden=0, ShowWithBeams=1, ShowWithBars=2, Automatic=3
const RHYTHM = { HIDDEN: 0, BEAMS: 1, BARS: 2, AUTO: 3 };

// ─────────────────────────────────────────────────────────────
// Inject cursor & selection CSS once globally
// ─────────────────────────────────────────────────────────────
function ensureCursorStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('at-cursor-css')) return;
    const el = document.createElement('style');
    el.id = 'at-cursor-css';
    el.textContent = `
        /* ── AlphaTab Cursor & Selection (Guitar Pro style) ── */

        .at-cursors {
            pointer-events: none;
        }

        /* Bar cursor: HIDDEN by default, shown only during playback */
        .at-cursor-bar {
            background: transparent !important;
            opacity: 0;
        }

        /* When playing: wrapper gets .at-playing → show pale yellow bar */
        .at-cursors.at-playing .at-cursor-bar {
            background: rgba(255, 235, 59, 0.4) !important;
            opacity: 1;
        }

        /* Beat cursor: visible as a vertical line. 
           Do NOT set width here — AlphaTab uses transform:scale() internally. */
        .at-cursor-beat {
            opacity: 1 !important;
            background-color: rgba(66, 133, 244, 0.8) !important;
        }

        /* Selection: subtle highlight */
        .at-selection div {
            background: rgba(66, 133, 244, 0.1) !important;
        }

        /* Active note highlight (AlphaTab adds at-highlight class on active beat) */
        .at-highlight {
            fill: #2255aa !important;
            color: #2255aa !important;
        }
    `;
    document.head.appendChild(el);
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function Btn({ onClick, active, color = 'blue', disabled, title, children }) {
    const colors = {
        blue: 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]',
        red: 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]',
        yellow: 'bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]',
    };
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2.5 rounded-lg transition-all duration-150 ${active ? colors[color] : 'hover:bg-white/10 text-gray-400 hover:text-white'
                } disabled:opacity-25 disabled:cursor-not-allowed`}
        >
            {children}
        </button>
    );
}

function Group({ children }) {
    return (
        <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/5">
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Speed Settings Popup (Guitar Pro style)
// ─────────────────────────────────────────────────────────────
function SpeedSettingsPopup({ isOpen, onClose, onApply, initialState }) {
    const [mode, setMode] = useState(initialState?.mode || 'relative');
    const [pct, setPct] = useState(initialState?.pct ?? 100);
    const [bpm, setBpm] = useState(initialState?.bpm ?? 120);
    const [from, setFrom] = useState(initialState?.from ?? 70);
    const [to, setTo] = useState(initialState?.to ?? 100);
    const [step, setStep] = useState(initialState?.step ?? 10);
    const [repeat, setRepeat] = useState(initialState?.repeat ?? 1);

    if (!isOpen) return null;

    const handleApply = () => {
        // Final validation and clamping on Apply
        const finalPct = Math.max(10, Math.min(200, parseInt(pct) || 100));
        const finalBpm = Math.max(20, Math.min(400, parseInt(bpm) || 120));
        const finalFrom = Math.max(10, Math.min(200, parseInt(from) || 70));
        const finalTo = Math.max(10, Math.min(200, parseInt(to) || 100));
        const finalStep = Math.max(1, Math.min(100, parseInt(step) || 10));
        const finalRepeat = Math.max(1, Math.min(20, parseInt(repeat) || 1));

        onApply({
            mode,
            pct: finalPct,
            bpm: finalBpm,
            from: finalFrom,
            to: finalTo,
            step: finalStep,
            repeat: finalRepeat
        });
        onClose();
    };

    const radioClass = (m) =>
        `flex items-center gap-2 cursor-pointer text-sm font-medium ${mode === m ? 'text-white' : 'text-gray-500 hover:text-gray-300'
        }`;

    const inputClass = (enabled) =>
        `w-20 bg-black/40 border rounded-lg px-2 py-1.5 text-sm text-right font-mono outline-none transition-all ${enabled
            ? 'border-blue-500/50 text-white focus:border-blue-400'
            : 'border-white/5 text-gray-600 cursor-not-allowed'
        }`;

    const labelClass = (enabled) =>
        `text-xs ${enabled ? 'text-gray-300' : 'text-gray-600'}`;

    return (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-[#1A1D2E] border border-white/10 rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Настройки скорости</h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors">
                    <X size={14} />
                </button>
            </div>

            {/* Relative Speed */}
            <label className={radioClass('relative')} onClick={() => setMode('relative')}>
                <input type="radio" name="speedMode" checked={mode === 'relative'} onChange={() => setMode('relative')} className="accent-blue-500" />
                Относительная скорость
            </label>
            <div className="flex items-center gap-2 mt-2 mb-4 ml-6">
                <span className={labelClass(mode === 'relative')}>Скорость:</span>
                <input
                    type="number" value={pct}
                    onChange={(e) => setPct(e.target.value)}
                    disabled={mode !== 'relative'}
                    className={inputClass(mode === 'relative')}
                />
                <span className={labelClass(mode === 'relative')}>%</span>
            </div>

            {/* Fixed BPM */}
            <label className={radioClass('fixed')} onClick={() => setMode('fixed')}>
                <input type="radio" name="speedMode" checked={mode === 'fixed'} onChange={() => setMode('fixed')} className="accent-blue-500" />
                Фиксированное число BPM
            </label>
            <div className="flex items-center gap-2 mt-2 mb-4 ml-6">
                <span className={labelClass(mode === 'fixed')}>Удары в мин:</span>
                <input
                    type="number" value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    disabled={mode !== 'fixed'}
                    className={inputClass(mode === 'fixed')}
                />
                <span className={labelClass(mode === 'fixed')}>BPM</span>
            </div>

            {/* Progressive */}
            <label className={radioClass('progressive')} onClick={() => setMode('progressive')}>
                <input type="radio" name="speedMode" checked={mode === 'progressive'} onChange={() => setMode('progressive')} className="accent-blue-500" />
                Нарастающая скорость
            </label>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-2 mt-2 mb-4 ml-6 items-center">
                <span className={labelClass(mode === 'progressive')}>От:</span>
                <input type="number" value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    disabled={mode !== 'progressive'} className={inputClass(mode === 'progressive')} />
                <span className={labelClass(mode === 'progressive')}>%</span>

                <span className={labelClass(mode === 'progressive')}>До:</span>
                <input type="number" value={to}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={mode !== 'progressive'} className={inputClass(mode === 'progressive')} />
                <span className={labelClass(mode === 'progressive')}>%</span>

                <span className={labelClass(mode === 'progressive')}>Шаг:</span>
                <input type="number" value={step}
                    onChange={(e) => setStep(e.target.value)}
                    disabled={mode !== 'progressive'} className={inputClass(mode === 'progressive')} />
                <span className={labelClass(mode === 'progressive')}>%</span>

                <span className={labelClass(mode === 'progressive')}>Повтор:</span>
                <input type="number" value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                    disabled={mode !== 'progressive'} className={inputClass(mode === 'progressive')} />
                <span className={labelClass(mode === 'progressive')}>x</span>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button onClick={onClose} className="px-4 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">Отмена</button>
                <button onClick={handleApply} className="px-4 py-1.5 text-xs bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-semibold transition-all">OK</button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Metronome Settings Popup
// ─────────────────────────────────────────────────────────────
function MetroSettingsPopup({ isOpen, onClose, vol, setVol, pattern, setPattern }) {
    if (!isOpen) return null;

    const inputClass = `w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-500/50 transition-all`;
    const labelClass = `text-[10px] text-gray-400 uppercase tracking-wider mb-1 block`;

    return (
        <div className="absolute top-full left-0 mt-2 z-50 w-56 bg-[#1A1D2E] border border-white/10 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Метроном</h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors">
                    <X size={12} />
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className={labelClass}>Громкость</label>
                        <span className="text-[10px] font-mono text-blue-400">{Math.round(vol * 100)}%</span>
                    </div>
                    <input
                        type="range" min={0} max={2.0} step={0.1}
                        value={vol}
                        onChange={(e) => setVol(parseFloat(e.target.value))}
                        className="w-full accent-blue-500 cursor-pointer h-1"
                    />
                </div>

                <div>
                    <label className={labelClass}>Ритм</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setPattern('quarters')}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${pattern === 'quarters' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            Четверти
                        </button>
                        <button
                            onClick={() => setPattern('eighths')}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${pattern === 'eighths' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            Восьмые
                        </button>
                        <button
                            onClick={() => setPattern('sixteenths')}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${pattern === 'sixteenths' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            16-е
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                <button onClick={onClose} className="px-3 py-1 text-[10px] bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg font-bold transition-all">ГОТОВО</button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function TabPlayer({ filePath, sessionBpm, onSessionBpmChange }) {
    const containerRef = useRef(null);
    const scrollRef = useRef(null);
    const apiRef = useRef(null);

    // Engine state
    const [ready, setReady] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [tracks, setTracks] = useState([]);
    const [track, setTrack] = useState(0);
    const [error, setError] = useState(null);

    // Controls
    const [zoom, setZoom] = useState(100);
    const [speed, setSpeed] = useState(1.0);
    const [loop, setLoop] = useState(false);
    const [vol, setVol] = useState(1.0);

    // Speed popup state
    const [speedOpen, setSpeedOpen] = useState(false);
    const [speedConfig, setSpeedConfig] = useState({
        mode: 'relative', pct: 100, bpm: 120,
        from: 70, to: 100, step: 10, repeat: 1
    });
    const progressiveRef = useRef({ currentPct: 70, passCount: 0 });

    // Per-track volumes
    const [trackVolumes, setTrackVolumes] = useState({});
    const [tracksOpen, setTracksOpen] = useState(false);
    const [metro, setMetro] = useState(false);
    const [metroVol, setMetroVol] = useState(1.0);
    const [metroPattern, setMetroPattern] = useState('quarters');
    const [metroOpen, setMetroOpen] = useState(false);
    const metroServiceRef = useRef(null);

    const [countIn, setCountIn] = useState(false);
    const [isCounting, setIsCounting] = useState(false);
    const [countNumber, setCountNumber] = useState(0);

    // Display toggles
    const [notes, setNotes] = useState(true);
    const [tabs, setTabs] = useState(true);

    // Derive stave profile from toggles
    const getProfile = useCallback(() => {
        if (notes && tabs) return STAVE.SCORE_TAB;
        if (notes && !tabs) return STAVE.SCORE;
        if (!notes && tabs) return STAVE.TAB;
        return STAVE.SCORE_TAB;
    }, [notes, tabs]);

    const getRhythm = useCallback(() => {
        return (!notes && tabs) ? RHYTHM.BARS : RHYTHM.HIDDEN;
    }, [notes, tabs]);

    // ─────────────────────────────────────────────────────
    // 1. Init AlphaTab engine (runs once)
    // ─────────────────────────────────────────────────────
    useEffect(() => {
        ensureCursorStyles();
        let dead = false;

        (async () => {
            try {
                const basePath = getAlphaTabBasePath();

                // Load AlphaTab via <script> tag (UMD build) instead of ES module import.
                // This bypasses all webpack bundling AND asar ES-module resolution issues.
                await new Promise((resolve, reject) => {
                    // If already loaded (e.g. hot reload), skip
                    if (window.alphaTab?.AlphaTabApi) { resolve(); return; }
                    const s = document.createElement('script');
                    s.src = `${basePath}alphaTab.min.js`;
                    s.onload = resolve;
                    s.onerror = () => reject(new Error(`Failed to load AlphaTab script from: ${s.src}`));
                    document.head.appendChild(s);
                });

                const { AlphaTabApi } = window.alphaTab;
                if (!AlphaTabApi) throw new Error('AlphaTabApi not found on window.alphaTab after script load');
                if (dead || !containerRef.current) return;

                const api = new AlphaTabApi(containerRef.current, {
                    core: {
                        engine: 'canvas',
                        useWorker: false,
                        fontDirectory: `${basePath}font/`,
                        scriptFile: `${basePath}alphaTab.min.js`, // 🔥 ФИКС: Больше никаких .mjs
                        enableLazyLoading: false,
                        logLevel: 0,
                    },
                    player: {
                        enablePlayer: true,
                        enableCursor: true,
                        enableUserInteraction: true,
                        enableAnimatedBeatCursor: true,
                        enableElementHighlighting: true,
                        soundFont: `${basePath}soundfont/sonivox.sf2`,
                        scrollElement: scrollRef.current,
                    },
                    display: {
                        staveProfile: STAVE.SCORE_TAB,
                        scale: 1.0,
                        width: -1, // -1 means auto-size to container
                        resources: {
                            'staffLineColor': '#000000',
                            'notationColor': '#000000',
                            'cursorColor': '#4285f4',
                            'selectionColor': 'rgba(66, 133, 244, 0.2)',
                            'backgroundColor': '#ffffff'
                        }
                    },
                    notation: {
                        rhythmMode: RHYTHM.HIDDEN,
                    },
                });

                api.scoreLoaded.on((score) => {
                    if (dead) return;
                    console.log('[TabPlayer] Score loaded:', score.title, '| Tracks:', score.tracks?.length);
                    const scoreTracks = score.tracks || [];
                    setTracks(scoreTracks);
                    setTrack(0);
                    setLoaded(true);
                    setError(null);

                    // Explicitly trigger first render after a short delay
                    // This ensures the container is fully visible and sized
                    console.log('[TabPlayer] Scheduling first render...');
                    setTimeout(() => {
                        if (dead || !apiRef.current) return;
                        try {
                            console.log('[TabPlayer] Rendering first track...');
                            if (scoreTracks.length > 0) {
                                api.renderTracks([scoreTracks[0]]);
                            } else {
                                api.render();
                            }
                        } catch (renderErr) {
                            console.error('[TabPlayer] Render call failed:', renderErr);
                            setError(`Render failed: ${renderErr.message}`);
                        }
                    }, 100);
                });

                api.renderStarted.on(() => {
                    if (dead) return;
                    console.log('[TabPlayer] Render started...');
                });

                api.renderFinished.on(() => {
                    if (dead) return;
                    console.log('[TabPlayer] Render finished!');

                    // Trigger resize to ensure AlphaTab fills the container correctly
                    window.dispatchEvent(new Event('resize'));

                    // Force-style the beat cursor directly on the DOM element
                    // AlphaTab uses transform:scale() for sizing, so we only touch colors
                    const beat = containerRef.current?.querySelector('.at-cursor-beat');
                    if (beat) {
                        beat.style.backgroundColor = 'rgba(66, 133, 244, 0.85)';
                        beat.style.boxShadow = '0 0 6px rgba(66, 133, 244, 0.4)';
                        beat.style.opacity = '1';
                        console.log('[TabPlayer] Beat cursor styled:', beat.getBoundingClientRect());
                    } else {
                        console.warn('[TabPlayer] .at-cursor-beat element not found in DOM');
                    }
                });

                api.playerStateChanged.on((e) => {
                    if (dead) return;
                    const isPlaying = e.state === 1;
                    setPlaying(isPlaying);

                    // Toggle .at-playing on cursor wrapper for bar highlight
                    const wrap = containerRef.current?.querySelector('.at-cursors');
                    if (wrap) {
                        wrap.classList.toggle('at-playing', isPlaying);
                    }
                });

                api.error.on((e) => {
                    if (dead) return;
                    const msg = e?.message || String(e);
                    console.error('[TabPlayer] AlphaTab error:', msg);
                    setError(msg);
                    setLoaded(false);
                });

                apiRef.current = api;
                setReady(true);
                console.log('[TabPlayer] API ready');
            } catch (e) {
                if (dead) return;
                console.error('[TabPlayer] Init failed:', e);
                setError(`Init failed: ${e.message}`);
            }
        })();

        // Initialize custom Metronome Service
        metroServiceRef.current = new MetronomeService();

        return () => {
            dead = true;
            if (metroServiceRef.current) {
                metroServiceRef.current.stop();
                metroServiceRef.current = null;
            }
            if (apiRef.current) {
                try { apiRef.current.destroy(); } catch (_) { }
                apiRef.current = null;
            }
            setReady(false);
            setLoaded(false);
            setPlaying(false);
        };
    }, []);

    // ─────────────────────────────────────────────────────
    // 2. Load file when ready or path changes
    // ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!ready || !filePath) return;

        const load = async () => {
            try {
                setError(null);
                setLoaded(false);
                setTracks([]);

                if (!window.electronAPI) throw new Error('Electron API unavailable');

                console.log('[TabPlayer] Loading file:', filePath);
                const buf = await window.electronAPI.invoke('fs:read-file', filePath);
                if (!buf) throw new Error('Empty buffer returned');

                // Normalize buffer — IPC may serialize Node Buffer as { type:'Buffer', data:[...] }
                const data = (buf instanceof Uint8Array || buf instanceof ArrayBuffer)
                    ? buf
                    : new Uint8Array(buf.data || buf);

                console.log('[TabPlayer] File read, buffer size:', data.byteLength || data.length, '- calling api.load()');
                apiRef.current.load(data);
            } catch (e) {
                console.error('[TabPlayer] Load error:', e);
                setError(e.message);
            }
        };

        load();
    }, [ready, filePath]);

    // ─────────────────────────────────────────────────────
    // 3. Apply display settings on toggle change
    // ─────────────────────────────────────────────────────
    useEffect(() => {
        const api = apiRef.current;
        if (!api || !loaded) return;

        api.settings.display.staveProfile = getProfile();
        api.settings.notation.rhythmMode = getRhythm();
        api.updateSettings();
        api.render();
    }, [notes, tabs, loaded, getProfile, getRhythm]);

    // ─────────────────────────────────────────────────────
    // 3b. Sync external BPM (from Focus tab) → AlphaTab playbackSpeed
    // ─────────────────────────────────────────────────────
    useEffect(() => {
        const api = apiRef.current;
        if (!api || !loaded || !sessionBpm) return;

        const origTempo = api.score?.tempo || 120;
        const newSpeed = sessionBpm / origTempo;

        // Only apply if it actually differs (avoid feedback loops)
        if (Math.abs(newSpeed - (api.playbackSpeed || 1)) > 0.005) {
            setSpeed(newSpeed);
            api.playbackSpeed = newSpeed;

            // Also update the UI speedConfig state so the popup and button show the correct BPM
            setSpeedConfig(prev => ({
                ...prev,
                mode: 'fixed',
                bpm: sessionBpm
            }));
        }
    }, [sessionBpm, loaded]);

    // ─────────────────────────────────────────────────────
    // Control handlers
    // ─────────────────────────────────────────────────────
    const doZoom = (d) => {
        setZoom((p) => {
            const n = Math.max(50, Math.min(200, p + d));
            if (apiRef.current) {
                apiRef.current.settings.display.scale = n / 100;
                apiRef.current.updateSettings();
                apiRef.current.render();
            }
            return n;
        });
    };

    const doTrack = (i) => {
        const idx = parseInt(i, 10);
        setTrack(idx);
        if (apiRef.current && tracks[idx]) apiRef.current.renderTracks([tracks[idx]]);
    };
    
    const findCurrentMasterBar = useCallback(() => {
        const api = apiRef.current;
        if (!api?.score?.masterBars) return { start: 0, numerator: 4, denominator: 4 };
        const tick = api.tick || 0;
        // Reverse search: last bar where tick >= start
        const bars = api.score.masterBars;
        let bar = null;
        for (let i = bars.length - 1; i >= 0; i--) {
            if (tick >= bars[i].start) {
                bar = bars[i];
                break;
            }
        }
        if (bar) return { 
            start: bar.start, 
            numerator: bar.timeSignatureNumerator || 4, 
            denominator: bar.timeSignatureDenominator || 4 
        };
        const first = bars[0];
        return { 
            start: first?.start || 0, 
            numerator: first?.timeSignatureNumerator || 4, 
            denominator: first?.timeSignatureDenominator || 4 
        };
    }, []);

    const doLoop = () => { setLoop((p) => { const n = !p; if (apiRef.current) apiRef.current.isLooping = n; return n; }); };
    
    const doMetro = () => {
        setMetro((p) => {
            const n = !p;
            if (metroServiceRef.current) {
                if (n && playing) {
                    const api = apiRef.current;
                    const mb = findCurrentMasterBar();
                    const relativeTick = Math.max(0, (api?.tick || 0) - mb.start);

                    metroServiceRef.current.setBpm((api?.score?.tempo || 120) * (api?.playbackSpeed || 1));
                    metroServiceRef.current.setVolume(metroVol);
                    metroServiceRef.current.setPattern(metroPattern);
                    metroServiceRef.current.start(relativeTick, mb.numerator, mb.denominator);
                } else {
                    metroServiceRef.current.stop();
                }
            }
            // Keep AlphaTab's internal metronome silenced since we use our own
            if (apiRef.current) apiRef.current.metronomeVolume = 0;
            return n;
        });
    };

    const doCountIn = () => { setCountIn(p => !p); };

    const handlePlayPause = useCallback(() => {
        const api = apiRef.current;
        if (!api || !loaded) return;

        if (api.playerState === 1) { // Playing
            api.pause();
            return;
        }

        if (countIn) {
            setIsCounting(true);
            let beats = 4;
            let numerator = 4;

            if (api.score?.masterBars?.length > 0) {
                numerator = api.score.masterBars[0].timeSignatureNumerator;
                beats = numerator;
            }

            setCountNumber(beats);

            const m = metroServiceRef.current;
            if (m) {
                const mb = findCurrentMasterBar();
                m.setBpm((api.score?.tempo || 120) * (api.playbackSpeed || 1));
                m.setVolume(metroVol);
                m.setPattern(metroPattern);
                m.start(0, mb.numerator, mb.denominator);
            }

            let currentBeat = 0;
            const interval = setInterval(() => {
                currentBeat++;
                if (currentBeat >= beats) {
                    clearInterval(interval);
                    setIsCounting(false);
                    // If metronome is OFF, stop it after count-in. 
                    // If metronome is ON, keep it running for playback.
                    if (!metro && m) m.stop();
                    api.play();
                } else {
                    setCountNumber(beats - currentBeat);
                }
            }, (60 / (api.score?.tempo || 120)) * 1000 / (api.playbackSpeed || 1));
        } else {
            // Metronome will be started by playerPositionChanged (see effect below)
            // so we do NOT start it here — api.tick is stale before play().
            api.play();
        }
    }, [loaded, countIn, metro, metroVol, metroPattern, findCurrentMasterBar]);

    // ─── Sync metronome with player via real position data ───
    // We use playerPositionChanged to get the ACTUAL tick on the first
    // frame of playback, which solves the "always starts on beat 1" bug.
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        let waitingForFirstTick = false;

        const stateHandler = (e) => {
            const isNowPlaying = e.state === 1;
            if (isNowPlaying && metro) {
                // Don't start metronome here — api.tick is stale.
                // Instead, set a flag so the first positionChanged event starts it.
                waitingForFirstTick = true;
            } else {
                waitingForFirstTick = false;
                if (metroServiceRef.current) metroServiceRef.current.stop();
            }
        };

        const positionHandler = (e) => {
            if (!waitingForFirstTick) return;
            waitingForFirstTick = false;

            const m = metroServiceRef.current;
            if (!m || !metro) return;

            const currentTick = e.currentTick;
            const masterBars = api.score?.masterBars;

            // Find bar containing currentTick by reverse search
            let bar = null;
            if (masterBars) {
                for (let i = masterBars.length - 1; i >= 0; i--) {
                    if (currentTick >= masterBars[i].start) {
                        bar = masterBars[i];
                        break;
                    }
                }
            }

            const numerator   = bar?.timeSignatureNumerator  || 4;
            const denominator  = bar?.timeSignatureDenominator || 4;
            const barStart    = bar?.start || 0;
            const relativeTick = Math.max(0, currentTick - barStart);

            m.setBpm((api.score?.tempo || 120) * (api.playbackSpeed || 1));
            m.setVolume(metroVol);
            m.setPattern(metroPattern);
            m.start(relativeTick, numerator, denominator);
        };

        api.playerStateChanged.on(stateHandler);
        api.playerPositionChanged.on(positionHandler);
        return () => {
            api.playerStateChanged.off(stateHandler);
            api.playerPositionChanged.off(positionHandler);
        };
    }, [metro, metroVol, metroPattern]);

    // Speed settings handler
    const applySpeedConfig = useCallback((cfg) => {
        setSpeedConfig(cfg);
        const api = apiRef.current;
        if (!api) return;

        let newSpeed = 1.0;
        if (cfg.mode === 'relative') {
            newSpeed = cfg.pct / 100;
        } else if (cfg.mode === 'fixed') {
            const origTempo = api.score?.tempo || 120;
            newSpeed = cfg.bpm / origTempo;
        } else if (cfg.mode === 'progressive') {
            progressiveRef.current = { currentPct: cfg.from, passCount: 0 };
            newSpeed = cfg.from / 100;
        }

        setSpeed(newSpeed);
        api.playbackSpeed = newSpeed;

        // Emit effective absolute BPM back to SessionView
        if (onSessionBpmChange) {
            const origTempo = api.score?.tempo || 120;
            const effectiveBpm = Math.round(origTempo * newSpeed);
            onSessionBpmChange(effectiveBpm);
        }
    }, [onSessionBpmChange]);

    // Progressive speed: increment on playerFinished
    useEffect(() => {
        const api = apiRef.current;
        if (!api || speedConfig.mode !== 'progressive' || !loop) return;

        const handler = () => {
            const p = progressiveRef.current;
            p.passCount++;
            if (p.passCount >= speedConfig.repeat && p.currentPct < speedConfig.to) {
                p.currentPct = Math.min(p.currentPct + speedConfig.step, speedConfig.to);
                p.passCount = 0;
                const s = p.currentPct / 100;
                setSpeed(s);
                api.playbackSpeed = s;

                // Emit effective BPM back to SessionView
                if (onSessionBpmChange) {
                    const origTempo = api.score?.tempo || 120;
                    onSessionBpmChange(Math.round(origTempo * s));
                }
            }
        };

        api.playerFinished?.on(handler);
        return () => api.playerFinished?.off(handler);
    }, [speedConfig, loop, onSessionBpmChange]);

    // Per-track volume handler
    const doTrackVolume = (idx, value) => {
        const v = parseFloat(value);
        setTrackVolumes(prev => ({ ...prev, [idx]: v }));
        if (apiRef.current && tracks[idx]) {
            apiRef.current.changeTrackVolume([tracks[idx]], v);
        }
    };

    // Speed display text for toolbar button
    const speedLabel = speedConfig.mode === 'relative'
        ? `${speedConfig.pct}%`
        : speedConfig.mode === 'fixed'
            ? `${speedConfig.bpm} BPM`
            : `${progressiveRef.current?.currentPct || speedConfig.from}%↑`;

    // ─────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-white/5 overflow-hidden shadow-2xl">

            {/* ── Toolbar ── */}
            <div className="px-5 py-3 border-b border-white/5 bg-[#13151F] flex flex-wrap items-center gap-3">

                {/* Transport */}
                <Group>
                    <Btn onClick={handlePlayPause} disabled={!loaded || isCounting} active={playing || isCounting} color="red" title={playing ? 'Pause' : 'Play'}>
                        {isCounting ? (
                            <span className="text-sm font-bold w-[18px] h-[18px] flex items-center justify-center">{countNumber}</span>
                        ) : playing ? (
                            <Pause size={18} fill="currentColor" />
                        ) : (
                            <Play size={18} fill="currentColor" className="ml-0.5" />
                        )}
                    </Btn>
                    <Btn onClick={() => apiRef.current?.stop()} disabled={!loaded} title="Stop">
                        <Square size={18} fill="currentColor" />
                    </Btn>
                    <div className="w-px h-5 bg-white/10 mx-0.5" />
                    <Btn onClick={doLoop} disabled={!loaded} active={loop} title="Loop">
                        <RotateCcw size={18} />
                    </Btn>
                    <div className="relative flex items-center">
                        <Btn onClick={doMetro} disabled={!loaded} active={metro} color="yellow" title="Metronome">
                            <Timer size={18} />
                        </Btn>
                        <button onClick={() => setMetroOpen(!metroOpen)} className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors ml-[-4px]">
                            <ChevronDown size={12} />
                        </button>
                        <MetroSettingsPopup 
                            isOpen={metroOpen} 
                            onClose={() => setMetroOpen(false)}
                            vol={metroVol} setVol={setMetroVol}
                            pattern={metroPattern} setPattern={setMetroPattern}
                        />
                    </div>
                    <Btn onClick={doCountIn} disabled={!loaded} active={countIn} color="yellow" title="Count-in (1 bar)">
                        <Clock size={18} className={countIn ? 'animate-pulse' : ''} />
                    </Btn>
                </Group>

                {/* Notation */}
                <Group>
                    <Btn onClick={() => setNotes((v) => !v)} disabled={!loaded} active={notes} title="Standard Notation">
                        <Music2 size={17} />
                    </Btn>
                    <Btn onClick={() => setTabs((v) => !v)} disabled={!loaded} active={tabs} title="Tablature">
                        <Hash size={17} />
                    </Btn>
                </Group>

                {/* Speed */}
                <div className="relative">
                    <button
                        onClick={() => setSpeedOpen(v => !v)}
                        disabled={!loaded}
                        className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-xl border border-white/5 hover:bg-white/5 transition-all disabled:opacity-25"
                    >
                        <Gauge size={14} className="text-gray-500" />
                        <span className="text-xs text-white font-mono">{speedLabel}</span>
                        <Settings size={12} className="text-gray-500" />
                    </button>
                    <SpeedSettingsPopup
                        isOpen={speedOpen}
                        onClose={() => setSpeedOpen(false)}
                        onApply={applySpeedConfig}
                        initialState={speedConfig}
                    />
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5 ml-auto">
                    <button onClick={() => doZoom(-10)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"><ZoomOut size={15} /></button>
                    <span className="text-[10px] font-mono text-gray-500 w-10 text-center select-none">{zoom}%</span>
                    <button onClick={() => doZoom(10)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"><ZoomIn size={15} /></button>
                </div>

                {/* Tracks & Volume */}
                <div className="relative">
                    <button
                        onClick={() => setTracksOpen(v => !v)}
                        disabled={!loaded}
                        className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-xl border border-white/5 hover:bg-white/5 transition-all disabled:opacity-25 max-w-[200px]"
                    >
                        <List size={14} className="text-gray-500" />
                        <span className="text-xs text-gray-300 truncate">{tracks[track]?.name || `Track ${track + 1}`}</span>
                        <ChevronDown size={12} className="text-gray-500" />
                    </button>
                    {tracksOpen && (
                        <div className="absolute top-full right-0 mt-2 z-50 w-72 bg-[#1A1D2E] border border-white/10 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Дорожки</span>
                                <button onClick={() => setTracksOpen(false)} className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors">
                                    <X size={12} />
                                </button>
                            </div>
                            <div className="space-y-1 max-h-60 overflow-y-auto">
                                {tracks.map((t, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all ${track === i ? 'bg-blue-500/20 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'
                                            }`}
                                        onClick={() => { doTrack(i); }}
                                    >
                                        <span className={`flex-1 text-xs truncate ${track === i ? 'text-white font-medium' : 'text-gray-400'}`}>
                                            {t.name || `Track ${i + 1}`}
                                        </span>
                                        <Volume2 size={12} className="text-gray-500 flex-shrink-0" />
                                        <input
                                            type="range" min={0} max={1.5} step={0.05}
                                            value={trackVolumes[i] ?? 1.0}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => doTrackVolume(i, e.target.value)}
                                            className="w-16 accent-blue-400 cursor-pointer flex-shrink-0"
                                            style={{ height: 3 }}
                                        />
                                        <span className="text-[10px] font-mono text-gray-500 w-7 text-right flex-shrink-0">
                                            {Math.round((trackVolumes[i] ?? 1.0) * 100)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Display (scrollable area) ── */}
            <div ref={scrollRef} className="flex-1 min-h-0 relative overflow-auto bg-white">
                {error && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white p-8 text-center">
                        <div className="text-red-600 font-semibold text-lg">Could not display tab</div>
                        <div className="text-gray-500 text-sm max-w-sm break-words">{error}</div>
                        <button
                            onClick={() => { setError(null); if (filePath && apiRef.current) { setLoaded(false); apiRef.current.load && window.electronAPI?.invoke('fs:read-file', filePath).then(b => apiRef.current?.load(b)).catch(e => setError(e.message)); } }}
                            className="flex items-center gap-2 px-5 py-2 bg-black/5 hover:bg-black/10 border border-black/10 rounded-xl text-black text-sm transition-all"
                        >
                            <RefreshCw size={14} /> Retry
                        </button>
                    </div>
                )}
                {!loaded && !error && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-white">
                        <RefreshCw size={28} className="text-blue-500 animate-spin" />
                        <div className="text-gray-500 text-sm">Loading notation…</div>
                    </div>
                )}
                <div ref={containerRef} className="at-wrap p-4 min-h-[600px]" style={{ minHeight: '600px' }} />
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-1.5 border-t border-white/5 bg-black/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full transition-colors ${loaded ? 'bg-green-500' : ready ? 'bg-yellow-500' : 'bg-gray-600'}`} />
                    <span className="text-[10px] font-mono text-gray-600">{loaded ? 'Ready' : ready ? 'Loading…' : 'Init…'}</span>
                </div>
                <div className="text-[10px] font-mono text-gray-700 truncate max-w-[60%] text-right" title={filePath}>{filePath}</div>
            </div>
        </div>
    );
}
