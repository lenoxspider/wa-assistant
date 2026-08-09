import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Send, Settings, User, ListTodo, BookOpen, 
  Home, Activity, Search, Zap, Mic, Volume2, Cpu, 
  CheckCheck, Play, Pause, Eye, ShieldAlert, BarChart3, RefreshCw, 
  Layers, MessageSquare, Sparkles, X, Menu, TrendingUp
} from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:3001/api';
const socket = io('http://localhost:3001');

axios.defaults.headers.common['Authorization'] = 'Bearer secret-token';

function App() {
  const [activeTab, setActiveTab] = useState<'chats'|'escalations'|'tasks'|'kb'|'insights'|'settings'>('chats');
  
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [rules, setRules] = useState({ autoReplyEnabled: 1, silenceDuration: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedVisionImage, setSelectedVisionImage] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [escalations, setEscalations] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState({
    respondInGroups: false,
    voiceOutputEnabled: true,
    autoReleaseTimerHours: 2,
    webSearchEnabled: true
  });

  const [failedJobs, setFailedJobs] = useState<any[]>([]);
  
  const [newKbContent, setNewKbContent] = useState('');
  const [newKbCategory, setNewKbCategory] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const activeTasksCount = tasks.filter(t => t.status !== 'completed').length;

  const highlightMatches = (text: string) => text;

  useEffect(() => {
    fetchChats();
    fetchEscalations();
    fetchTasks();
    fetchKnowledge();
    fetchBriefs();
    fetchSettings();
    fetchFailedJobs();
    
    socket.on('new_message', (msg) => {
      fetchChats(); 
      if (selectedChat && msg.chatId === selectedChat.jid) {
        setMessages(prev => [...prev, msg]);
      }
    });

    socket.on('new_escalation', (esc) => {
      setEscalations(prev => [esc, ...prev]);
    });

    return () => {
      socket.off('new_message');
      socket.off('new_escalation');
    };
  }, [selectedChat]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.jid);
      fetchRules(selectedChat.jid);
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${API_URL}/chats`);
      setChats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const res = await axios.get(`${API_URL}/chats/${chatId}/messages`);
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRules = async (chatId: string) => {
    try {
      const res = await axios.get(`${API_URL}/rules/${chatId}`);
      setRules(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEscalations = async () => {
    try {
      const res = await axios.get(`${API_URL}/escalations`);
      setEscalations(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`);
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchKnowledge = async () => {
    try {
      const res = await axios.get(`${API_URL}/knowledge`);
      setKnowledge(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBriefs = async () => {
    try {
      const res = await axios.get(`${API_URL}/briefs`);
      setBriefs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`);
      setAppSettings(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFailedJobs = async () => {
    try {
      const res = await axios.get(`${API_URL}/queue/failed`);
      setFailedJobs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    try {
      setAiAnswer('Thinking...');
      const res = await axios.post(`${API_URL}/query`, { query: aiQuery });
      setAiAnswer(res.data.answer);
    } catch(e) {
      console.error(e);
      setAiAnswer('Error asking AI.');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChat) return;
    try {
      await axios.post(`${API_URL}/chats/${selectedChat.jid}/reply`, { text: replyText });
      setMessages(prev => [...prev, { body: replyText, fromMe: true, timestamp: Date.now() / 1000 }]);
      setReplyText('');
    } catch (e) {
      console.error(e);
    }
  };

  const saveRules = async () => {
    if (!selectedChat) return;
    try {
      await axios.post(`${API_URL}/rules/${selectedChat.jid}`, rules);
      setShowSettings(false);
    } catch (e) {
      console.error(e);
    }
  };

  const saveGlobalSettings = async (newSettings: any) => {
    try {
      const updated = { ...appSettings, ...newSettings };
      setAppSettings(updated);
      await axios.post(`${API_URL}/settings`, updated);
    } catch (e) {
      console.error(e);
    }
  };

  const resolveEscalation = async (id: number) => {
    try {
      await axios.post(`${API_URL}/escalations/${id}/resolve`, { resolution: 'Resolved via dashboard' });
      setEscalations(prev => prev.filter(e => e.id !== id));
    } catch(e) {
      console.error(e);
    }
  };

  const completeTask = async (id: number) => {
    try {
      await axios.post(`${API_URL}/tasks/${id}/complete`);
      fetchTasks();
    } catch(e) {
      console.error(e);
    }
  };

  const addKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbContent.trim()) return;
    try {
      await axios.post(`${API_URL}/knowledge`, { content: newKbContent, category: newKbCategory });
      setNewKbContent('');
      setNewKbCategory('');
      fetchKnowledge();
    } catch(e) {
      console.error(e);
    }
  };

  const retryFailedQueue = async () => {
    try {
      await axios.post(`${API_URL}/queue/retry-failed`);
      fetchFailedJobs();
    } catch(e) {
      console.error(e);
    }
  };

  const filteredChats = chats.filter(c => 
    c.name?.toLowerCase().includes(searchFilter.toLowerCase()) || 
    c.jid.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0E101A] text-slate-100 p-4 md:p-6 lg:p-8 flex items-center justify-center font-sans antialiased">
      {/* Main App Canvas Shell */}
      <div className="w-full max-w-[1520px] h-[92vh] bg-[#161928] border border-white/10 rounded-[28px] shadow-2xl flex overflow-hidden relative backdrop-blur-2xl">

        {/* 1. Left System & Nav Panel */}
        <div className="w-[320px] bg-[#121422]/90 border-r border-white/5 flex flex-col justify-between p-5 shrink-0">
          <div>
            {/* Nav Header Icons */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Zap size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-base tracking-wide text-white">Messiah OS</h1>
                  <p className="text-[11px] text-blue-400 font-medium">WhatsApp AI Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                <button title="Dashboard Home" onClick={() => setActiveTab('chats')} className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-all"><Home size={16} /></button>
                <button title="Global Settings" onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-all"><Settings size={16} /></button>
                <button title="Activity Log" onClick={() => setActiveTab('insights')} className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-all"><Activity size={16} /></button>
              </div>
            </div>

            {/* Performance Spline Speed Curve Panel */}
            <div className="bg-[#1A1D30] border border-white/5 rounded-2xl p-4 mb-5 shadow-lg relative overflow-hidden group">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-blue-400" /> Pipeline Throughput
                </span>
                <span className="text-sm font-bold text-white bg-blue-500/20 px-2 py-0.5 rounded-lg border border-blue-500/30">
                  2.54x
                </span>
              </div>

              {/* Spline curve visual graph */}
              <div className="h-24 w-full relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 80">
                  <defs>
                    <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path 
                    d="M 0,65 Q 40,60 80,45 T 160,20 T 200,10" 
                    fill="none" 
                    stroke="#3B82F6" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M 0,65 Q 40,60 80,45 T 160,20 T 200,10 L 200,80 L 0,80 Z" 
                    fill="url(#curveGradient)" 
                  />
                  <circle cx="200" cy="10" r="4" fill="#60A5FA" className="animate-ping" />
                  <circle cx="200" cy="10" r="4" fill="#3B82F6" />
                </svg>
              </div>

              {/* Speed Multiplier Pills */}
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {['1.45x', '3.42x', '5.22x', '1.20x'].map((m, idx) => (
                  <span key={idx} className="text-[11px] font-semibold text-slate-300 bg-[#222741] border border-white/5 rounded-lg py-1 text-center hover:border-blue-500/40 hover:text-white transition-all cursor-pointer">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Active Multimodal Engine Highlight Card */}
            <div className="bg-[#1A1D30] border border-white/5 rounded-2xl p-4 shadow-lg mb-5 relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 shadow-md">
                  <div className="w-full h-full bg-[#121422] rounded-[10px] flex items-center justify-center">
                    <Cpu size={20} className="text-purple-400" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Qwen2.5 Omni & Messiah</h4>
                  <p className="text-[10px] text-slate-400">Eyes, Ears & Reasoning</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-white/5">
                <span className="text-slate-400">Uptime: <strong className="text-slate-200 font-semibold">23h : 43m</strong></span>
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 128 Active
                </span>
              </div>
            </div>

            {/* Failed Queue Items Banner (if any) */}
            {failedJobs.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-3 flex items-center justify-between">
                <span className="text-xs text-rose-300 font-semibold">{failedJobs.length} Failed Queue Jobs</span>
                <button onClick={retryFailedQueue} className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            )}

            {/* Quick Memory Items List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400 px-1 mb-1">
                <span>Vector Memory Index</span>
                <span onClick={() => setActiveTab('kb')} className="text-blue-400 cursor-pointer hover:underline text-[11px]">View KB</span>
              </div>
              <div className="bg-[#1A1D30] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[170px]">ChromaDB Vectors</span>
                </div>
                <span className="text-[11px] font-bold text-amber-400">0.0 $</span>
              </div>
              <div className="bg-[#1A1D30] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[170px]">SQLite Local DB</span>
                </div>
                <span className="text-[11px] font-bold text-blue-400">100%</span>
              </div>
            </div>
          </div>

          {/* Quick System Stats Footer */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><ShieldAlert size={14} className="text-emerald-400"/> System Guard</span>
            <span className="text-slate-300 font-mono text-[11px]">v1.2.0</span>
          </div>
        </div>

        {/* 2. Center Command Hub & Stats Area */}
        <div className="flex-1 bg-[#161928] flex flex-col p-6 overflow-y-auto relative">
          
          {/* Global Settings Modal Overlay */}
          {showSettings && (
            <div className="absolute top-16 right-6 w-96 bg-[#1F243B] border border-white/10 p-5 rounded-2xl shadow-2xl z-30 backdrop-blur-xl">
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-white/10">
                <h3 className="font-bold text-sm text-white flex items-center gap-2"><Settings size={16}/> Global Bot Control Switches</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white text-xs">Close</button>
              </div>
              <div className="space-y-4 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300 font-medium">Respond in Group Chats</span>
                  <input 
                    type="checkbox" 
                    checked={appSettings.respondInGroups} 
                    onChange={e => saveGlobalSettings({ respondInGroups: e.target.checked })}
                    className="w-4 h-4 accent-blue-500" 
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300 font-medium">Voice Audio Synthesis (Qwen TTS)</span>
                  <input 
                    type="checkbox" 
                    checked={appSettings.voiceOutputEnabled} 
                    onChange={e => saveGlobalSettings({ voiceOutputEnabled: e.target.checked })}
                    className="w-4 h-4 accent-blue-500" 
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300 font-medium">Live DuckDuckGo Web Search</span>
                  <input 
                    type="checkbox" 
                    checked={appSettings.webSearchEnabled} 
                    onChange={e => saveGlobalSettings({ webSearchEnabled: e.target.checked })}
                    className="w-4 h-4 accent-blue-500" 
                  />
                </label>
                {selectedChat && (
                  <div className="pt-3 border-t border-white/10">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-slate-300 font-medium">Current Chat Auto-Reply</span>
                      <input 
                        type="checkbox" 
                        checked={rules.autoReplyEnabled === 1} 
                        onChange={e => setRules({ ...rules, autoReplyEnabled: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 accent-emerald-500" 
                      />
                    </label>
                    <button onClick={saveRules} className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-xl transition-all">
                      Save Chat Setting
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Bar Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSettings(!showSettings)} className="bg-[#222741] hover:bg-[#2A3050] text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold border border-white/5 transition-all shadow-sm flex items-center gap-1.5">
                <Settings size={14} /> Control Switches
              </button>
              <div className="flex items-center gap-2 bg-[#1A1D30] px-4 py-2 rounded-xl border border-white/5 text-xs">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-slate-400">Balance:</span>
                <strong className="text-white font-bold text-sm">68,150.50 $</strong>
              </div>
            </div>

            {/* Profile Avatar & Global Status */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <h3 className="text-xs font-bold text-white">Messiah Admin</h3>
                <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-md">
                <div className="w-full h-full bg-[#121422] rounded-[10px] flex items-center justify-center text-white font-bold text-sm">
                  MA
                </div>
              </div>
            </div>
          </div>

          {/* Featured Engine Hero Banner Card */}
          <div className="bg-[#1A1D30] border border-white/5 rounded-2xl p-6 mb-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                Primary Architecture
              </span>
              <h2 className="text-2xl font-bold text-white">Multimodal & Text Engine</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Messiah 7B handles deep conversation reasoning, while Qwen2.5 Omni delivers eyes (vision analysis) and ears (speech audio synthesis).
              </p>
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-semibold text-slate-300">7.19 $ » 8.15 $</span>
                <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-600/30 transition-all">
                  Receive 2.54x
                </button>
              </div>
            </div>

            <div className="w-36 h-36 bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl border border-white/10 flex items-center justify-center relative p-4 shadow-inner">
              <Cpu size={56} className="text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              <span className="absolute -bottom-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                1.7s Latency
              </span>
            </div>
          </div>

          {/* 3 Vibrant 3D Feature Promo Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Sky Blue Card */}
            <div 
              onClick={() => setActiveTab('kb')}
              className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-xl glow-blue cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                <BookOpen size={24} className="text-white" />
              </div>
              <h3 className="font-bold text-base mb-1">Knowledge & Memory</h3>
              <p className="text-xs text-blue-100/90 leading-relaxed mb-4">
                Don't miss the latest facts & vector memories saved in ChromaDB.
              </p>
              <span className="text-[11px] font-bold underline text-white/90 group-hover:text-white">Explore KB →</span>
            </div>

            {/* Electric Violet Card */}
            <div 
              onClick={() => setActiveTab('tasks')}
              className="bg-gradient-to-br from-purple-600 via-indigo-600 to-violet-700 rounded-2xl p-5 text-white shadow-xl glow-purple cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                <ListTodo size={24} className="text-white" />
              </div>
              <h3 className="font-bold text-base mb-1">Task Extraction</h3>
              <p className="text-xs text-purple-100/90 leading-relaxed mb-4">
                Auto-extract commitments & sync with Todoist, Notion or Webhooks.
              </p>
              <span className="text-[11px] font-bold underline text-white/90 group-hover:text-white">View Tasks →</span>
            </div>

            {/* Coral Rose Card */}
            <div 
              onClick={() => setActiveTab('escalations')}
              className="bg-gradient-to-br from-rose-500 via-red-500 to-pink-600 rounded-2xl p-5 text-white shadow-xl glow-rose cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-inner">
                <ShieldAlert size={24} className="text-white" />
              </div>
              <h3 className="font-bold text-base mb-1">Intervention Alerts</h3>
              <p className="text-xs text-rose-100/90 leading-relaxed mb-4">
                Inspect human escalations & manage 2-hour auto-release timer.
              </p>
              <span className="text-[11px] font-bold underline text-white/90 group-hover:text-white">
                Open Alerts ({escalations.length}) →
              </span>
            </div>
          </div>

          {/* System Statistics & Contacts Table Panel */}
          <div className="bg-[#1A1D30] border border-white/5 rounded-2xl p-5 shadow-xl flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-400" /> Active WhatsApp Conversations & Statistics
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-slate-200"><User size={14}/> 73 Contacts</span>
                <span className="flex items-center gap-1 font-semibold text-slate-200"><Layers size={14}/> 24.60 MB</span>
              </div>
            </div>

            {/* Active Table List */}
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
              {chats.slice(0, 5).map((c: any, i: number) => (
                <div key={c.jid || i} className="bg-[#222741] border border-white/5 rounded-xl p-3.5 flex items-center justify-between hover:border-blue-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(c.name || c.jid)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.name || c.jid.split('@')[0]}</h4>
                      <p className="text-[10px] text-slate-400">{c.isGroup ? 'Group Conversation' : 'Direct Message'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-slate-300 hidden sm:inline">20.47 $</span>
                    <button 
                      onClick={() => {
                        setSelectedChat(c);
                        setActiveTab('chats');
                      }}
                      className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs px-3 py-1.5 rounded-lg transition-all font-semibold"
                    >
                      Involved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Right Sidebar / WhatsApp Live Feed & Chat Drawer */}
        <div className="hidden lg:flex w-[380px] bg-[#121422] border-l border-white/5 flex-col justify-between p-5 shrink-0 relative z-10">
          {/* Sidebar Top Search & Active Counters */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-400" /> WhatsApp Feed
              </h3>
              <span className="text-[11px] font-bold text-slate-400 bg-[#1A1D30] px-2 py-0.5 rounded-full border border-white/5">
                438 Online
              </span>
            </div>

            {/* Search Filter Input */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search chats or messages..." 
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full bg-[#1A1D30] border border-white/5 text-xs text-white pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all placeholder-slate-500"
              />
            </div>

            {/* Nav Tabs Bar */}
            <div className="grid grid-cols-5 gap-1 mb-4 bg-[#1A1D30] p-1 rounded-xl border border-white/5 text-[11px]">
              <button onClick={() => setActiveTab('chats')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'chats' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Chats</button>
              <button onClick={() => setActiveTab('tasks')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Tasks</button>
              <button onClick={() => setActiveTab('kb')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'kb' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>KB</button>
              <button onClick={() => setActiveTab('escalations')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'escalations' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Alerts</button>
              <button onClick={() => setActiveTab('insights')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'insights' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>AI</button>
            </div>
          </div>

          {/* Floating System Overlay Message Banner (Matches Mockup) */}
          <div className="absolute top-28 right-4 left-4 z-20 bg-[#1F243B] border border-blue-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-start gap-3 transform hover:scale-[1.02] transition-all">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Activity size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-white">System Message</h4>
                <span className="text-[10px] text-slate-400">10:32</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">Your surfing... WhatsApp pipeline running smoothly.</p>
            </div>
          </div>

          {/* Active Tab Panel Views */}
          <div className="flex-1 overflow-y-auto space-y-2 mt-20 pr-1">
            
            {/* CHATS TAB */}
            {activeTab === 'chats' && (
              selectedChat ? (
                <div className="flex-1 min-h-[500px] h-[60vh] pr-1 flex flex-col">
                  <div className="flex justify-between items-center bg-[#222741] p-3 rounded-2xl mb-2">
                    <h4 className="text-white font-bold text-xs">{selectedChat.name || selectedChat.jid}</h4>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedChat(null); }} className="text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded-md hover:text-white">Back</button>
                  </div>
                  <Virtuoso
                    style={{ height: '100%', flex: 1 }}
                    data={messages}
                    followOutput="smooth"
                    initialTopMostItemIndex={messages.length - 1}
                    itemContent={(i, m: any) => (
                      <div className={`flex mb-2.5 ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                          m.fromMe 
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-sm shadow-md' 
                          : 'bg-[#1A1D30] text-slate-200 border border-white/5 rounded-bl-sm'
                        }`}>
                          
                          {/* Audio Waveform Player Widget */}
                          {m.mediaType === 'audioMessage' || m.mediaType === 'audio' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setPlayingAudioId(playingAudioId === m.id ? null : m.id)} 
                                  className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                                >
                                  {playingAudioId === m.id ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                                
                                {/* Animated Audio Waveform Frequency Equalizer Bars */}
                                <div className="flex-1 flex items-center gap-0.5 h-6">
                                  {[40, 70, 30, 90, 60, 100, 45, 80, 55, 35, 95, 65, 40, 75].map((height, bIdx) => (
                                    <div 
                                      key={bIdx} 
                                      className={`flex-1 rounded-full transition-all duration-300 ${playingAudioId === m.id ? 'bg-cyan-300 animate-pulse' : 'bg-white/40'}`} 
                                      style={{ height: playingAudioId === m.id ? `${(height * (bIdx % 3 + 1)) % 100}%` : `${height / 3}%` }}
                                    ></div>
                                  ))}
                                </div>
                                <span className="text-[9px] text-white/80">0:15</span>
                              </div>
                              <span className="text-[9px] italic text-white/70 block">🎵 Qwen Omni Speech Note</span>
                            </div>
                          ) : m.mediaType === 'imageMessage' || m.mediaType === 'image' ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-blue-300 font-semibold cursor-pointer" onClick={() => setSelectedVisionImage({ url: '', description: m.body })}>
                                <Eye size={12}/> <span>View Vision Result</span>
                              </div>
                              <p className="whitespace-pre-wrap">{highlightMatches(m.body)}</p>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed">{highlightMatches(m.body)}</p>
                          )}

                          <div className="flex items-center justify-end gap-1 mt-1 opacity-70 text-[9px]">
                            <span>{new Date((m.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {m.fromMe && (
                              <CheckCheck size={12} className="text-cyan-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              ) : (
              filteredChats.map((c: any) => (
                <div 
                  key={c.jid} 
                  onClick={() => { setSelectedChat(c); setShowMobileDrawer(true); }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedChat?.jid === c.jid 
                    ? 'bg-[#222741] border-blue-500/50 shadow-lg' 
                    : 'bg-[#1A1D30]/60 border-white/5 hover:bg-[#1A1D30]'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(c.name || c.jid)[0]?.toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-white truncate">{c.name || c.jid.split('@')[0]}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{c.isGroup ? 'Group Chat' : 'Direct Message'}</p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 font-medium">12:35</span>
                </div>
              ))
              )
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
              tasks.map((t: any) => (
                <div key={t.id} className="bg-[#1A1D30] border border-white/5 p-3 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-bold text-blue-400">{t.description}</h4>
                    {t.status !== 'completed' && (
                      <button onClick={() => completeTask(t.id)} className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-lg border border-emerald-500/30">
                        Done
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">Source: {t.chatId.split('@')[0]}</span>
                </div>
              ))
            )}

            {/* KB TAB */}
            {activeTab === 'kb' && (
              <div className="space-y-3">
                <form onSubmit={addKnowledge} className="bg-[#1A1D30] p-3 rounded-2xl border border-white/5 space-y-2">
                  <input 
                    type="text" 
                    placeholder="Category (e.g. FAQ)" 
                    value={newKbCategory}
                    onChange={e => setNewKbCategory(e.target.value)}
                    className="w-full bg-[#121422] border border-white/5 p-2 text-xs rounded-xl text-white focus:outline-none"
                  />
                  <textarea 
                    placeholder="Paste fact or context..." 
                    value={newKbContent}
                    onChange={e => setNewKbContent(e.target.value)}
                    className="w-full bg-[#121422] border border-white/5 p-2 text-xs rounded-xl text-white h-16 focus:outline-none"
                  />
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-xl">
                    Save Knowledge
                  </button>
                </form>
                {knowledge.map((k: any) => (
                  <div key={k.id} className="bg-[#1A1D30] p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md uppercase">
                      {k.category || 'general'}
                    </span>
                    <p className="text-xs text-slate-300 mt-1">{k.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ESCALATIONS ALERTS TAB */}
            {activeTab === 'escalations' && (
              escalations.map((esc: any, idx: number) => (
                <div key={idx} className="bg-[#1A1D30] border-l-4 border-l-rose-500 p-3 rounded-2xl">
                  <h4 className="text-xs font-bold text-rose-400">{esc.chatId.split('@')[0]}</h4>
                  <p className="text-xs text-slate-300 my-1">{esc.reason}</p>
                  <button onClick={() => resolveEscalation(esc.id)} className="w-full bg-emerald-500/20 text-emerald-400 text-xs py-1 rounded-xl border border-emerald-500/30">
                    Resolve Ticket
                  </button>
                </div>
              ))
            )}

            {/* AI QUERY TAB */}
            {activeTab === 'insights' && (
              <div className="space-y-3">
                <form onSubmit={handleQuery} className="bg-[#1A1D30] p-3 rounded-2xl border border-white/5 space-y-2">
                  <input 
                    type="text" 
                    placeholder="Ask AI about chat archive..." 
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    className="w-full bg-[#121422] border border-white/5 p-2 text-xs rounded-xl text-white focus:outline-none"
                  />
                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 rounded-xl">
                    Query Archive
                  </button>
                </form>
                {aiAnswer && (
                  <div className="bg-[#1A1D30] p-3 rounded-xl text-xs text-slate-200 border border-white/5 whitespace-pre-wrap">
                    {aiAnswer}
                  </div>
                )}
                {briefs.map((b: any) => (
                  <div key={b.id} className="bg-[#1A1D30] p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-amber-400 block mb-1">{b.date}</span>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{b.contentJson}</p>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Quick Message Input Bar (Matches Mockup Footer) */}
          <div className="pt-3 border-t border-white/5">
            <form onSubmit={handleSend} className="bg-[#1A1D30] p-2 rounded-2xl border border-white/5 flex items-center gap-2">
              <button type="button" className="p-2 text-slate-400 hover:text-white"><Volume2 size={16} /></button>
              <button type="button" className="p-2 text-slate-400 hover:text-white"><Mic size={16} /></button>
              
              <input 
                type="text" 
                placeholder="Write your message..." 
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />

              <button 
                type="submit" 
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        <AnimatePresence>
          {showMobileDrawer && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) {
                  setShowMobileDrawer(false);
                }
              }}
              className="fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-[#121422] rounded-t-3xl border-t border-white/10 p-5 flex flex-col shadow-2xl lg:hidden"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing shrink-0" />
              {/* Sidebar Top Search & Active Counters */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-400" /> WhatsApp Feed
              </h3>
              <span className="text-[11px] font-bold text-slate-400 bg-[#1A1D30] px-2 py-0.5 rounded-full border border-white/5">
                438 Online
              </span>
            </div>

            {/* Search Filter Input */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search chats or messages..." 
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full bg-[#1A1D30] border border-white/5 text-xs text-white pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all placeholder-slate-500"
              />
            </div>

            {/* Nav Tabs Bar */}
            <div className="grid grid-cols-5 gap-1 mb-4 bg-[#1A1D30] p-1 rounded-xl border border-white/5 text-[11px]">
              <button onClick={() => setActiveTab('chats')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'chats' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Chats</button>
              <button onClick={() => setActiveTab('tasks')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Tasks</button>
              <button onClick={() => setActiveTab('kb')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'kb' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>KB</button>
              <button onClick={() => setActiveTab('escalations')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'escalations' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Alerts</button>
              <button onClick={() => setActiveTab('insights')} className={`py-1.5 rounded-lg font-medium transition-all ${activeTab === 'insights' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>AI</button>
            </div>
          </div>

          {/* Floating System Overlay Message Banner (Matches Mockup) */}
          <div className="absolute top-28 right-4 left-4 z-20 bg-[#1F243B] border border-blue-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-start gap-3 transform hover:scale-[1.02] transition-all">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Activity size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-white">System Message</h4>
                <span className="text-[10px] text-slate-400">10:32</span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">Your surfing... WhatsApp pipeline running smoothly.</p>
            </div>
          </div>

          {/* Active Tab Panel Views */}
          <div className="flex-1 overflow-y-auto space-y-2 mt-20 pr-1">
            
            {/* CHATS TAB */}
            {activeTab === 'chats' && (
              selectedChat ? (
                <div className="flex-1 min-h-[500px] h-[60vh] pr-1 flex flex-col">
                  <div className="flex justify-between items-center bg-[#222741] p-3 rounded-2xl mb-2">
                    <h4 className="text-white font-bold text-xs">{selectedChat.name || selectedChat.jid}</h4>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedChat(null); }} className="text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded-md hover:text-white">Back</button>
                  </div>
                  <Virtuoso
                    style={{ height: '100%', flex: 1 }}
                    data={messages}
                    followOutput="smooth"
                    initialTopMostItemIndex={messages.length - 1}
                    itemContent={(i, m: any) => (
                      <div className={`flex mb-2.5 ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                          m.fromMe 
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-sm shadow-md' 
                          : 'bg-[#1A1D30] text-slate-200 border border-white/5 rounded-bl-sm'
                        }`}>
                          
                          {/* Audio Waveform Player Widget */}
                          {m.mediaType === 'audioMessage' || m.mediaType === 'audio' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setPlayingAudioId(playingAudioId === m.id ? null : m.id)} 
                                  className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                                >
                                  {playingAudioId === m.id ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                                
                                {/* Animated Audio Waveform Frequency Equalizer Bars */}
                                <div className="flex-1 flex items-center gap-0.5 h-6">
                                  {[40, 70, 30, 90, 60, 100, 45, 80, 55, 35, 95, 65, 40, 75].map((height, bIdx) => (
                                    <div 
                                      key={bIdx} 
                                      className={`flex-1 rounded-full transition-all duration-300 ${playingAudioId === m.id ? 'bg-cyan-300 animate-pulse' : 'bg-white/40'}`} 
                                      style={{ height: playingAudioId === m.id ? `${(height * (bIdx % 3 + 1)) % 100}%` : `${height / 3}%` }}
                                    ></div>
                                  ))}
                                </div>
                                <span className="text-[9px] text-white/80">0:15</span>
                              </div>
                              <span className="text-[9px] italic text-white/70 block">🎵 Qwen Omni Speech Note</span>
                            </div>
                          ) : m.mediaType === 'imageMessage' || m.mediaType === 'image' ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-blue-300 font-semibold cursor-pointer" onClick={() => setSelectedVisionImage({ url: '', description: m.body })}>
                                <Eye size={12}/> <span>View Vision Result</span>
                              </div>
                              <p className="whitespace-pre-wrap">{highlightMatches(m.body)}</p>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed">{highlightMatches(m.body)}</p>
                          )}

                          <div className="flex items-center justify-end gap-1 mt-1 opacity-70 text-[9px]">
                            <span>{new Date((m.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {m.fromMe && (
                              <CheckCheck size={12} className="text-cyan-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              ) : (
              filteredChats.map((c: any) => (
                <div 
                  key={c.jid} 
                  onClick={() => { setSelectedChat(c); setShowMobileDrawer(true); }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedChat?.jid === c.jid 
                    ? 'bg-[#222741] border-blue-500/50 shadow-lg' 
                    : 'bg-[#1A1D30]/60 border-white/5 hover:bg-[#1A1D30]'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(c.name || c.jid)[0]?.toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-white truncate">{c.name || c.jid.split('@')[0]}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{c.isGroup ? 'Group Chat' : 'Direct Message'}</p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-500 font-medium">12:35</span>
                </div>
              ))
              )
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
              tasks.map((t: any) => (
                <div key={t.id} className="bg-[#1A1D30] border border-white/5 p-3 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-bold text-blue-400">{t.description}</h4>
                    {t.status !== 'completed' && (
                      <button onClick={() => completeTask(t.id)} className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-lg border border-emerald-500/30">
                        Done
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">Source: {t.chatId.split('@')[0]}</span>
                </div>
              ))
            )}

            {/* KB TAB */}
            {activeTab === 'kb' && (
              <div className="space-y-3">
                <form onSubmit={addKnowledge} className="bg-[#1A1D30] p-3 rounded-2xl border border-white/5 space-y-2">
                  <input 
                    type="text" 
                    placeholder="Category (e.g. FAQ)" 
                    value={newKbCategory}
                    onChange={e => setNewKbCategory(e.target.value)}
                    className="w-full bg-[#121422] border border-white/5 p-2 text-xs rounded-xl text-white focus:outline-none"
                  />
                  <textarea 
                    placeholder="Paste fact or context..." 
                    value={newKbContent}
                    onChange={e => setNewKbContent(e.target.value)}
                    className="w-full bg-[#121422] border border-white/5 p-2 text-xs rounded-xl text-white h-16 focus:outline-none"
                  />
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-xl">
                    Save Knowledge
                  </button>
                </form>
                {knowledge.map((k: any) => (
                  <div key={k.id} className="bg-[#1A1D30] p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md uppercase">
                      {k.category || 'general'}
                    </span>
                    <p className="text-xs text-slate-300 mt-1">{k.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ESCALATIONS ALERTS TAB */}
            {activeTab === 'escalations' && (
              escalations.map((esc: any, idx: number) => (
                <div key={idx} className="bg-[#1A1D30] border-l-4 border-l-rose-500 p-3 rounded-2xl">
                  <h4 className="text-xs font-bold text-rose-400">{esc.chatId.split('@')[0]}</h4>
                  <p className="text-xs text-slate-300 my-1">{esc.reason}</p>
                  <button onClick={() => resolveEscalation(esc.id)} className="w-full bg-emerald-500/20 text-emerald-400 text-xs py-1 rounded-xl border border-emerald-500/30">
                    Resolve Ticket
                  </button>
                </div>
              ))
            )}

            {/* AI QUERY TAB */}
            {activeTab === 'insights' && (
              <div className="space-y-3">
                <form onSubmit={handleQuery} className="bg-[#1A1D30] p-3 rounded-2xl border border-white/5 space-y-2">
                  <input 
                    type="text" 
                    placeholder="Ask AI about chat archive..." 
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    className="w-full bg-[#121422] border border-white/5 p-2 text-xs rounded-xl text-white focus:outline-none"
                  />
                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 rounded-xl">
                    Query Archive
                  </button>
                </form>
                {aiAnswer && (
                  <div className="bg-[#1A1D30] p-3 rounded-xl text-xs text-slate-200 border border-white/5 whitespace-pre-wrap">
                    {aiAnswer}
                  </div>
                )}
                {briefs.map((b: any) => (
                  <div key={b.id} className="bg-[#1A1D30] p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-amber-400 block mb-1">{b.date}</span>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{b.contentJson}</p>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Quick Message Input Bar (Matches Mockup Footer) */}
          <div className="pt-3 border-t border-white/5">
            <form onSubmit={handleSend} className="bg-[#1A1D30] p-2 rounded-2xl border border-white/5 flex items-center gap-2">
              <button type="button" className="p-2 text-slate-400 hover:text-white"><Volume2 size={16} /></button>
              <button type="button" className="p-2 text-slate-400 hover:text-white"><Mic size={16} /></button>
              
              <input 
                type="text" 
                placeholder="Write your message..." 
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />

              <button 
                type="submit" 
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default App;
