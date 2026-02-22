import { create } from 'zustand';

// Mock Electron IPC for browser dev mode
const mockIpc = {
    invoke: async (channel, ...args) => {
        console.log(`[MockIPC] Call: ${channel}`, args);
        if (channel === 'db:get') return { user: { name: 'Dev User' } };
        return { success: true };
    }
};

const getIpc = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
        return window.electronAPI;
    }
    return mockIpc;
};

const useStore = create((set, get) => ({
    // State
    userName: 'Guest',
    status: 'idle', // idle, session, paused
    currentPhase: null, // warmup, technique, athletics, music
    sessionTimeLeft: 0,
    reaperConnected: false,

    // Actions
    init: async () => {
        try {
            const ipc = getIpc();
            const data = await ipc.invoke('db:get');
            set({ userName: data.user?.name || 'Guitarist' });
        } catch (e) {
            console.error("Failed to init", e);
        }
    },

    launchReaper: async () => {
        console.log("launchReaper action triggered");
        const ipc = getIpc();
        await ipc.invoke('reaper:launch');
        // In a real app we'd poll for connection, here we assume success for UI
        set({ reaperConnected: true });
    },

    startSession: () => {
        // Placeholder for session logic
        set({ status: 'session', currentPhase: 'warmup', sessionTimeLeft: 900 });
    }
}));

export default useStore;
