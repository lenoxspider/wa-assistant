import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = 'http://localhost:3001/api';

interface DashboardState {
  escalations: any[];
  tasks: any[];
  knowledge: any[];
  briefs: any[];
  failedJobs: any[];

  setEscalations: (escalations: any[]) => void;
  addEscalation: (escalation: any) => void;
  removeEscalation: (id: number) => void;

  fetchEscalations: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchKnowledge: () => Promise<void>;
  fetchBriefs: () => Promise<void>;
  fetchFailedJobs: () => Promise<void>;

  resolveEscalation: (id: number) => Promise<void>;
  completeTask: (id: number) => Promise<void>;
  addKnowledge: (content: string, category: string) => Promise<void>;
  retryFailedQueue: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  escalations: [],
  tasks: [],
  knowledge: [],
  briefs: [],
  failedJobs: [],

  setEscalations: (escalations) => set({ escalations }),
  addEscalation: (escalation) => set((state) => ({ escalations: [escalation, ...state.escalations] })),
  removeEscalation: (id) => set((state) => ({ escalations: state.escalations.filter(e => e.id !== id) })),

  fetchEscalations: async () => {
    try {
      const res = await axios.get(`${API_URL}/escalations`);
      set({ escalations: res.data });
    } catch (e) {
      console.error('Failed to fetch escalations:', e);
      toast.error('Failed to load escalations');
    }
  },

  fetchTasks: async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`);
      set({ tasks: res.data });
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
      toast.error('Failed to load tasks');
    }
  },

  fetchKnowledge: async () => {
    try {
      const res = await axios.get(`${API_URL}/knowledge`);
      set({ knowledge: res.data });
    } catch (e) {
      console.error('Failed to fetch knowledge:', e);
      toast.error('Failed to load knowledge base');
    }
  },

  fetchBriefs: async () => {
    try {
      const res = await axios.get(`${API_URL}/briefs`);
      set({ briefs: res.data });
    } catch (e) {
      console.error('Failed to fetch briefs:', e);
      toast.error('Failed to load briefs');
    }
  },

  fetchFailedJobs: async () => {
    try {
      const res = await axios.get(`${API_URL}/queue/failed`);
      set({ failedJobs: res.data });
    } catch (e) {
      console.error('Failed to fetch failed jobs:', e);
    }
  },

  resolveEscalation: async (id) => {
    try {
      await axios.post(`${API_URL}/escalations/${id}/resolve`, {
        resolution: 'Resolved via dashboard',
      });
      get().removeEscalation(id);
      toast.success('Escalation resolved');
    } catch (e) {
      console.error('Failed to resolve escalation:', e);
      toast.error('Failed to resolve escalation');
    }
  },

  completeTask: async (id) => {
    try {
      await axios.post(`${API_URL}/tasks/${id}/complete`);
      get().fetchTasks();
      toast.success('Task marked as complete');
    } catch (e) {
      console.error('Failed to complete task:', e);
      toast.error('Failed to complete task');
    }
  },

  addKnowledge: async (content, category) => {
    try {
      await axios.post(`${API_URL}/knowledge`, { content, category });
      get().fetchKnowledge();
      toast.success('Knowledge added successfully');
    } catch (e) {
      console.error('Failed to add knowledge:', e);
      toast.error('Failed to add knowledge');
    }
  },

  retryFailedQueue: async () => {
    try {
      await axios.post(`${API_URL}/queue/retry-failed`);
      get().fetchFailedJobs();
      toast.success('Dead-letter queue retry initiated');
    } catch (e) {
      console.error('Failed to retry queue:', e);
      toast.error('Failed to retry queue');
    }
  }
}));
