import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = 'http://localhost:3001/api';

type TabType = 'chats' | 'escalations' | 'tasks' | 'kb' | 'insights' | 'settings';

export type AppSettings = {
  respondInGroups: boolean;
  voiceOutputEnabled: boolean;
  autoReleaseTimerHours: number;
  webSearchEnabled: boolean;
};

export type UserProfile = {
  id: number;
  username: string;
  role: string;
};

interface UIState {
  activeTab: TabType;
  showSettings: boolean;
  showMobileDrawer: boolean;
  showBackupModal: boolean;
  playingAudioId: string | null;
  appSettings: AppSettings;
  searchFilter: string;
  token: string | null;
  user: UserProfile | null;

  setActiveTab: (tab: TabType) => void;
  setShowSettings: (show: boolean) => void;
  setShowMobileDrawer: (show: boolean) => void;
  setShowBackupModal: (show: boolean) => void;
  setPlayingAudioId: (id: string | null) => void;
  setSearchFilter: (filter: string) => void;
  setToken: (token: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  
  fetchSettings: () => Promise<void>;
  saveGlobalSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

export const useUIStore = create<UIState>((set, get) => ({
  activeTab: 'chats',
  showSettings: false,
  showMobileDrawer: false,
  showBackupModal: false,
  playingAudioId: null,
  searchFilter: '',
  appSettings: {
    respondInGroups: false,
    voiceOutputEnabled: true,
    autoReleaseTimerHours: 2,
    webSearchEnabled: true,
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setShowMobileDrawer: (showMobileDrawer) => set({ showMobileDrawer }),
  setShowBackupModal: (showBackupModal) => set({ showBackupModal }),
  setPlayingAudioId: (playingAudioId) => set({ playingAudioId }),
  setSearchFilter: (searchFilter) => set({ searchFilter }),
  setToken: (token) => {
    if (token) localStorage.setItem('whatsapp_token', token);
    else localStorage.removeItem('whatsapp_token');
    set({ token });
  },
  setUser: (user) => {
    if (user) localStorage.setItem('whatsapp_user', JSON.stringify(user));
    else localStorage.removeItem('whatsapp_user');
    set({ user });
  },

  fetchSettings: async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`);
      set({ appSettings: res.data });
    } catch (e) {
      console.error('Failed to fetch settings:', e);
      toast.error('Failed to load global settings');
    }
  },

  saveGlobalSettings: async (newSettings) => {
    try {
      const current = get().appSettings;
      const updated = { ...current, ...newSettings };
      set({ appSettings: updated });
      await axios.post(`${API_URL}/settings`, updated);
      toast.success('Global settings saved');
    } catch (e) {
      console.error('Failed to save settings:', e);
      toast.error('Failed to save settings');
    }
  },
  token: localStorage.getItem('whatsapp_token') || null,
  user: (() => {
    try {
      const stored = localStorage.getItem('whatsapp_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
}));
