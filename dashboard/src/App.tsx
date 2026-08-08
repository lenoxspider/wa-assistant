import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Send, Settings, User } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';
const socket = io('http://localhost:3001');

axios.defaults.headers.common['Authorization'] = 'Bearer secret-token';

function App() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [rules, setRules] = useState({ autoReplyEnabled: 1, silenceDuration: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats();
    
    socket.on('new_message', (msg) => {
      fetchChats(); 
      if (selectedChat && msg.chatId === selectedChat.jid) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => {
      socket.off('new_message');
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

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <div className="w-1/3 border-r border-gray-800 flex flex-col bg-gray-950">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            WA Assistant
          </h1>
        </div>
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
