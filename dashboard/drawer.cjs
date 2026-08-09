const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Extract sidebar and make it a responsive mobile drawer!
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
console.log('Successfully added Mobile Drawer to App.tsx');
