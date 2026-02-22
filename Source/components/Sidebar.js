import React from 'react';
import { LayoutDashboard, Play, Library as LibIcon, Activity, Settings, ChevronLeft } from 'lucide-react';
import useStore from '../store/useStore';
import { useLanguage } from '../context/LanguageContext';

const Sidebar = ({ activeView, onNavigate, isOpen, onToggle }) => {
    const { userName } = useStore();
    const { t } = useLanguage();

    const SidebarItem = ({ icon: Icon, label, id }) => {
        const active = activeView === id;
        const collapsed = !isOpen;

        return (
            <div
                onPointerDown={(e) => {
                    e.preventDefault(); // Prevent potential drag start
                    onNavigate(id);
                }}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all mb-1 overflow-hidden whitespace-nowrap ${active ? 'bg-red-500/10 text-red-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'} ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? label : ''}
                style={{ WebkitAppRegion: 'no-drag' }} // Ensure no drag
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
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    {isOpen && <h1 className="text-xl font-bold text-white tracking-wider">GuitarOS</h1>}
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

            <div className="p-4 border-t border-white/5 bg-[#0A0C12]/50">
                <div className={`flex items-center gap-3 ${!isOpen ? 'justify-center' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 ring-2 ring-transparent group-hover:ring-red-500/50 transition-all" />
                    {isOpen && (
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold text-white truncate">{userName}</div>
                            <div className="text-[10px] text-red-500 uppercase tracking-widest font-bold">{t('sidebar.pro_account')}</div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
