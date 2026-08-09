const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add imports
content = content.replace(
  "  Server, Command, Sliders\n} from 'lucide-react';",
  "  Server, Command, Sliders, Menu\n} from 'lucide-react';\nimport { Virtuoso } from 'react-virtuoso';\nimport { motion, AnimatePresence } from 'framer-motion';"
);

// Replace messages.map with Virtuoso
const replaceStart = '{messages.map((m: any, i: number) => (';
const replaceEndStr = '                    {/* Live Typing & Messiah 7B Generating Indicator */}';
const startIndex = content.indexOf(replaceStart);
const endIndex = content.indexOf(replaceEndStr);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find messages.map boundaries");
  process.exit(1);
}

const originalBlock = content.substring(startIndex, endIndex);

const newBlock = `<Virtuoso
                      style={{ height: '100%' }}
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
                              // Vision Image Card Thumbnail
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-blue-300 font-semibold cursor-pointer" onClick={() => setSelectedVisionImage({ url: '', description: m.body })}>
                                  <Eye size={12}/> <span>View Vision Result</span>
                                </div>
                                <p className="whitespace-pre-wrap">{highlightMatches(m.body)}</p>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap leading-relaxed">{highlightMatches(m.body)}</p>
                            )}

                            {/* WhatsApp-Style Checkmark Status Badges */}
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
                    `;

content = content.replace(originalBlock, newBlock);

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully updated Virtuoso inside App.tsx');
