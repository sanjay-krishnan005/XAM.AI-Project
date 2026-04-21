/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { 
  BookOpen, 
  MessageSquare, 
  PlusCircle, 
  Trophy, 
  Users, 
  BrainCircuit,
  BarChart3,
  Layers,
  Moon,
  Sun,
  LogIn,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, syncUser, db } from './lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// Pages
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Upload from './pages/Upload';
import Quiz from './pages/Quiz';
import Groups from './pages/Groups';
import Analytics from './pages/Analytics';
import Flashcards from './pages/Flashcards';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const { user, setUser, setDocuments, setQuizHistory } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setAuthLoading(true);
      if (fbUser) {
        const profile = await syncUser(fbUser);
        setUser({
          id: fbUser.uid,
          name: profile.name,
          xp: profile.xp,
          level: profile.level,
          badges: profile.badges
        });

        // Fetch user data
        const docsQuery = query(collection(db, "documents"), where("userId", "==", fbUser.uid));
        const docsSnap = await getDocs(docsQuery);
        setDocuments(docsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));

        const quizzesQuery = query(collection(db, "quizResults"), where("userId", "==", fbUser.uid));
        const quizzesSnap = await getDocs(quizzesQuery);
        setQuizHistory(quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } else {
        setUser(null);
        setDocuments([]);
        setQuizHistory([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => auth.signOut();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[0%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-teal-500/10 rounded-full blur-[100px]"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-xl flex items-center justify-center shadow-2xl animate-pulse">
            <BrainCircuit className="text-indigo-400 w-10 h-10" />
          </div>
          <div className="space-y-2 text-center">
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] animate-pulse">Waking up XAM.AI</div>
            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Synchronizing Neural Vectors...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[0%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-teal-500/10 rounded-full blur-[100px]"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-2xl rounded-[3rem] p-12 text-center shadow-2xl border border-white/10 space-y-10"
        >
          <div className="w-28 h-28 bg-white/5 border border-white/20 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl rotate-3 p-4 backdrop-blur-md">
            <img src="/logo.svg" alt="XAM.AI Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">XAM.AI</h1>
            <p className="text-slate-400 font-medium leading-relaxed">Your high-dimensional cognitive learning companion. Master knowledge through neural synthesis.</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full bg-white text-neutral-950 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-2xl shadow-white/10 group"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Initialize Google Sync
          </button>
          <div className="pt-4 flex flex-col items-center gap-2">
             <div className="h-[1px] w-20 bg-white/10"></div>
             <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-black">Firebase Enterprise Security Active</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', icon: BookOpen, label: 'Hub' },
    { id: 'chat', icon: MessageSquare, label: 'Tutor' },
    { id: 'flashcards', icon: Layers, label: 'Flux' },
    { id: 'quiz', icon: BrainCircuit, label: 'Assess' },
    { id: 'groups', icon: Users, label: 'Social' },
    { id: 'upload', icon: PlusCircle, label: 'Materials' },
    { id: 'analytics', icon: BarChart3, label: 'Stats' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-indigo-500/30 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[0%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-teal-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside className="fixed left-6 top-6 bottom-6 w-20 md:w-64 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex flex-col p-6 shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-10 px-2 lg:px-4">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex-shrink-0 p-2 shadow-lg">
              <img src="/logo.svg" alt="XAM.AI" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <span className="hidden md:block font-black text-xl tracking-tighter text-white uppercase italic">XAM.AI</span>
          </div>

          <nav className="flex-1 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white shadow-lg' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-400' : ''}`} />
                <span className="hidden md:block font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 space-y-3">
            <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 rounded-2xl border border-white/10 hidden md:block">
              <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-1">Status</div>
              <div className="text-sm font-bold flex items-center gap-2 text-white">Online & Synced ✨</div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:block font-medium text-sm">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-32 md:ml-80 pt-6 pr-6 min-h-screen">
          <div className="max-w-6xl mx-auto pb-20 space-y-6">
            <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">Vector Knowledge synced 2m ago</p>
              </div>
              
              <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Expertise Level</div>
                  <div className="text-sm font-bold text-fuchsia-400">Sage L{user?.level}</div>
                </div>
                <div className="h-8 w-[1px] bg-white/10 mx-1"></div>
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 rounded-full flex items-center justify-center border border-white/10">
                   <Trophy className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </header>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'chat' && <Chat />}
                {activeTab === 'flashcards' && <Flashcards />}
                {activeTab === 'upload' && <Upload />}
                {activeTab === 'quiz' && <Quiz />}
                {activeTab === 'groups' && <Groups />}
                {activeTab === 'analytics' && <Analytics />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
