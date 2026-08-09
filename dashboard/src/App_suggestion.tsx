// file: src/App.tsx
import React, {
    useEffect,
    useState,
    useRef,
    useCallback,
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

// ---- Main App ----
const API_URL = 'http://localhost:3001/api';
const socket = io('http://localhost:3001');
axios.defaults.headers.common['Authorization'] = 'Bearer secret-token';

type Chat = any;
type Message = any;
type Rule = { autoReplyEnabled: number; silenceDuration: number };
type SettingsState = {
    respondInGroups: boolean;
    voiceOutputEnabled: boolean;
    autoReleaseTimerHours: number;
    webSearchEnabled: boolean;
};

function App() {
    // ... all existing state (unchanged from previous fixed version) ...
    const [activeTab, setActiveTab] = useState<
        'chats' | 'escalations' | 'tasks' | 'kb' | 'insights' | 'settings'
    >('chats');
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyText, setReplyText] = useState('');
    const [rules, setRules] = useState<Rule>({
        autoReplyEnabled: 1,
        silenceDuration: 0,
    });
    const [showSettings, setShowSettings] = useState(false);
    const [showMobileDrawer, setShowMobileDrawer] = useState(false);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [escalations, setEscalations] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [knowledge, setKnowledge] = useState<any[]>([]);
    const [briefs, setBriefs] = useState<any[]>([]);
    const [appSettings, setAppSettings] = useState<SettingsState>({
        respondInGroups: false,
        voiceOutputEnabled: true,
        autoReleaseTimerHours: 2,
        webSearchEnabled: true,
    });
    const [failedJobs, setFailedJobs] = useState<any[]>([]);

    const [newKbContent, setNewKbContent] = useState('');
    const [newKbCategory, setNewKbCategory] = useState('');
    const [aiQuery, setAiQuery] = useState('');
    const [aiAnswer, setAiAnswer] = useState('');
    const [searchFilter, setSearchFilter] = useState('');

    const highlightMatches = (text: string) => text;

    // data fetching functions (unchanged)
    const fetchChats = useCallback(async () => { /* ... same ... */ }, []);
    const fetchMessages = useCallback(async (chatId: string) => { /* ... */ }, []);
    const fetchRules = useCallback(async (chatId: string) => { /* ... */ }, []);
    const fetchEscalations = useCallback(async () => { /* ... */ }, []);
    const fetchTasks = useCallback(async () => { /* ... */ }, []);
    const fetchKnowledge = useCallback(async () => { /* ... */ }, []);
    const fetchBriefs = useCallback(async () => { /* ... */ }, []);
    const fetchSettings = useCallback(async () => { /* ... */ }, []);
    const fetchFailedJobs = useCallback(async () => { /* ... */ }, []);
    // handlers (unchanged)
    const handleQuery = async (e: React.FormEvent) => { /* ... */ };
    const handleSend = async (e: React.FormEvent) => { /* ... */ };
    const saveRules = async () => { /* ... */ };
    const saveGlobalSettings = async (newSettings: Partial<SettingsState>) => { /* ... */ };
    const resolveEscalation = async (id: number) => { /* ... */ };
    const completeTask = async (id: number) => { /* ... */ };
    const addKnowledge = async (e: React.FormEvent) => { /* ... */ };
    const retryFailedQueue = async () => { /* ... */ };

    const filteredChats = chats.filter((c) =>
        c.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.jid.toLowerCase().includes(searchFilter.toLowerCase())
    );

    // 3D tilt hooks for promo cards
    const tilt1 = useTilt(9);
    const tilt2 = useTilt(9);
    const tilt3 = useTilt(9);

    // --- Effects (unchanged) ---
    useEffect(() => { /* ... same as before ... */ }, []);
    useEffect(() => { if (selectedChat) { fetchMessages(selectedChat.jid); fetchRules(selectedChat.jid); } }, [selectedChat]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    return (
        <div className="min-h-screen bg-[#0A0C10] text-slate-100 p-4 md:p-6 lg:p-8 flex items-center justify-center font-sans antialiased relative overflow-hidden">
            {/* Starfield background (particles) */}
            <Starfield />

            {/* Scan line effect (CRT‑like moving line) */}
            <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-scan" />
            </div>

            {/* Main container with deep glass and neon border */}
            <div className="relative z-20 w-full max-w-[1520px] h-[92vh] bg-[#131722]/75 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl flex overflow-hidden">
                {/* Left panel – system info */}
                <div className="w-[320px] bg-[#0d111a]/80 backdrop-blur-md border-r border-white/5 flex flex-col justify-between p-5 shrink-0">
                    {/* ... left panel content (spline curve, etc.) — we’ll keep but enhance with glow on hover */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-[#1A1D30]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-4 mb-5 relative overflow-hidden group hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-shadow"
                    >
                        {/* Pipeline graph + pills (as before) */}
                    </motion.div>
                    {/* other left items similarly enhanced */}
                </div>

                {/* Center area – main hub */}
                <div className="flex-1 flex flex-col p-6 overflow-y-auto relative">
                    {/* Scan line overlay inside center too */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_0%,rgba(59,130,246,0.03)_50%,transparent_100%)] bg-[length:100%_4px] animate-scan-fast" />

                    {/* Top bar */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex items-center justify-between mb-6 pb-4 border-b border-white/5"
                    >
                        {/* ... top bar buttons with glow on hover ... */}
                    </motion.div>

                    {/* Search + tabs (unchanged mechanism, but with glass effect) */}
                    <div className="relative mb-4">
                        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search chats or messages..."
                            value={searchFilter}
                            onChange={e => setSearchFilter(e.target.value)}
                            className="w-full bg-[#1A1D30]/70 backdrop-blur-md border border-white/5 text-xs text-white pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all placeholder-slate-500"
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
                                    <motion.div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md" layoutId="tabBg" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Main content area – tabs content */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {/* CHATS TAB – with 3D tilt cards */}
                        {activeTab === 'chats' && !selectedChat && filteredChats.map((c) => (
                            <motion.div
                                key={c.jid}
                                onClick={() => { setSelectedChat(c); setShowMobileDrawer(true); }}
                                className="p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between bg-[#1A1D30]/50 backdrop-blur-sm hover:bg-[#1A1D30]/90 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:border-blue-400/30"
                                whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 400 } }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* chat avatar & name */}
                            </motion.div>
                        ))}

                        {/* CHATS DETAIL – animated message bubbles */}
                        {activeTab === 'chats' && selectedChat && (
                            <div className="flex flex-col h-[60vh]">
                                <div className="flex justify-between items-center bg-[#222741]/70 backdrop-blur-md p-3 rounded-2xl mb-2">
                                    <h4 className="text-white font-bold text-xs">{selectedChat.name || selectedChat.jid}</h4>
                                    <button onClick={() => setSelectedChat(null)} className="text-[10px] text-slate-400 hover:text-white">Back</button>
                                </div>
                                <Virtuoso
                                    style={{ height: '100%' }}
                                    data={messages}
                                    followOutput="smooth"
                                    itemContent={(idx, m) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className={`flex mb-2.5 ${m.fromMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            {/* message bubble with glass + glitch effect */}
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-xs backdrop-blur-xl ${m.fromMe
                                                    ? 'bg-gradient-to-br from-blue-600/70 to-indigo-700/70 text-white rounded-br-sm shadow-md backdrop-blur-lg border border-white/10'
                                                    : 'bg-[#1A1D30]/60 text-slate-200 border border-white/5 rounded-bl-sm'
                                                } hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-shadow`}>
                                                {/* media / text */}
                                                <p className="whitespace-pre-wrap">{m.body}</p>
                                                <div className="flex justify-end items-center gap-1 mt-1">
                                                    <span className="text-[9px] opacity-70">{new Date(m.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {m.fromMe && <CheckCheck size={12} className="text-cyan-300" />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                />
                            </div>
                        )}

                        {/* TASKS, KB, ESCALATIONS, INSIGHTS – with enter/exit animations */}
                        <AnimatePresence mode="wait">
                            {activeTab === 'tasks' && <motion.div key="tasks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                {tasks.map(t => (
                                    <div key={t.id} className="bg-[#1A1D30]/50 backdrop-blur-md border border-white/5 p-3 rounded-2xl shadow-sm hover:shadow-lg transition-shadow">
                                        {/* task content */}
                                    </div>
                                ))}
                            </motion.div>}
                            {/* similarly for other tabs */}
                        </AnimatePresence>
                    </div>

                    {/* Message input bar – with glowing border on focus */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="pt-3 border-t border-white/5"
                    >
                        <form onSubmit={handleSend} className="bg-[#1A1D30]/60 backdrop-blur-md p-2 rounded-2xl border border-white/5 flex items-center gap-2 focus-within:border-blue-500/50 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                            <button type="button" className="p-2 text-slate-400 hover:text-white"><Volume2 size={16} /></button>
                            <button type="button" className="p-2 text-slate-400 hover:text-white"><Mic size={16} /></button>
                            <input
                                type="text"
                                placeholder="Write your message..."
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                            />
                            <button type="submit" className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all">
                                <Send size={16} />
                            </button>
                        </form>
                    </motion.div>
                </div>

                {/* Right sidebar – (hidden on mobile) */}
                <div className="hidden lg:flex w-[380px] bg-[#0d111a]/80 backdrop-blur-md border-l border-white/5 flex-col p-5">
                    {/* similar to original */}
                </div>
            </div>

            {/* Mobile bottom drawer */}
            <AnimatePresence>
                {showMobileDrawer && (
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 250 }}
                        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={0.15}
                        onDragEnd={(_, { offset, velocity }) => { if (offset.y > 100 || velocity.y > 500) setShowMobileDrawer(false); }}
                        className="fixed inset-x-0 bottom-0 z-50 h-[85vh] bg-[#0d111a]/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/10 p-5 flex flex-col shadow-2xl lg:hidden"
                    >
                        {/* mobile drawer content – similar to center panel */}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;