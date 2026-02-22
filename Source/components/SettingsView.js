import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, Monitor, Moon, Save, Zap, Music, ChevronDown } from 'lucide-react';
import { Button } from './UI';

export default function SettingsView() {
    const { t, language, changeLanguage } = useLanguage();
    const [theme, setTheme] = useState('dark');
    const [prefs, setPrefs] = useState({
        general: {
            launchReaper: true,
            launchGuitarPro: true
        }
    });

    // Collapsible State
    const [expandedSettings, setExpandedSettings] = useState({
        reaper: false,
        gp: false
    });

    const toggleExpanded = (key) => {
        setExpandedSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.invoke('prefs:get').then(setPrefs);
        }
    }, []);

    const togglePref = async (key) => {
        const newVal = !prefs.general[key];
        const newPrefs = { ...prefs, general: { ...prefs.general, [key]: newVal } };
        setPrefs(newPrefs);

        if (window.electronAPI) {
            await window.electronAPI.invoke('prefs:save', { general: { ...prefs.general, [key]: newVal } });
        }
    };

    const handleBrowse = async (key) => {
        if (window.electronAPI) {
            const filePath = await window.electronAPI.invoke('dialog:open-file', {
                filters: [{ name: 'Executables', extensions: ['exe'] }]
            });
            if (filePath) {
                const newPrefs = { ...prefs, general: { ...prefs.general, [key]: filePath } };
                setPrefs(newPrefs);
                await window.electronAPI.invoke('prefs:save', { general: { ...prefs.general, [key]: filePath } });

                // Auto-configure REAPER web interface whenever the exe path changes
                if (key === 'reaperPath') {
                    const res = await window.electronAPI.invoke('reaper:auto-config');
                    if (!res.success) {
                        alert(`REAPER path saved, but auto-config failed: ${res.error}\nMake sure REAPER is installed at the selected path and try the "Configure" button manually.`);
                    }
                }
            }
        }
    };

    const handleConfigureReaper = async () => {
        if (window.electronAPI) {
            const res = await window.electronAPI.invoke('reaper:auto-config');
            if (res.success) {
                alert("Reaper configuration updated! Web Control (Port 8080) enabled.");
            } else {
                alert("Failed to configure Reaper: " + res.error);
            }
        }
    };

    const handleInstallListener = async () => {
        if (window.electronAPI) {
            const res = await window.electronAPI.invoke('reaper:install-listener');
            if (res.success) {
                alert(`✅ Lua script installed!\n\nPath: ${res.scriptPath}\n\nRestart REAPER to activate it.`);
            } else {
                alert(`❌ Install failed: ${res.error}`);
            }
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-bold text-white mb-2">{t('settings.title')}</h1>
            </header>

            <div className="grid gap-6">
                {/* General Settings */}
                <section className="bg-[#1A1D2D] border border-white/5 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <SettingsIcon size={24} className="text-gray-400" />
                        {t('settings.general')}
                    </h2>

                    <div className="space-y-6">
                        {/* Language */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full">
                                    <Globe size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-white">{t('settings.language')}</div>
                                    <div className="text-sm text-gray-400">Select your interface language</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => changeLanguage('en')}
                                    className={`px-4 py-2 rounded-lg font-bold transition-all ${language === 'en' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => changeLanguage('ru')}
                                    className={`px-4 py-2 rounded-lg font-bold transition-all ${language === 'ru' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                                >
                                    Русский
                                </button>
                            </div>
                        </div>

                        {/* App Launch Settings */}
                        <div className="space-y-4">
                            <h3 className="text-gray-400 font-bold uppercase text-xs tracking-widest px-2">{t('settings.launch_desc')}</h3>

                            {/* Reaper Settings */}
                            <div className="bg-white/5 rounded-xl transition-colors overflow-hidden">
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5"
                                    onClick={() => toggleExpanded('reaper')}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-green-500/20 text-green-400 rounded-full">
                                            <Zap size={24} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{t('settings.launch_reaper')}</div>
                                            <div className="text-xs text-gray-400">Enable auto-launch</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePref('launchReaper'); }}
                                            className={`w-14 h-8 rounded-full p-1 transition-colors ${prefs.general.launchReaper ? 'bg-green-500' : 'bg-gray-700'}`}
                                        >
                                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${prefs.general.launchReaper ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                        <ChevronDown size={20} className={`text-gray-400 transition-transform ${expandedSettings.reaper ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                { /* Reaper Configuration - Collapsible */}
                                {expandedSettings.reaper && (
                                    <div className="p-4 pt-0 pl-20 animate-in slide-in-from-top-2 duration-200">
                                        <div className="p-4 bg-black/20 rounded-lg border border-white/5 space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Executable Path (Optional)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={prefs.general.reaperPath || ''}
                                                        readOnly
                                                        placeholder="Default: Portable Version"
                                                        className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 font-mono"
                                                    />
                                                    <Button
                                                        onClick={() => handleBrowse('reaperPath')}
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        Browse...
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    onClick={handleConfigureReaper}
                                                    className="w-full bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-500/30 text-xs py-2"
                                                >
                                                    ⚙️ Enable Port 8080
                                                </Button>
                                                <Button
                                                    onClick={handleInstallListener}
                                                    className="w-full bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-500/30 text-xs py-2"
                                                >
                                                    📜 Install Lua Script
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Guitar Pro Settings */}
                            <div className="bg-white/5 rounded-xl transition-colors overflow-hidden">
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5"
                                    onClick={() => toggleExpanded('gp')}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full">
                                            <Music size={24} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{t('settings.launch_gp')}</div>
                                            <div className="text-xs text-gray-400">Enable auto-launch</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePref('launchGuitarPro'); }}
                                            className={`w-14 h-8 rounded-full p-1 transition-colors ${prefs.general.launchGuitarPro ? 'bg-blue-500' : 'bg-gray-700'}`}
                                        >
                                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${prefs.general.launchGuitarPro ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                        <ChevronDown size={20} className={`text-gray-400 transition-transform ${expandedSettings.gp ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                { /* GP Configuration - Collapsible */}
                                {expandedSettings.gp && (
                                    <div className="p-4 pt-0 pl-20 animate-in slide-in-from-top-2 duration-200">
                                        <div className="p-4 bg-black/20 rounded-lg border border-white/5 space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Executable Path (Optional)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={prefs.general.gpPath || ''}
                                                        readOnly
                                                        placeholder="Default: Portable Version"
                                                        className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-gray-300 font-mono"
                                                    />
                                                    <Button
                                                        onClick={() => handleBrowse('gpPath')}
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        Browse...
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Theme (Placeholder) */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl opacity-50 cursor-not-allowed">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-full">
                                    <Moon size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-white">{t('settings.theme')}</div>
                                    <div className="text-sm text-gray-400">Dark mode is default</div>
                                </div>
                            </div>
                            <div className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-500 font-mono">LOCKED</div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

const SettingsIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);
