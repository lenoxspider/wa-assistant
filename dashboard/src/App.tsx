import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Send, Settings, User, CheckCircle, ListTodo } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';
const socket = io('http://localhost:3001');

axios.defaults.headers.common['Authorization'] = 'Bearer secret-token';

function App() {
  const [activeTab, setActiveTab] = useState<'chats'|'escalations'|'tasks'>('chats');
  
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [rules, setRules] = useState({ autoReplyEnabled: 1, silenceDuration: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [escalations, setEscalations] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchChats();
    fetchEscalations();
    fetchTasks();
    
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
  }

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks`);
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    }
  }

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

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <div className="w-1/3 border-r border-gray-800 flex flex-col bg-gray-950">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            WA Assistant
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('chats')}
              className={`px-3 py-1 text-sm rounded ${activeTab === 'chats' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Chats
            </button>
            <button 
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${activeTab === 'tasks' ? 'bg-blue-900 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <ListTodo size={14} /> Tasks
            </button>
            <button 
              onClick={() => setActiveTab('escalations')}
              className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${activeTab === 'escalations' ? 'bg-red-900 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Alerts
              {escalations.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{escalations.length}</span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'chats' && (
          <div className="flex-1 overflow-y-auto">
            {chats.map((c: any) => (
              <div 
                key={c.jid} 
                onClick={() => setSelectedChat(c)}
                className={`p-4 border-b border-gray-800 cursor-pointer transition-colors ${selectedChat?.jid === c.jid ? 'bg-gray-800 border-l-4 border-l-green-500' : 'hover:bg-gray-800/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-200">{c.name || c.jid.split('@')[0]}</h3>
                    <p className="text-xs text-gray-500 truncate">{c.isGroup ? 'Group' : 'Direct Message'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-center mt-10">No tasks found</p>
            ) : tasks.map((t: any) => (
              <div key={t.id} className={`bg-gray-800 border-l-4 p-3 rounded shadow-md ${t.status === 'completed' ? 'border-l-green-500 opacity-50' : 'border-l-blue-500'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-blue-400 text-sm flex-1">{t.description}</h4>
                  {t.dueBy && (
                    <span className="text-[10px] text-gray-400 ml-2">Due: {new Date(t.dueBy).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-gray-500 flex-1 truncate">Source: {t.chatId.split('@')[0]}</span>
                  {t.status !== 'completed' && (
                    <button 
                      onClick={() => completeTask(t.id)}
                      className="bg-green-900/50 hover:bg-green-800/50 text-green-400 text-xs py-1 px-2 rounded transition-colors flex items-center gap-1"
                    >
                      <CheckCircle size={12} /> Done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'escalations' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {escalations.length === 0 ? (
              <p className="text-gray-500 text-center mt-10">No active escalations</p>
            ) : escalations.map((esc: any, idx: number) => (
              <div key={idx} className="bg-gray-800 border-l-4 border-l-red-500 p-3 rounded shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-red-400 text-sm">{esc.chatId.split('@')[0]}</h4>
                  <span className="text-[10px] text-gray-500">
                    {new Date(esc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-3">{esc.reason}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedChat({ jid: esc.chatId, name: esc.chatId });
                      setActiveTab('chats');
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1.5 rounded transition-colors"
                  >
                    View Chat
                  </button>
                  <button 
                    onClick={() => resolveEscalation(esc.id)}
                    className="flex-1 bg-green-900/50 hover:bg-green-800/50 text-green-400 text-xs py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle size={14} /> Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col relative">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950 shadow-sm z-10">
              <h2 className="font-semibold">{selectedChat.name || selectedChat.jid}</h2>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded hover:bg-gray-800 text-gray-400 transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>
            
            {showSettings && (
              <div className="absolute top-16 right-4 w-80 bg-gray-800 p-5 rounded-lg shadow-2xl z-20 border border-gray-700 backdrop-blur-md bg-opacity-95">
                <h3 className="font-semibold mb-4 text-gray-100">Chat Rules</h3>
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={rules.autoReplyEnabled === 1}
                    onChange={(e) => setRules({...rules, autoReplyEnabled: e.target.checked ? 1 : 0})}
                    className="w-5 h-5 accent-green-500 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm">Enable AI Auto-Reply</span>
                </label>
                <button 
                  onClick={saveRules}
                  className="w-full bg-green-600 hover:bg-green-500 text-white p-2 rounded-md transition-colors shadow-lg shadow-green-900/50"
                >
                  Save Settings
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900 bg-opacity-50">
              {messages.map((m: any, i) => (
                <div key={i} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm ${
                    m.fromMe 
                    ? 'bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-br-none' 
                    : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-none'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    <span className="text-[10px] opacity-60 mt-1 block text-right">
                      {new Date(m.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-gray-800 bg-gray-950 flex gap-2">
              <input 
                type="text" 
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type a manual reply..."
                className="flex-1 bg-gray-900 border border-gray-700 text-gray-100 p-3 rounded-xl focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder-gray-500"
              />
              <button 
                type="submit"
                className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-green-900/50"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 flex-col gap-4">
            <div className="w-24 h-24 rounded-full bg-gray-800/50 flex items-center justify-center mb-2">
              <User size={40} className="text-gray-700" />
            </div>
            <p className="text-lg">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
