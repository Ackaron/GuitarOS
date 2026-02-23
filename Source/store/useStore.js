import { create } from 'zustand';

const getIpc = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
        return window.electronAPI;
    }
    // Mock for browser dev mode
    return {
        invoke: async (channel, ...args) => {
            console.log(`[MockIPC] ${channel}`, args);
            if (channel === 'db:get') return { user: { name: '' } };
            return { success: true };
        }
    };
};

const useStore = create((set, get) => ({
    // State
    userName: null,        // null = loading, '' = needs login, 'Name' = logged in
    status: 'idle',
    currentPhase: null,
    sessionTimeLeft: 0,
    reaperConnected: false,

    // Actions
    init: async () => {
        try {
            const ipc = getIpc();
            // This now returns the active profile data or null-ish if no user
            const data = await ipc.invoke('db:get');
            const name = data?.user?.name || '';
            set({ userName: name || '' });
        } catch (e) {
            console.error('Failed to init store:', e);
            set({ userName: '' });
        }
    },

    setUserName: (name) => set({ userName: name }),

    logout: async () => {
        try {
            const ipc = getIpc();
            await ipc.invoke('db:login', null); // Setting current user to null in registry
            set({ userName: '', status: 'idle', reaperConnected: false });
        } catch (e) {
            console.error('Logout failed:', e);
        }
    },

    launchReaper: async () => {
        const ipc = getIpc();
        await ipc.invoke('reaper:launch');
        set({ reaperConnected: true });
    },

    startSession: () => {
        set({ status: 'session', currentPhase: 'warmup', sessionTimeLeft: 900 });
    }
}));

export default useStore;
