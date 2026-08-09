// file: src/App.tsx
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useId,
} from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Send,
  Settings,
  User,
  ListTodo,
  BookOpen,
  Home,
  Activity,
  Search,
  Zap,
  Mic,
  Volume2,
  Cpu,
  CheckCheck,
  Play,
  Pause,
  Eye,
  ShieldAlert,
  BarChart3,
  RefreshCw,
  Layers,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useChatStore } from './store/useChatStore';
import { useDashboardStore } from './store/useDashboardStore';
import { useUIStore } from './store/useUIStore';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { LoginScreen } from './components/LoginScreen';
import { useTranslation } from 'react-i18next';

const API_URL = 'http://localhost:3001/api';
const socket = io('http://localhost:3001');

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useUIStore.getState().setToken(null);
      useUIStore.getState().setUser(null);
      toast.error('Session expired. Please log in again.');
    }
    return Promise.reject(error);
  }
);

type Chat = any;
type Message = any;
type Rule = { autoReplyEnabled: number; silenceDuration: number };
type SettingsState = {
  respondInGroups: boolean;
  voiceOutputEnabled: boolean;
  autoReleaseTimerHours: number;
  webSearchEnabled: boolean;
};

// ---- 3D tilt hook (for that “illegal” depth) ----
const useTilt = (maxAngle = 8) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        ref.current.style.transform = `perspective(600px) rotateX(${-y * maxAngle}deg) rotateY(${x * maxAngle}deg) scale3d(1.02,1.02,1.02)`;
    };
    const handleMouseLeave = () => {
        if (ref.current)
            ref.current.style.transform =
                'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    };
    return { ref, onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };
};

