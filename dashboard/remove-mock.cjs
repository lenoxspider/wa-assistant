const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Replace Contacts count
content = content.replace(
  '<span className="flex items-center gap-1 font-semibold text-slate-200"><User size={14}/> 73 Contacts</span>',
  '<span className="flex items-center gap-1 font-semibold text-slate-200"><User size={14}/> {chats.length} Contacts</span>'
);

// 2. Replace DB size with KB entries
content = content.replace(
  '<span className="flex items-center gap-1 font-semibold text-slate-200"><Layers size={14}/> 24.60 MB</span>',
  '<span className="flex items-center gap-1 font-semibold text-slate-200"><Layers size={14}/> {knowledge.length} KB Entries</span>'
);

// 3. Remove 20.47 $ (this might be present only once)
content = content.replace(
  '<span className="text-xs font-semibold text-slate-300 hidden sm:inline">20.47 $</span>',
  ''
);

// 4. Replace 438 Online globally (since it was duplicated)
content = content.replace(
  /438 Online/g,
  '{chats.length} Active'
);

// 5. Replace 12:35 globally
content = content.replace(
  /<span className="text-\[10px\] text-slate-500 font-medium">12:35<\/span>/g,
  '<span className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Active</span>'
);

// 6. Delete the System Message floating banners completely
// Find the floating system overlay comment and the closing div
while (content.includes('{/* Floating System Overlay Message Banner (Matches Mockup) */}')) {
    const startIdx = content.indexOf('{/* Floating System Overlay Message Banner (Matches Mockup) */}');
    // The banner is 12 lines long, ends with </div>
    const endStr = 'Your surfing... WhatsApp pipeline running smoothly.</p>\n            </div>\n          </div>';
    const endIdx = content.indexOf(endStr, startIdx);
    if (endIdx !== -1) {
        content = content.slice(0, startIdx) + content.slice(endIdx + endStr.length + 1); // +1 for newline
    } else {
        break; // safety
    }
}

fs.writeFileSync('src/App.tsx', content);
console.log('Successfully removed mock data!');
