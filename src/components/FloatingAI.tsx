import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { MessageCircle, X, Send, Minimize2, Loader2, Sparkles, Bot, FileText, Target, Award, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { askAssistantWithContext } from '../services/ai';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export default function FloatingAI() {
  const { user, documents, quizHistory, recommendations } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', sender: 'ai', text: "Hi! I'm XAM.AI Assistant. Ask me anything - about your studies, coding, concepts, or just chat!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const userContext = {
        name: user?.name || 'User',
        level: user?.level || 1,
        xp: user?.xp || 0,
        documentsCount: documents.length,
        documents: documents.map(d => ({ name: d.name, summary: d.summary })),
        quizHistory: quizHistory.slice(-5).map(q => ({ score: q.score, topic: q.topic, date: q.date })),
        recommendations: recommendations.map(r => ({ title: r.title, type: r.type }))
      };
      
      const response = await askAssistantWithContext(userMsg, userContext);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'ai', 
        text: response 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'ai', 
        text: "I couldn't process that. Try again in a moment." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button - Bottom Right */}
      <motion.button
        onClick={() => setIsOpen(true)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`fixed bottom-6 right-6 z-50 group ${isOpen ? 'hidden' : 'flex'}`}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-75 group-hover:opacity-100 animate-pulse"></div>
          <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20 hover:scale-110 transition-transform">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#020617] animate-bounce"></div>
        </div>
      </motion.button>

      {/* Chat Window - Bottom Right */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-80 md:w-96 bg-[#0a0a1a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header with User Stats */}
            <div className="bg-gradient-to-r from-indigo-600/20 to-fuchsia-600/20 p-3 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">XAM Assistant</div>
                    <div className="text-[10px] flex items-center gap-1 text-indigo-400">
                      <Sparkles className="w-3 h-3" />
                      Knows your progress
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <Minimize2 className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => { setIsOpen(false); setMessages([{ id: '0', sender: 'ai', text: "Hi! I'm your XAM.AI Assistant. Ask me about your progress, materials, or anything else!" }]); }}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
              {/* Quick Stats */}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-400" />
                  <span>L{user?.level || 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-indigo-400" />
                  <span>{documents.length} docs</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-400" />
                  <span>{quizHistory.length} quizzes</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="h-72 overflow-y-auto p-4 space-y-4 scrollbar-hide"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600/30 border border-indigo-400/30 text-white rounded-br-none'
                      : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                  }`}>
                    <div className="markdown-body prose prose-invert prose-sm">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span className="text-[10px] text-slate-500">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}