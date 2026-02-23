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
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all mb-1 overflow-hidden whitespace-nowrap ${active ? 'bg-red-500/10 text-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'} ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? label : ''}
                style={{ WebkitAppRegion: 'no-drag' }}
            >
                <div className="min-w-[20px] flex items-center justify-center pointer-events-none">
                    <Icon size={20} />
                </div>
                {!collapsed && <span className="font-medium transition-opacity duration-200 pointer-events-none">{label}</span>}
            </div>
        );
    };

    return (
        <aside
            className={`${isOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out border-r border-white/5 flex flex-col z-50 bg-[#0F111A] relative shadow-[5px_0_30px_rgba(0,0,0,0.5)]`}
            style={{ WebkitAppRegion: 'no-drag' }}
        >
            {/* Logo */}
            <div className={`h-24 flex items-center ${isOpen ? 'justify-between px-6' : 'justify-center flex-col gap-2'} border-b border-white/5 mb-2 transition-all`}>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            {isOpen && <h1 className="text-xl font-bold text-white tracking-wider">GuitarOS</h1>}
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
                <SidebarItem icon={Activity} label={t('sidebar.progress')} id="progress" />
                <SidebarItem icon={Settings} label={t('sidebar.settings')} id="settings" />
            </nav>

            {/* User Profile Footer */}
            <div className="p-4 border-t border-white/5 bg-[#0A0C12]/50">
                <div className={`flex items-center gap-3 ${!isOpen ? 'justify-center' : ''}`}>
                    {/* Initials Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600/80 to-red-800/80 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">{getInitials(userName)}</span>
                    </div>
                    {isOpen && (
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white truncate">{userName}</div>
                        </div>
                    )}
                    {isOpen && onLogout && (
                        <button
                            onClick={onLogout}
                            title={t('sidebar.logout')}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
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
