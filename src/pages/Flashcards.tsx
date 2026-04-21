import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { generateFlashcards } from '../services/ai';
import { Layers, ChevronLeft, ChevronRight, RotateCcw, Zap, Loader2, Info, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Flashcards() {
  const { documents } = useStore();
  const [stage, setStage] = useState<'config' | 'loading' | 'active'>('config');
  const [cards, setCards] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set());

  const startSession = async () => {
    if (documents.length === 0) return;
    setStage('loading');
    try {
      const context = documents.map(d => d.content).join('\n\n').slice(0, 5000);
      const data = await generateFlashcards(context);
      setCards(data);
      setStage('active');
      setCurrentIdx(0);
      setIsFlipped(false);
    } catch (err) {
      console.error(err);
      setStage('config');
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIdx((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const toggleMastered = () => {
    const newMastered = new Set(masteredIds);
    if (newMastered.has(currentIdx)) {
      newMastered.delete(currentIdx);
    } else {
      newMastered.add(currentIdx);
    }
    setMasteredIds(newMastered);
  };

  if (stage === 'config') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="w-28 h-28 bg-gradient-to-br from-fuchsia-600 to-indigo-600 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl relative z-10 border border-white/20">
          <Layers className="text-white w-14 h-14" />
        </div>
        <div className="space-y-4 relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tight uppercase">Flashcard Flux</h2>
          <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">Translate complex materials into atomic knowledge nodes. Calibrate your retention through accelerated visual sync.</p>
        </div>

        <button 
          onClick={startSession}
          disabled={documents.length === 0}
          className="w-full bg-white text-neutral-950 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.03] active:scale-[0.97] transition-all shadow-2xl shadow-white/5 disabled:opacity-20 relative z-10"
        >
          {documents.length === 0 ? 'Vectors Required' : 'Initialize Session'}
        </button>
      </div>
    );
  }

  if (stage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-8">
        <div className="relative">
           <div className="absolute inset-0 bg-fuchsia-500/20 blur-xl rounded-full animate-pulse"></div>
           <Loader2 className="w-16 h-16 text-fuchsia-400 animate-spin relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <div className="text-xl font-black text-white tracking-widest uppercase italic animate-pulse">Scanning Neural Paths</div>
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">Extracting Atomic Constants...</div>
        </div>
      </div>
    );
  }

  const card = cards[currentIdx];
  const isMastered = masteredIds.has(currentIdx);

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex justify-between items-center bg-white/5 border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setStage('config')}
            className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Node {currentIdx + 1} of {cards.length}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-4 py-2 rounded-full border border-fuchsia-500/20">
            {masteredIds.size} Mastered
          </div>
        </div>
      </div>

      <div className="perspective-1000 h-[450px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 50, rotateY: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full h-full relative"
          >
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-full h-full relative transform-style-3d cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front Side */}
              <div className="absolute inset-0 backface-hidden bg-white/5 border border-white/10 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center shadow-3xl backdrop-blur-xl">
                 <div className="absolute top-8 left-8 text-[10px] font-black text-indigo-400 border border-indigo-400/30 px-3 py-1 rounded-full uppercase tracking-widest">
                   Term / Vector
                 </div>
                 <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-6">{card.category}</div>
                 <h3 className="text-4xl font-black text-white leading-tight tracking-tight">{card.front}</h3>
                 <div className="mt-12 flex items-center gap-4 text-slate-500 opacity-40 group-hover:opacity-100 transition-opacity">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Click to Flip</span>
                 </div>
              </div>

              {/* Back Side */}
              <div className="absolute inset-0 backface-hidden bg-indigo-600/10 border border-indigo-500/30 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center shadow-3xl backdrop-blur-xl rotate-y-180">
                 <div className="absolute top-8 left-8 text-[10px] font-black text-emerald-400 border border-emerald-400/30 px-3 py-1 rounded-full uppercase tracking-widest">
                   Definition / Resolution
                 </div>
                 <p className="text-2xl font-bold text-white leading-relaxed tracking-tight mb-8">{card.back}</p>
                 <div className="p-6 bg-white/5 border border-white/10 rounded-2xl max-w-sm">
                    <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Info className="w-3 h-3" />
                       Cognitive Lead
                    </div>
                    <p className="text-xs text-slate-400 italic">"{card.hint}"</p>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center items-center gap-8">
        <button 
          onClick={prevCard}
          className="p-6 bg-white/5 border border-white/10 rounded-3xl text-slate-400 hover:bg-white/10 transition-all shadow-xl active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <button 
          onClick={toggleMastered}
          className={`flex items-center gap-3 px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all border shadow-2xl ${
            isMastered 
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
          }`}
        >
          <CheckCircle size={18} />
          {isMastered ? 'Mastered' : 'Mark Mastered'}
        </button>
        <button 
          onClick={nextCard}
          className="p-6 bg-white/5 border border-white/10 rounded-3xl text-slate-400 hover:bg-white/10 transition-all shadow-xl active:scale-90"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="flex justify-center">
        <button 
          onClick={() => {
            setMasteredIds(new Set());
            setCurrentIdx(0);
            setIsFlipped(false);
          }}
          className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors"
        >
          <RotateCcw size={12} />
          Reset Neural Progress
        </button>
      </div>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
