import React from 'react';
import { LayoutDashboard, Play, Library as LibIcon, Activity, Settings, ChevronLeft, LogOut } from 'lucide-react';
import useStore from '../store/useStore';
import { useLanguage } from '../context/LanguageContext';

const Sidebar = ({ activeView, onNavigate, isOpen, onToggle, onLogout }) => {
    const { userName } = useStore();
    const { t } = useLanguage();
    const [version, setVersion] = React.useState('');

    React.useEffect(() => {
        if (window.electronAPI?.getVersion) {
            window.electronAPI.getVersion().then(setVersion);
        }
    }, []);

    // Generate initials from user name
    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name[0].toUpperCase();
    };

    const SidebarItem = ({ icon: Icon, label, id }) => {
        const active = activeView === id;
        const collapsed = !isOpen;

        return (
            <div
                onPointerDown={(e) => {
                    e.preventDefault();
                    onNavigate(id);
                }}
                className={`flex items-center gap-4 py-3 rounded-none cursor-pointer transition-all mb-1 overflow-hidden whitespace-nowrap ${active ? 'border-l-2 border-[#E63946] text-white bg-white/[0.02] pl-6' : 'border-l-2 border-transparent text-gray-500 hover:text-white pl-6'} ${collapsed ? 'justify-center px-0 pl-0 border-l-0' : ''}`}
                title={collapsed ? label : ''}
                style={{ WebkitAppRegion: 'no-drag' }}
            >
                <div className={`min-w-[20px] flex items-center justify-center pointer-events-none ${active ? 'text-[#E63946]' : ''}`}>
                    <Icon size={20} />
                </div>
                {!collapsed && <span className="font-medium transition-opacity duration-200 pointer-events-none">{label}</span>}
            </div>
        );
    };

    return (
        <aside
            className={`${isOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out border-r-0 flex flex-col z-50 bg-[#0F111A] relative`}
            style={{ WebkitAppRegion: 'no-drag' }}
        >
            {/* Logo */}
            <div className={`h-24 flex items-center ${isOpen ? 'justify-between px-8' : 'justify-center flex-col gap-2'} border-b-0 mb-6 mt-4 transition-all`}>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center opacity-90">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain filter grayscale brightness-200" />
                            </div>
                            {isOpen && <h1 className="text-xl font-bold text-white tracking-tight">GuitarOS</h1>}
                        </div>
                        {isOpen && (
                            <div className="text-[10px] text-gray-500 font-mono mt-1 opacity-50 px-1">
                                v{version}
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={onToggle} className={`text-gray-500 hover:text-white transition-colors ${!isOpen ? 'mt-2' : ''}`}>
                    <ChevronLeft size={20} className={`transition-transform ${!isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            <nav className="flex-1 px-4 space-y-2 py-4">
                <SidebarItem icon={LayoutDashboard} label={t('sidebar.dashboard')} id="dashboard" />
                <SidebarItem icon={Play} label={t('sidebar.session')} id="session" />
                <SidebarItem icon={LibIcon} label={t('sidebar.library')} id="library" />
                <SidebarItem icon={Settings} label={t('sidebar.settings')} id="settings" />
            </nav>

            {/* User Profile Footer */}
            <div className={`p-6 border-t-0 bg-transparent flex-shrink-0 mb-4 transition-all ${activeView === 'progress' ? 'bg-white/[0.02]' : ''}`}>
                <div
                    onClick={() => onNavigate('progress')}
                    className={`flex items-center gap-4 cursor-pointer group ${!isOpen ? 'justify-center' : ''}`}
                    title={!isOpen ? t('sidebar.progress') : ''}
                >
                    {/* Initials Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${activeView === 'progress' ? 'bg-[#E63946] text-white shadow-[0_0_10px_rgba(230,57,70,0.4)]' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white'}`}>
                        <span className="text-xs font-bold">{getInitials(userName)}</span>
                    </div>
                    {isOpen && (
                        <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold truncate transition-colors ${activeView === 'progress' ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{userName}</div>
                            <div className="text-[10px] text-gray-600 font-mono uppercase tracking-widest flex items-center gap-1 mt-0.5"><Activity size={10} /> {t('sidebar.progress')}</div>
                        </div>
                    )}
                    {isOpen && onLogout && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLogout(); }}
                            title={t('sidebar.logout')}
                            className="p-2 text-gray-600 hover:text-[#E63946] transition-all flex-shrink-0"
                            style={{ WebkitAppRegion: 'no-drag' }}
                        >
                            <LogOut size={16} />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
