import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StreakAnimationProps {
  streak: number;
  isOpen: boolean;
  onClose: () => void;
}

export function StreakAnimation({ streak, isOpen, onClose }: StreakAnimationProps) {
  const { width, height } = useWindowSize();
  const [displayStreak, setDisplayStreak] = useState(streak > 0 ? streak - 1 : 0);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        // If they just completed their first day, displayStreak should go from 0 to 1
        setDisplayStreak(streak > 0 ? streak : 1);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setDisplayStreak(streak > 0 ? streak - 1 : 0);
    }
  }, [isOpen, streak]);

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm w-full min-h-[100dvh] min-h-[100vh]"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={600}
            gravity={0.15}
            initialVelocityY={20}
          />
          
          <motion.div
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex flex-col items-center justify-center bg-white dark:bg-stone-900 rounded-[2rem] p-10 shadow-2xl max-w-sm w-full mx-4 border border-stone-100 dark:border-stone-800"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.25, 1],
                rotate: [0, -12, 12, -12, 0]
              }}
              transition={{ 
                duration: 1, 
                delay: 0.8,
                ease: "easeInOut"
              }}
              className="mb-8 relative"
            >
              <Flame size={140} className="fill-orange-500 text-orange-600 drop-shadow-xl z-10 relative" />
              <motion.div 
                className="absolute inset-0 bg-orange-500 blur-3xl -z-10 rounded-full opacity-40 mix-blend-screen"
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <h2 className="text-3xl font-extrabold font-header text-center mb-3 text-stone-900 dark:text-white tracking-tight">
              Day Complete!
            </h2>
            
            <div className="flex items-center justify-center gap-2 mb-10">
              <span className="text-stone-500 font-bold text-xl uppercase tracking-wider">Streak:</span>
              <motion.span
                key={displayStreak}
                initial={{ y: -20, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className={displayStreak === streak || (streak === 0 && displayStreak === 1) ? "text-orange-500 font-black text-5xl" : "text-stone-800 dark:text-stone-200 font-bold text-4xl"}
              >
                {displayStreak}
              </motion.span>
               <span className="text-orange-500 text-3xl ml-1">🔥</span>
            </div>

            <Button 
              onClick={onClose}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-7 rounded-2xl text-xl uppercase tracking-widest shadow-[0_8px_0_theme(colors.orange.700)] hover:translate-y-1 hover:shadow-[0_4px_0_theme(colors.orange.700)] active:translate-y-2 active:shadow-none transition-all"
            >
              Continue
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
}
