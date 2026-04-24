import React from 'react';
import { useStore } from '../store/useStore';
import { FileText, Zap, TrendingUp, Clock, Trophy, Trash2, Target, Flame, Award, LogIn, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { deleteDocument } from '../lib/firebase';

export default function Dashboard() {
  const { documents, quizHistory, user, deleteDocument: deleteFromStore } = useStore();

  // Calculate study streak from all activities: quizzes, docs uploads, logins
  const calculateStreak = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Collect all activity timestamps
    const allActivities: { date: Date; type: string }[] = [];
    
    // Add quiz dates
    quizHistory.forEach(q => {
      allActivities.push({ date: new Date(q.date), type: 'quiz' });
    });
    
    // Add document upload dates (approximate from content length - stored locally)
    documents.forEach(d => {
      // We don't have upload timestamp locally, but assume they're recent
      // So we count docs as activity indicator
      if (allActivities.length === 0) {
        allActivities.push({ date: new Date(), type: 'doc' });
      }
    });
    
    if (allActivities.length === 0) return { days: 0, label: 'Start learning!' };
    
    // Sort by date descending
    const sorted = allActivities.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Check if there's activity today or yesterday
    const latestDate = new Date(sorted[0].date);
    latestDate.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    // Calculate consecutive days
    let streak = 0;
    let checkDate = new Date(today);
    
    for (let i = 0; i < 30; i++) {
      const hasActivity = sorted.some(a => {
        const activityDate = new Date(a.date);
        activityDate.setHours(0, 0, 0, 0);
        return activityDate.getTime() === checkDate.getTime();
      });
      
      if (hasActivity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Check yesterday if no activity today
        checkDate.setDate(checkDate.getDate() - 1);
        const hasYesterday = sorted.some(a => {
          const activityDate = new Date(a.date);
          activityDate.setHours(0, 0, 0, 0);
          return activityDate.getTime() === checkDate.getTime();
        });
        if (!hasYesterday) break;
      } else {
        break;
      }
    }
    
    if (streak === 0) {
      // Has activity but not consecutive - might be first day or gap
      const hasRecent = sorted.some(a => {
        const daysDiff = Math.floor((today.getTime() - a.date.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 1;
      });
      if (hasRecent) return { days: 1, label: '1 Day' };
      return { days: 0, label: 'No activity' };
    }
    if (streak === 1) return { days: 1, label: '1 Day' };
    return { days: streak, label: `${streak} Days` };
  };

  const streak = calculateStreak();
  
  // Calculate average quiz score
  const avgScore = quizHistory.length > 0
    ? Math.round(quizHistory.reduce((sum, q) => sum + (typeof q.score === 'number' ? q.score : parseInt(q.score) || 0), 0) / quizHistory.length)
    : 0;

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (confirm(`Delete "${docName}"? This action cannot be undone.`)) {
      try {
        if (user) {
          await deleteDocument(user.id, docName);
        }
        deleteFromStore(docId);
      } catch (error) {
        console.error('Failed to delete document:', error);
        alert('Failed to delete document');
      }
    }
  };

  const stats = [
    { label: 'Study XP', value: user?.xp || 0, icon: Zap, color: 'text-orange-500', progress: Math.min(((user?.xp || 0) / (user?.level || 1) / 100), 100) },
    { label: 'Materials', value: documents.length, icon: FileText, color: 'text-blue-500', progress: Math.min(documents.length * 20, 100) },
    { label: 'Avg Score', value: `${avgScore}%`, icon: Target, color: 'text-emerald-500', progress: avgScore },
    { label: 'Streak', value: streak.label, icon: Flame, color: 'text-amber-500', progress: Math.min(streak.days * 25, 100) },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl"
          >
            <div className={`text-xs font-bold uppercase tracking-widest ${stat.color.replace('text-', 'text-opacity-70 text-')} mb-3 opacity-60`}>
               {stat.label}
            </div>
            <div className="flex items-center justify-between">
               <div className="text-3xl font-bold text-white">{stat.value}</div>
               <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
            </div>
<div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
               <div 
                 className={`h-full ${stat.color.replace('text-', 'bg-')} shadow-[0_0_8px_rgba(255,255,255,0.3)]`} 
                 style={{ width: `${stat.progress}%` }}
               />
             </div>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Recent Materials */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            SYNCHRONIZED MATERIALS
          </h2>
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-md p-16 rounded-3xl text-center border border-white/10 shadow-inner">
                <FileText className="w-16 h-16 text-slate-700 mx-auto mb-6 opacity-40" />
                <p className="text-slate-500 font-medium tracking-tight">Your knowledge base is empty. Upload a neural seed.</p>
              </div>
            ) : (
              documents.slice(-5).reverse().map((doc) => (
                <div 
                  key={doc.id}
                  className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all shadow-lg backdrop-blur-sm"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all flex-shrink-0">
                      <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">{doc.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{doc.content.length} VECTORS STORED</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <Zap className="w-4 h-4 text-indigo-400" />
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.name)}
                      className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 hover:bg-red-500/40 transition-all hover:scale-110 active:scale-95"
                      title="Delete material"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Level Progress */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">COGNITIVE EVOLUTION</h2>
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex items-center justify-between relative z-10">
              <div>
                <div className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-[0.1em] mb-1">Aura Tier</div>
                <div className="text-2xl font-black text-white">Lvl {user?.level} Sage</div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500/20 to-fuchsia-500/20 rounded-2xl flex items-center justify-center border border-white/20">
                <Trophy className="w-6 h-6 text-fuchsia-400" />
              </div>
            </div>
            
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between text-[11px] font-bold uppercase">
                <span className="text-slate-400">Next Ascension</span>
                <span className="text-fuchsia-400">{1000 - ((user?.xp || 0) % 1000)} XP</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.4)]" 
                  style={{ width: `${(user?.xp || 0) % 1000 / 10}%` }}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 relative z-10">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">Neural Badges</div>
              <div className="flex gap-3">
                {user?.badges.length === 0 ? (
                  <div className="text-xs text-slate-500 italic font-light">Initiate deep analysis to unlock rewards.</div>
                ) : (
                  user?.badges.map(b => (
                    <div key={b} className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
                      <span className="grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all text-xl">🏅</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
