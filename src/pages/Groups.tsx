import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { Users, Send, Hash, ShieldCheck, Zap, Timer, Play, Pause, RefreshCw, MessageCircle, Info, Orbit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Groups() {
  const { user } = useStore();
  const [roomId, setRoomId] = useState('Global Study');
  const [username, setUsername] = useState(user?.name || 'Guest');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [timerState, setTimerState] = useState({ isActive: false, endTime: null as number | null, duration: 25 * 60 * 1000 });
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Explicitly allow polling as fallback for proxy environments
    socketRef.current = io({
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socketRef.current.on('connect', () => {
      console.log("Connected to Study Nexus");
      socketRef.current?.emit('join-room', roomId, username);
    });

    socketRef.current.on('connect_error', (error) => {
      console.warn("Nexus Link Error:", error.message);
      // Fallback is usually automatic with transports: ['polling', 'websocket']
    });

    socketRef.current.on('user-joined', (users: string[]) => {
      setActiveUsers(users);
    });

    socketRef.current.on('new-message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on('room-history', (history: any[]) => {
      setMessages(history);
    });

    socketRef.current.on('timer-update', (state: any) => {
      setTimerState(state);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    let interval: any;
    if (timerState.isActive && timerState.endTime) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((timerState.endTime! - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
    } else {
      setTimeLeft(Math.floor(timerState.duration / 1000));
    }
    return () => clearInterval(interval);
  }, [timerState]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    socketRef.current?.emit('send-message', {
      roomId,
      message: {
        text: message,
        sender: username,
      }
    });
    setMessage('');
  };

  const startSprint = () => {
    socketRef.current?.emit('start-timer', { roomId, duration: 25 * 60 * 1000 });
  };

  const stopSprint = () => {
    socketRef.current?.emit('stop-timer', { roomId });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const rooms = [
    { id: 'Global Study', icon: Hash, desc: 'Public communal neural space' },
    { id: 'Quantum Nexus', icon: Orbit, desc: 'Advanced physics & math core' },
    { id: 'Silicon Core', icon: Zap, desc: 'Engineering & CS architecture' },
    { id: 'Bio-Synthesis', icon: ShieldCheck, desc: 'Biological & chemical analysis' },
  ];

  return (
    <div className="grid lg:grid-cols-12 gap-8 h-[calc(100vh-140px)]">
      {/* Sidebar: Channels & Nexus Status */}
      <div className="lg:col-span-3 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
        <div className="space-y-6">
          <h2 className="font-black text-[10px] uppercase tracking-[0.5em] text-slate-500 px-4">Neural Nexus</h2>
          <div className="space-y-3">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoomId(r.id)}
                className={`w-full p-5 rounded-[2.5rem] border text-left transition-all backdrop-blur-md relative overflow-hidden group ${
                  roomId === r.id 
                    ? 'bg-indigo-600/30 border-indigo-500/50 text-white shadow-[0_0_40px_rgba(99,102,241,0.2)]' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {roomId === r.id && <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-2xl border ${roomId === r.id ? 'bg-indigo-500/20 border-indigo-400/30' : 'bg-white/5 border-white/10'}`}>
                    <r.icon className={`w-4 h-4 ${roomId === r.id ? 'text-indigo-400' : 'text-slate-600'}`} />
                  </div>
                  <span className="font-black text-xs tracking-widest uppercase">{r.id}</span>
                </div>
                <p className={`text-[10px] font-bold leading-relaxed uppercase tracking-tighter ${roomId === r.id ? 'text-indigo-200/60' : 'text-slate-600'}`}>
                  {r.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Presence Module */}
        <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
          <div className="flex items-center justify-between font-black text-[10px] uppercase tracking-[0.3em]">
            <span className="text-slate-500">Sync Nodes</span>
            <span className="text-indigo-400 flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              {activeUsers.length} Online
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {activeUsers.map(u => (
              <div 
                key={u} 
                className="group relative"
              >
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[10px] font-black border border-white/10 text-indigo-300 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all cursor-help">
                  {u.slice(0, 2).toUpperCase()}
                </div>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">
                   {u}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center Area: Chat & Study Sprint */}
      <div className="lg:col-span-9 flex flex-col bg-white/5 rounded-[3rem] border border-white/10 shadow-3xl backdrop-blur-2xl overflow-hidden relative">
        {/* Study Sprint Module (Pomodoro) */}
        <div className="p-6 bg-indigo-600/10 border-b border-indigo-500/20 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6 z-20">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-3xl border transition-all ${timerState.isActive ? 'bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] border-indigo-400' : 'bg-white/5 border-white/10 opacity-40'}`}>
               <Timer className={`w-8 h-8 ${timerState.isActive ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <div>
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Group Study Sprint</div>
              <div className={`text-3xl font-mono font-black tracking-tighter ${timerState.isActive ? 'text-white' : 'text-slate-400'}`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {!timerState.isActive ? (
              <button 
                onClick={startSprint}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl hover:bg-indigo-500 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95"
              >
                <Play size={14} className="fill-current" />
                Initiate Sprint
              </button>
            ) : (
              <button 
                onClick={stopSprint}
                className="flex items-center gap-2 bg-white/5 border border-red-500/30 text-red-400 px-8 py-3 rounded-2xl hover:bg-red-500/10 transition-all font-black uppercase text-[10px] tracking-widest"
              >
                <Pause size={14} />
                Abort Session
              </button>
            )}
          </div>
        </div>

        {/* Chat Stream */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-10 space-y-10 scroll-smooth scrollbar-hide z-10"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex ${msg.sender === username ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] flex flex-col gap-3 ${msg.sender === username ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{msg.sender}</span>
                  </div>
                  <div className={`p-6 rounded-[2.5rem] text-sm shadow-2xl border backdrop-blur-xl ${
                    msg.sender === username 
                      ? 'bg-indigo-600/20 border-indigo-500/30 text-white rounded-tr-none' 
                      : 'bg-white/5 border-white/10 text-slate-300 rounded-tl-none'
                  }`}>
                    <span className="font-medium leading-relaxed tracking-tight">{msg.text}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Interface */}
        <div className="p-8 border-t border-white/10 bg-black/20 backdrop-blur-3xl z-20">
          <div className="flex gap-6 max-w-5xl mx-auto w-full items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Transmission to ${roomId}...`}
                className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 px-10 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all text-sm text-white placeholder:text-slate-600 outline-none shadow-2xl"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20">
                <MessageCircle size={18} className="text-white" />
              </div>
            </div>
            <button
              onClick={handleSend}
              className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-5 rounded-[2rem] hover:scale-105 active:scale-95 transition-all shadow-[0_15px_30px_rgba(79,70,229,0.3)] group"
            >
              <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </button>
          </div>
          <div className="mt-6 flex justify-center items-center gap-8 opacity-20">
             <div className="h-[1px] flex-1 bg-white/10"></div>
             <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.6em]">
               Neural Collaboration Sync Active
             </div>
             <div className="h-[1px] flex-1 bg-white/10"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