// ---- Animated starfield canvas (particle background) ----
const Starfield: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        let w = canvas.width = window.innerWidth;
        let h = canvas.height = window.innerHeight;
        const stars = Array.from({ length: 150 }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.2 + 0.3,
            speed: Math.random() * 0.4 + 0.1,
            opacity: Math.random() * 0.5 + 0.3,
        }));

        const animate = () => {
            ctx.clearRect(0, 0, w, h);
            stars.forEach((s) => {
                s.y += s.speed;
                if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${s.opacity})`;
                ctx.fill();
            });
            requestAnimationFrame(animate);
        };
        const id = requestAnimationFrame(animate);
        const onResize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
            stars.forEach(s => { s.x = Math.random() * w; s.y = Math.random() * h; });
        };
        window.addEventListener('resize', onResize);
        return () => { cancelAnimationFrame(id); window.removeEventListener('resize', onResize); };
    }, []);
    return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-20" />;
};

function App() {
  // --- Zustand Stores ---
  const { chats, selectedChat, messages, rules, setSelectedChat, setRules, addMessage, fetchChats } = useChatStore();
  const { escalations, tasks, knowledge, briefs, failedJobs, fetchEscalations, fetchTasks, fetchKnowledge, fetchBriefs, fetchFailedJobs, resolveEscalation, completeTask, addKnowledge, retryFailedQueue } = useDashboardStore();
  const { activeTab, showSettings, showBackupModal, showMobileDrawer, playingAudioId, appSettings, searchFilter, token, user, setActiveTab, setShowSettings, setShowBackupModal, setShowMobileDrawer, setPlayingAudioId, setSearchFilter, fetchSettings, saveGlobalSettings } = useUIStore();
  const { t, i18n } = useTranslation();

  // --- Initial Data Fetch & Socket Sync ---
  useEffect(() => {
    if (!token) return;
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    fetchChats();
    fetchTasks();
    fetchEscalations();
    fetchKnowledge();
    fetchBriefs();
    fetchSettings();
    fetchFailedJobs();

    socket.on('new_message', (msg) => {
      fetchChats();
      const currentSelected = useChatStore.getState().selectedChat;
      if (currentSelected && msg.chatId === currentSelected.jid) {
        addMessage(msg);
      }
    });

    socket.on('new_escalation', (esc) => {
      useDashboardStore.getState().addEscalation(esc);
    });

    return () => {
      socket.off('new_message');
      socket.off('new_escalation');
    };
  }, [token]);

  // --- Local Form State ---
  const [replyText, setReplyText] = useState('');
  const [newKbContent, setNewKbContent] = useState('');
  const [newKbCategory, setNewKbCategory] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const highlightMatches = (text: string) => text;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    try {
      setAiAnswer('Thinking...');
      const res = await axios.post(`${API_URL}/query`, { query: aiQuery });
      setAiAnswer(res.data.answer);
    } catch (e) {
      console.error(e);
      setAiAnswer('Error asking AI.');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChat) return;
    try {
      await axios.post(`${API_URL}/chats/${selectedChat.jid}/reply`, {
        text: replyText,
      });
      addMessage({ body: replyText, fromMe: true, timestamp: Date.now() / 1000 });
      setReplyText('');
    } catch (e) {
      console.error(e);
    }
  };

  const saveRules = async () => {
    if (!selectedChat) return;
    try {
      await useChatStore.getState().saveRules(selectedChat.jid, rules);
      setShowSettings(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbContent.trim()) return;
    await addKnowledge(newKbContent, newKbCategory);
    setNewKbContent('');
    setNewKbCategory('');
  };

  const handleEscalationResolve = async (id: number) => {
    await resolveEscalation(id);
  };

  const filteredChats = chats.filter((c) =>
    c.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.jid.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!token) {
    return (
      <>
        <Toaster position="bottom-right" theme="dark" />
        <LoginScreen />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-300 font-sans selection:bg-blue-500/30 flex items-center justify-center relative overflow-hidden">
      <Toaster position="bottom-right" theme="dark" />
      {/* Starfield background (particles) */}
      <Starfield />

      {/* Scan line effect (CRT-like moving line) */}
      <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-scan" />
      </div>

      {/* Main container with deep glass and neon border */}
      <div className="relative z-20 w-full max-w-[1520px] h-[92vh] bg-[#131722]/75 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-[320px] bg-[#121422]/90 border-r border-white/5 flex flex-col justify-between p-5 shrink-0">
          {/* ... (left panel content unchanged for brevity) */}
          {/* Settings modal, nav, stats, etc. */}
          {showSettings && (
            <div className="absolute top-16 right-6 w-96 bg-[#1F243B] border border-white/10 p-5 rounded-2xl shadow-2xl z-30 backdrop-blur-xl">
              {/* Global Settings UI */}
              
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-400 mb-2 block">{t('settings.language')}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => i18n.changeLanguage('en')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    {t('settings.english')}
                  </button>
                  <button
                    onClick={() => i18n.changeLanguage('es')}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${i18n.language === 'es' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                  >
                    {t('settings.spanish')}
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowBackupModal(true);
                }}
                className="w-full mt-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all font-medium text-sm"
              >
                <Layers size={18} />
                {t('dashboard.restoreBackup')}
              </button>
            </div>
          )}
        </div>

        {/* Restore Backup Modal */}
        <AnimatePresence>
          {showBackupModal && (
            <BackupRestoreModal onClose={() => setShowBackupModal(false)} />
          )}
        </AnimatePresence>

        {/* CENTER PANEL */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto relative bg-[#0d111a]/50">
          {/* Scan line overlay removed for readability in the reading pane */}

          {/* Top Bar */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between mb-6 pb-4 border-b border-white/5"
          >
            {/* ... (top bar unchanged) */}
          </motion.div>

          {/* Dead-Letter Banner */}
          <AnimatePresence>
            {failedJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert size={16} className="text-rose-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-400">{t('dashboard.deadLetterAlert')}</h4>
                    <p className="text-[10px] text-rose-300/80 mt-0.5">
                      {t('dashboard.jobsStalled', { count: failedJobs.length })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('escalations')}
                    aria-label="View Dead-Letter Alerts"
                    className="text-[10px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    {t('dashboard.viewAlerts')}
                  </button>
                  <button
                    onClick={retryFailedQueue}
                    aria-label="Retry all failed jobs"
                    className="text-[10px] bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-rose-500/20 transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    <RefreshCw size={10} />
                    {t('dashboard.retryAll')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Filter */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              aria-label={t('dashboard.searchPlaceholder')}
              placeholder={t('dashboard.searchPlaceholder')}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#1A1D30]/70 backdrop-blur-md border border-white/5 text-xs text-white pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50 focus:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all placeholder-slate-500"
            />
          </div>

          {/* Tab bar with animated indicator */}
          <div className="grid grid-cols-5 gap-1 mb-4 bg-[#1A1D30]/60 backdrop-blur-sm p-1 rounded-xl border border-white/5 text-[11px]">
            {['chats', 'tasks', 'kb', 'escalations', 'insights'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-1.5 rounded-lg font-medium transition-all relative ${activeTab === tab ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
              >
                {tab === 'chats' && 'Chats'}
                {tab === 'tasks' && 'Tasks'}
                {tab === 'kb' && 'KB'}
                {tab === 'escalations' && 'Alerts'}
                {tab === 'insights' && 'AI'}
                {activeTab === tab && (
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md z-[-1]" layoutId="tabBg" />
                )}
              </button>
            ))}
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {/* CHATS TAB */}
            {activeTab === 'chats' &&
              (selectedChat ? (
                <div className="flex flex-col h-[60vh]">
                  <div className="flex justify-between items-center bg-[#222741] p-3 rounded-2xl mb-2">
                    <h4 className="text-white font-bold text-xs">{selectedChat.name || selectedChat.jid}</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChat(null);
                      }}
                      className="text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded-md hover:text-white"
                    >
                      Back
                    </button>
                  </div>
                  <Virtuoso
                    style={{ height: '100%', flex: 1 }}
                    data={messages}
                    followOutput="smooth"
                    initialTopMostItemIndex={messages.length - 1}
                    itemContent={(idx, m: Message) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`flex mb-2.5 ${m.fromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs ${m.fromMe
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-sm shadow-sm border border-white/10'
                              : 'bg-[#1A1D30] text-slate-200 border border-white/5 rounded-bl-sm'
                            } transition-shadow`}
                        >
                          {/* Media handling */}
                          {m.mediaType === 'audioMessage' || m.mediaType === 'audio' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    setPlayingAudioId(playingAudioId === m.id ? null : m.id)
                                  }
                                  className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
                                >
                                  {playingAudioId === m.id ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                                <div className="flex-1 flex items-center gap-0.5 h-6">
                                  {[40, 70, 30, 90, 60, 100, 45, 80, 55, 35, 95, 65, 40, 75].map(
                                    (height, bIdx) => (
                                      <div
                                        key={bIdx}
                                        className={`flex-1 rounded-full transition-all duration-300 ${playingAudioId === m.id
                                            ? 'bg-cyan-300 animate-pulse'
                                            : 'bg-white/40'
                                          }`}
                                        style={{
                                          height:
                                            playingAudioId === m.id
                                              ? `${(height * ((bIdx % 3) + 1)) % 100}%`
                                              : `${height / 3}%`,
                                        }}
                                      />
                                    )
                                  )}
                                </div>
                                <span className="text-[9px] text-white/80">0:15</span>
                              </div>
                              <span className="text-[9px] italic text-white/70 block">
                                🎵 Qwen Omni Speech Note
                              </span>
                            </div>
                          ) : m.mediaType === 'imageMessage' || m.mediaType === 'image' ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-blue-300 font-semibold cursor-pointer">
                                <Eye size={12} /> <span>View Vision Result</span>
                              </div>
                              <p className="whitespace-pre-wrap">{highlightMatches(m.body)}</p>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed">{highlightMatches(m.body)}</p>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1 opacity-70 text-[9px]">
                            <span>
                              {new Date(
                                (m.timestamp || Date.now() / 1000) * 1000
                              ).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {m.fromMe && <CheckCheck size={12} className="text-cyan-300" />}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  />
                </div>
              ) : (
                filteredChats.map((c: Chat) => (
                  <motion.div
                    key={c.jid}
                    onClick={() => {
                      setSelectedChat(c);
                      setShowMobileDrawer(true);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${selectedChat?.jid === c.jid
                        ? 'bg-[#222741] border-blue-500/50 shadow-md'
                        : 'bg-[#1A1D30]/50 border-white/5 hover:bg-[#1A1D30] hover:border-blue-400/30'
                      }`}
                    whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 400 } }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(c.name || c.jid)[0]?.toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-white truncate">
                          {c.name || c.jid.split('@')[0]}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          {c.isGroup ? 'Group Conversation' : 'Direct Message'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Active</span>
                  </motion.div>
                ))
              ))}

            {/* TASKS TAB */}
            {activeTab === 'tasks' &&
              tasks.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#1A1D30] border border-white/5 p-3 rounded-2xl shadow-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-xs font-bold text-blue-400">{t.description}</h4>
                    {t.status !== 'completed' && (
                      <button
                        onClick={() => completeTask(t.id)}
                        className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-lg border border-emerald-500/30"
                      >
                        Done
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Source: {t.chatId.split('@')[0]}
                  </span>
                </div>
              ))}

            {/* KB TAB */}
            {activeTab === 'kb' && (
              <div className="space-y-3">
                <form
                  onSubmit={handleAddKnowledge}
                  className="bg-[#1A1D30] p-3 rounded-2xl border border-white/5 space-y-2"
                >
                  <input
                    type="text"
                    placeholder="Category (e.g. FAQ)"
                    value={newKbCategory}
                    onChange={(e) => setNewKbCategory(e.target.value)}
                    className="w-full bg-[#121422] border border-white/5 p-2 text-xs rounded-xl text-white focus:outline-none"
                  />
                  <textarea
                    placeholder="Paste fact or context..."
                    value={newKbContent}
                    onChange={(e) => setNewKbContent(e.target.value)}
                    className="w-full bg-[#121422] border border-white/5 p-2 text-xs rounded-xl text-white h-16 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-xl"
                  >
                    Save Knowledge
                  </button>
                </form>
                {knowledge.map((k) => (
                  <div
                    key={k.id}
                    className="bg-[#1A1D30] p-3 rounded-xl border border-white/5"
                  >
                    <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md uppercase">
                      {k.category || 'general'}
                    </span>
                    <p className="text-xs text-slate-300 mt-1">{k.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ESCALATIONS TAB */}
            {activeTab === 'escalations' &&
              escalations.map((esc, idx) => (
                <div
                  key={idx}
                  className="bg-[#1A1D30] border-l-4 border-l-rose-500 p-3 rounded-2xl"
                >
                  <h4 className="text-xs font-bold text-rose-400">
                    {esc.chatId.split('@')[0]}
                  </h4>
                  <p className="text-xs text-slate-300 my-1">{esc.reason}</p>
                  <button
                    onClick={() => resolveEscalation(esc.id)}
                    className="w-full bg-emerald-500/20 text-emerald-400 text-xs py-1 rounded-xl border border-emerald-500/30"
                  >
                    Resolve Ticket
                  </button>
                </div>
              ))}

            {/* INSIGHTS (AI) TAB */}
            {activeTab === 'insights' && (
              <div className="space-y-3">
                <form
                  onSubmit={handleQuery}
                  className="bg-[#1A1D30] p-3 rounded-2xl border border-white/5 space-y-2"
                >
                  <input
                    type="text"
                    placeholder="Ask AI about chat archive..."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    className="w-full bg-[#121422] border border-white/5 p-2 text-xs rounded-xl text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 rounded-xl"
                  >
                    Query Archive
                  </button>
                </form>
                {aiAnswer && (
                  <div className="bg-[#1A1D30] p-3 rounded-xl text-xs text-slate-200 border border-white/5 whitespace-pre-wrap">
                    {aiAnswer}
                  </div>
                )}
                {briefs.map((b) => (
                  <div
                    key={b.id}
                    className="bg-[#1A1D30] p-3 rounded-xl border border-white/5"
                  >
                    <span className="text-[10px] font-bold text-amber-400 block mb-1">
                      {b.date}
                    </span>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">
                      {b.contentJson}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="pt-3 border-t border-white/5">
            <form
              onSubmit={handleSend}
              className="bg-[#1A1D30] p-2 rounded-2xl border border-white/5 flex items-center gap-2"
            >
              <button type="button" className="p-2 text-slate-400 hover:text-white">
                <Volume2 size={16} />
              </button>
              <button type="button" className="p-2 text-slate-400 hover:text-white">
                <Mic size={16} />
              </button>
              <input
                type="text"
                placeholder="Write your message..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
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

        {/* RIGHT SIDEBAR (mobile drawer omitted for brevity) */}
        {/* ... */}
      </div>

      {/* Mobile Drawer (AnimatePresence) */}
      <AnimatePresence>
        {showMobileDrawer && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                setShowMobileDrawer(false);
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-[#121422] rounded-t-3xl border-t border-white/10 p-5 flex flex-col shadow-2xl lg:hidden"
          >
            {/* Mobile drawer content – identical to left panel, omitted for brevity */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;