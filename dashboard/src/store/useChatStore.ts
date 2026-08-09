import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = 'http://localhost:3001/api';

type Chat = any;
type Message = any;
type Rule = { autoReplyEnabled: number; silenceDuration: number };

interface ChatState {
  chats: Chat[];
  selectedChat: Chat | null;
  messages: Message[];
  rules: Rule;
  
  setChats: (chats: Chat[]) => void;
  setSelectedChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setRules: (rules: Rule) => void;
  
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  fetchRules: (chatId: string) => Promise<void>;
  saveRules: (chatId: string, rules: Rule) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  selectedChat: null,
  messages: [],
  rules: { autoReplyEnabled: 1, silenceDuration: 0 },

  setChats: (chats) => set({ chats }),
  
  setSelectedChat: (chat) => {
    set({ selectedChat: chat });
    if (chat) {
      get().fetchMessages(chat.jid);
      get().fetchRules(chat.jid);
    }
  },

  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),

  setRules: (rules) => set({ rules }),

  fetchChats: async () => {
    try {
      const res = await axios.get(`${API_URL}/chats`);
      set({ chats: res.data });
    } catch (e) {
      console.error('Failed to fetch chats:', e);
      toast.error('Failed to load chat list');
    }
  },

  fetchMessages: async (chatId) => {
    try {
      const res = await axios.get(`${API_URL}/chats/${chatId}/messages`);
      set({ messages: res.data });
    } catch (e) {
      console.error('Failed to fetch messages:', e);
      toast.error('Failed to load chat messages');
    }
  },

  fetchRules: async (chatId) => {
    try {
      const res = await axios.get(`${API_URL}/rules/${chatId}`);
      set({ rules: res.data });
    } catch (e) {
      console.error('Failed to fetch rules:', e);
      toast.error('Failed to load bot rules');
    }
  },

  saveRules: async (chatId, rules) => {
    try {
      await axios.post(`${API_URL}/rules/${chatId}`, rules);
      set({ rules });
      toast.success('Rules saved successfully');
    } catch (e) {
      console.error('Failed to save rules:', e);
      toast.error('Failed to save rules');
    }
  }
}));
