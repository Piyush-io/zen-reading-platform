"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ["↑", "↓"], description: "Navigate articles", category: "Navigation" },
  { keys: ["Enter"], description: "Open selected article", category: "Navigation" },
  { keys: ["Esc"], description: "Go back / Close", category: "Navigation" },
  
  // Reading
  { keys: ["Esc", "Esc"], description: "Exit article (press twice)", category: "Reading" },
  { keys: ["+"], description: "Increase text width", category: "Reading" },
  { keys: ["-"], description: "Decrease text width", category: "Reading" },
  
  // Annotations
  { keys: ["Select text"], description: "Show annotation menu", category: "Annotations" },
  { keys: ["Drag note"], description: "Move annotation", category: "Annotations" },
  { keys: ["Click note"], description: "Edit annotation", category: "Annotations" },
  { keys: ["Hover AI"], description: "Show explanation", category: "Annotations" },
  
  // General
  { keys: ["?"], description: "Show keyboard shortcuts", category: "General" },
  { keys: ["/"], description: "Focus search", category: "General" },
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open shortcuts modal with "?" key
      if (e.key === "?" && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
      
      // Close with Escape
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <>
      {/* Trigger button */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 300, damping: 30 }}
      >
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-background/90 border border-border shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Show keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Content */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-background border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden pointer-events-auto"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Keyboard className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-light">Keyboard Shortcuts</h2>
                  </div>
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Shortcuts List */}
                <div className="px-6 py-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                  <div className="space-y-8">
                    {categories.map((category, categoryIndex) => (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: categoryIndex * 0.1 }}
                      >
                        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-light">
                          {category}
                        </h3>
                        <div className="space-y-3">
                          {shortcuts
                            .filter(s => s.category === category)
                            .map((shortcut, index) => (
                              <motion.div
                                key={index}
                                className="flex items-center justify-between py-2 group"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: categoryIndex * 0.1 + index * 0.05 }}
                                whileHover={{ x: 4 }}
                              >
                                <span className="text-sm font-light text-muted-foreground group-hover:text-foreground transition-colors">
                                  {shortcut.description}
                                </span>
                                <div className="flex items-center gap-1">
                                  {shortcut.keys.map((key, keyIndex) => (
                                    <motion.kbd
                                      key={keyIndex}
                                      className="px-2.5 py-1 text-xs font-mono bg-muted border border-border rounded shadow-sm min-w-[32px] text-center"
                                      whileHover={{ scale: 1.05 }}
                                    >
                                      {key}
                                    </motion.kbd>
                                  ))}
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <motion.div
                  className="px-6 py-4 border-t border-border bg-muted/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-xs text-center text-muted-foreground font-light">
                    Press <kbd className="px-1.5 py-0.5 mx-1 text-xs font-mono bg-background border border-border rounded">?</kbd> anytime to show this help
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

