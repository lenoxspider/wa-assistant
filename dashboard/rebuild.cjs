const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  "  Server, Command, Sliders\n} from 'lucide-react';",
  "  Server, Command, Sliders, Menu, CheckCheck, Play, Pause, Eye\n} from 'lucide-react';\nimport { Virtuoso } from 'react-virtuoso';\nimport { motion, AnimatePresence } from 'framer-motion';"
);

// 2. Add states
content = content.replace(
  'const [showCommandPalette, setShowCommandPalette] = useState(false);',
  'const [showCommandPalette, setShowCommandPalette] = useState(false);\n  const [showMobileDrawer, setShowMobileDrawer] = useState(false);\n  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);\n  const [selectedVisionImage, setSelectedVisionImage] = useState<any>(null);'
);

// 3. Add helper
content = content.replace(
  '  useEffect(() => {',
  '  const highlightMatches = (text: string) => text;\n\n  useEffect(() => {'
);

// 4. Update click handlers for mobile drawer
content = content.replace(
  /onClick=\{\(\) => setActiveTab\('kb'\)\}/g,
  "onClick={() => { setActiveTab('kb'); setShowMobileDrawer(true); }}"
);
content = content.replace(
  /onClick=\{\(\) => setActiveTab\('tasks'\)\}/g,
  "onClick={() => { setActiveTab('tasks'); setShowMobileDrawer(true); }}"
);
content = content.replace(
  /onClick=\{\(\) => setActiveTab\('escalations'\)\}/g,
  "onClick={() => { setActiveTab('escalations'); setShowMobileDrawer(true); }}"
);
content = content.replace(
  /onClick=\{\(\) => setSelectedChat\(c\)\}/g,
  "onClick={() => { setSelectedChat(c); setShowMobileDrawer(true); }}"
);
content = content.replace(
  /onClick=\{\(\) => \{\s*setSelectedChat\(c\);\s*setActiveTab\('chats'\);\s*\}\}/g,
  "onClick={() => { setSelectedChat(c); setActiveTab('chats'); setShowMobileDrawer(true); }}"
);
content = content.replace(
  /onClick=\{\(\) => setActiveTab\('chats'\)\}/g,
  "onClick={() => { setActiveTab('chats'); setShowMobileDrawer(true); }}"
);

// 5. Replace CHATS TAB to render Virtuoso if selectedChat is present
const chatsTabStartStr = "{/* CHATS TAB */}\n            {activeTab === 'chats' && (\n              filteredChats.map((c: any) => (";
const chatsTabNewStr = `{/* CHATS TAB */}
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
                      <div className={\`flex mb-2.5 \${m.fromMe ? 'justify-end' : 'justify-start'}\`}>
                        <div className={\`max-w-[85%] p-3 rounded-2xl text-xs \${
                          m.fromMe 
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-sm shadow-md' 
                          : 'bg-[#1A1D30] text-slate-200 border border-white/5 rounded-bl-sm'
                        }\`}>
                          
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
                                      className={\`flex-1 rounded-full transition-all duration-300 \${playingAudioId === m.id ? 'bg-cyan-300 animate-pulse' : 'bg-white/40'}\`} 
                                      style={{ height: playingAudioId === m.id ? \`\${(height * (bIdx % 3 + 1)) % 100}%\` : \`\${height / 3}%\` }}
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
              filteredChats.map((c: any) => (`;
content = content.replace(chatsTabStartStr, chatsTabNewStr);

// add closing parenthesis for the selectedChat ternary
const chatsTabEndStr = `                  <span className="text-[10px] text-slate-500 font-medium">12:35</span>
                </div>
              ))
            )}`;
const chatsTabEndNewStr = `                  <span className="text-[10px] text-slate-500 font-medium">12:35</span>
                </div>
              ))
              )
            )}`;
content = content.replace(chatsTabEndStr, chatsTabEndNewStr);


// 6. Extract sidebar and make it a responsive mobile drawer!
const sidebarStart = content.indexOf('{/* Sidebar Top Search & Active Counters */}');
const sidebarEndStr = '</form>\n          </div>';
const sidebarEnd = content.indexOf(sidebarEndStr, sidebarStart) + sidebarEndStr.length;

if (sidebarStart === -1 || sidebarEnd === -1) {
    console.error("Could not find sidebar boundaries");
    process.exit(1);
}

const sidebarContent = content.substring(sidebarStart, sidebarEnd);

// Create renderSidebarContent right before return (
const renderSidebarStr = '  const renderSidebarContent = () => (\n    <React.Fragment>\n' + sidebarContent.replace(/^/gm, '      ') + '\n    </React.Fragment>\n  );\n\n  return (';
content = content.replace('  return (', renderSidebarStr);

// Replace the original sidebar block with the responsive setup
const originalSidebarDivStart = content.indexOf('<div className="w-[380px] bg-[#121422] border-l border-white/5 flex flex-col justify-between p-5 shrink-0 relative">');
const originalSidebarDivEnd = content.indexOf('</div>', sidebarEnd) + 6;
const originalSidebarDivFull = content.substring(originalSidebarDivStart, originalSidebarDivEnd);

if (originalSidebarDivStart === -1) {
    console.error("Could not find original sidebar div start");
    process.exit(1);
}

const newSidebarDiv = `<div className="hidden lg:flex w-[380px] bg-[#121422] border-l border-white/5 flex-col justify-between p-5 shrink-0 relative z-10">
          {renderSidebarContent()}
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
              {renderSidebarContent()}
            </motion.div>
          )}
        </AnimatePresence>`;

content = content.replace(originalSidebarDivFull, newSidebarDiv);

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully rebuilt App.tsx');
