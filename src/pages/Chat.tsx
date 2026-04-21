import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { createChatSession, getChatSessions, saveChatMessage, getChatMessages, deleteChatSession } from '../lib/firebase';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, MessageSquare, Plus, History, Trash2, ChevronRight, PanelLeftClose, PanelLeftOpen, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { askGemini, generateChatTitle, extractQuestionFromImage } from '../services/ai';

export default function Chat() {
  const { documents, user } = useStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ sender: 'ai' | 'user', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load session list on mount
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  // Load messages when active session changes
  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([{ sender: 'ai', text: "Hello! I'm your XAM.AI Tutor. Upload some materials and I can help you understand them deeply." }]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const loadSessions = async () => {
    if (!user) return;
    const res = await getChatSessions(user.id);
    setSessions(res);
  };

  const loadMessages = async (sid: string) => {
    const msgs = await getChatMessages(sid);
    setMessages(msgs.map((m: any) => ({ sender: m.sender, text: m.text })));
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([{ sender: 'ai', text: "Hello! I'm your XAM.AI Tutor. Upload some materials and I can help you understand them deeply." }]);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    await deleteChatSession(sid);
    if (activeSessionId === sid) {
      startNewChat();
    }
    loadSessions();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Image too large. Max 5MB.");
        return;
      }

      setIsProcessingImage(true);
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          const extractedText = await extractQuestionFromImage(base64);
          if (extractedText) {
            setInput(prev => prev ? `${prev}\n\n${extractedText}` : extractedText);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Image processing failed:", error);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!user) return;

    if (documents.length === 0) {
      setMessages(prev => [...prev, 
        { sender: 'user', text: input },
        { sender: 'ai', text: "Please upload some study materials first so I can provide accurate answers based on your curriculum!" }
      ]);
      setInput('');
      return;
    }

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      let currentSessionId = activeSessionId;

      // Create session if it doesn't exist
      if (!currentSessionId) {
        const title = await generateChatTitle(userMsg);
        currentSessionId = await createChatSession(user.id, title);
        setActiveSessionId(currentSessionId);
        loadSessions(); // Refresh sidebar
      }

      // Save user message
      await saveChatMessage(currentSessionId, userMsg, 'user');

      const context = documents.map(d => d.content).join('\n\n');
      const response = await askGemini(context, userMsg);
      const aiResponse = response || "I'm sorry, I couldn't process that.";
      
      // Save AI message
      await saveChatMessage(currentSessionId, aiResponse, 'ai');
      
      setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { sender: 'ai', text: "Something went wrong. Please check your connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl overflow-hidden relative">
      
      {/* Sidebar - Chat History */}
      <motion.div 
        animate={{ width: sidebarOpen ? 300 : 0 }}
        className={`bg-black/20 border-r border-white/10 flex flex-col transition-all duration-300 relative overflow-hidden`}
      >
        <div className="p-6 flex flex-col h-full w-[300px]">
          <button 
            onClick={startNewChat}
            className="flex items-center gap-3 w-full bg-indigo-600/20 border border-indigo-500/30 text-white rounded-2xl py-3 px-4 hover:bg-indigo-600/30 transition-all font-black uppercase text-[10px] tracking-widest mb-8 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <History className="w-3 h-3" />
              Recent Synthesis
            </div>
            {sessions.map(s => (
              <div 
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`group flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer border ${
                  activeSessionId === s.id 
                    ? 'bg-indigo-600/20 border-indigo-400/50 text-white shadow-lg' 
                    : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeSessionId === s.id ? 'text-indigo-400' : 'text-slate-600'}`} />
                  <span className="text-[11px] font-bold truncate leading-none uppercase tracking-tight">{s.title}</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -left-3 top-24 z-50 bg-black/40 border border-white/10 text-slate-400 p-1.5 rounded-full hover:text-white transition-all backdrop-blur-xl"
        >
          {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
        </button>

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Bot className="text-white w-7 h-7" />
            </div>
            <div>
              <div className="font-black text-white tracking-tight uppercase text-sm">Neural Tutor v3</div>
              <div className="text-[10px] text-indigo-400 font-bold flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                Connected to {documents.length} Vectors
              </div>
            </div>
          </div>
          <div className="hidden md:flex bg-white/5 border border-white/10 text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] items-center gap-2">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Explainable AI
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth scrollbar-hide"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-40">
              <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 transform -rotate-6 shadow-2xl">
                 <MessageSquare className="w-12 h-12 text-indigo-400" />
              </div>
              <p className="text-sm font-bold text-slate-500 max-w-xs uppercase tracking-[0.3em] leading-loose">Initialize deep learning synthesis to begin.</p>
            </div>
          )}
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] p-5 rounded-[2rem] shadow-2xl border backdrop-blur-md ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600/20 border-indigo-400/30 text-white rounded-tr-none' 
                    : 'bg-white/10 border-white/10 text-slate-200 rounded-tl-none'
                }`}>
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] rounded-tl-none flex items-center gap-4">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Synchronizing Knowledge...</span>
                </div>
              </motion.div>
            )}
            {isProcessingImage && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-[2rem] rounded-tl-none flex items-center gap-4">
                  <ImageIcon className="w-5 h-5 animate-pulse text-indigo-400" />
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Extracting Question from Image...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div className="p-8 bg-white/5 border-t border-white/10 backdrop-blur-xl">
          <div className="relative group max-w-4xl mx-auto w-full">
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="absolute left-3 top-3 bottom-3 text-slate-500 hover:text-indigo-400 p-2 rounded-xl transition-colors z-10"
              title="Upload image for OCR"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={documents.length === 0 ? "Upload materials to unlock tutor..." : "Synthesize your query..."}
              className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-5 px-16 pr-20 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || (documents.length === 0 && !activeSessionId)}
              className="absolute right-3 top-3 bottom-3 bg-indigo-600 text-white px-6 rounded-2xl hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 shadow-[0_10px_20px_rgba(79,70,229,0.3)]"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 flex justify-center items-center gap-6 opacity-30">
             <div className="h-[1px] flex-1 bg-white/10 hidden sm:block"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Subspace RAG Search Enabled</span>
             <div className="h-[1px] flex-1 bg-white/10 hidden sm:block"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
