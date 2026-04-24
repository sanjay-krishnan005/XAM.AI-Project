import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { generateQuiz, evaluateAnswer, generateRecommendations } from '../services/ai';
import { Brain, CheckCircle2, XCircle, ChevronRight, Loader2, Award, Info, Sparkles, BookOpen, Target, TrendingUp, Heart, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { saveQuizResult, db } from '../lib/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

export default function Quiz() {
  const { documents, addQuizResult, addXp, user, setRecommendations, clearRecommendations, recommendations, studyPlan, motivation } = useStore();
  const [stage, setStage] = useState<'config' | 'loading' | 'active' | 'results'>('config');
  const [recLoading, setRecLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [recStage, setRecStage] = useState<'results_only' | 'recommendations'>('results_only');

  const startQuiz = async () => {
    if (documents.length === 0) return;
    setStage('loading');
    try {
      const context = documents.map(d => d.content).join('\n\n').slice(0, 5000);
      const data = await generateQuiz(context, difficulty);
      setQuestions(data);
      setStage('active');
      setCurrentIdx(0);
      setUserAnswers([]);
    } catch (err) {
      console.error(err);
      setStage('config');
    }
  };

const handleAnswerSelect = async (option: string) => {
    const isCorrect = option === questions[currentIdx].correctAnswer;
    const newUserAnswers = [...userAnswers, { option, isCorrect }];
    setUserAnswers(newUserAnswers);
    
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      if (!user) return;
      const score = Math.round((newUserAnswers.filter(a => a.isCorrect).length) / questions.length * 100);
      const xpGained = score * 2;
      
      const resData = {
        score,
        topic: 'General Review',
      };

      await saveQuizResult(user.id, resData);
      
      const userRef = doc(db, "users", user.id);
      const newXp = user.xp + xpGained;
      const newLevel = Math.floor(newXp / 1000) + 1;
      
      await updateDoc(userRef, {
        xp: increment(xpGained),
        level: newLevel,
        updatedAt: serverTimestamp()
      });

      addQuizResult({
        id: Date.now().toString(),
        ...resData,
        date: new Date().toISOString()
      });
      addXp(xpGained);
      
      setRecLoading(true);
      try {
        const recData = await generateRecommendations(score, questions, newUserAnswers, user.level);
        if (recData.recommendations) {
          setRecommendations(
            recData.recommendations,
            recData.studyPlan || { focusAreas: [], suggestedDuration: '15-20 minutes', nextQuizDifficulty: 'medium' },
            recData.motivation || "Great effort! Keep learning!"
          );
        }
      } catch (err) {
        console.error("Failed to generate recommendations:", err);
      }
      setRecLoading(false);
      setStage('results');
    }
  };

  if (stage === 'config') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl rotate-3 relative z-10 border border-white/20">
          <Brain className="text-white w-14 h-14" />
        </div>
        <div className="space-y-4 relative z-10">
          <h2 className="text-4xl font-black text-white tracking-tight uppercase">Cognitive Probe</h2>
          <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">Synthesize knowledge vectors and calibrate your intellectual baseline using AI-generated matrices.</p>
        </div>

        <div className="flex justify-center gap-3 relative z-10">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-8 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all border ${
                difficulty === d 
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                  : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <button 
          onClick={startQuiz}
          disabled={documents.length === 0}
          className="w-full bg-white text-neutral-950 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.03] active:scale-[0.97] transition-all shadow-2xl shadow-white/5 disabled:opacity-20 relative z-10"
        >
          {documents.length === 0 ? 'Vectors Required' : 'Initialize Matrix'}
        </button>
      </div>
    );
  }

  if (stage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-8">
        <div className="relative">
           <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
           <Loader2 className="w-16 h-16 text-indigo-400 animate-spin relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <div className="text-xl font-black text-white tracking-widest uppercase italic animate-pulse">Fabricating Matrix</div>
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">Querying High-Dimensional Vector Space...</div>
        </div>
      </div>
    );
  }

  if (stage === 'results') {
    const finalScore = Math.round(userAnswers.filter(a => a.isCorrect).length / questions.length * 100);
    
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return 'border-red-500/30 bg-red-500/5';
        case 'medium': return 'border-amber-500/30 bg-amber-500/5';
        default: return 'border-emerald-500/30 bg-emerald-500/5';
      }
    };

    const getIcon = (type: string) => {
      switch (type) {
        case 'flashcard': return <Brain className="w-5 h-5 text-fuchsia-400" />;
        case 'review': return <BookOpen className="w-5 h-5 text-indigo-400" />;
        case 'practice': return <Target className="w-5 h-5 text-amber-400" />;
        case 'next_level': return <TrendingUp className="w-5 h-5 text-emerald-400" />;
        default: return <Sparkles className="w-5 h-5 text-indigo-400" />;
      }
    };

    return (
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] backdrop-blur-xl text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]"></div>
          <div className="w-24 h-24 bg-emerald-500/20 rounded-3xl mx-auto flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <Award className="w-12 h-12 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Assessment Success</h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Matrix sync yield: <span className="text-indigo-400">+{finalScore * 2} XP</span> processed.</p>
          </div>
          <div className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">{finalScore}%</div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => { clearRecommendations(); setStage('config'); }}
              className="flex-1 bg-white/10 border border-white/20 text-white py-4 rounded-[2rem] font-bold uppercase tracking-[0.2em] text-xs hover:bg-white/20 transition-all"
            >
              Review & Continue
            </button>
            <button 
              onClick={() => setRecStage('recommendations')}
              disabled={recLoading}
              className="flex-1 bg-indigo-600 text-white py-4 rounded-[2rem] font-bold uppercase tracking-[0.2em] text-xs hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
            >
              {recLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              View Recommendations
            </button>
          </div>
        </div>

        {recStage === 'recommendations' && recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 border border-white/10 p-8 rounded-[3rem] backdrop-blur-xl">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-indigo-400" />
                Your Learning Path
              </h3>
              
              <div className="space-y-4">
                {recommendations.map((rec, i) => (
                  <div 
                    key={i} 
                    className={`p-6 rounded-[2rem] border ${getPriorityColor(rec.priority)} transition-all hover:scale-[1.02]`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                        {getIcon(rec.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full ${
                            rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            rec.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {rec.priority} Priority
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1">{rec.title}</h4>
                        <p className="text-slate-400 text-sm">{rec.description}</p>
                        <p className="text-indigo-300 text-xs mt-2 font-medium">{rec.action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {studyPlan && (
                <div className="mt-6 p-6 bg-white/5 rounded-[2rem] border border-white/10">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Study Plan</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Duration</div>
                        <div className="text-sm font-bold text-white">{studyPlan.suggestedDuration}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Next Level</div>
                        <div className="text-sm font-bold text-white capitalize">{studyPlan.nextQuizDifficulty}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {motivation && (
                <div className="mt-6 p-6 bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 rounded-[2rem] border border-indigo-500/20">
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-fuchsia-400" />
                    <p className="text-slate-300 font-medium italic">"{motivation}"</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="space-y-6">
          <h3 className="font-black text-slate-500 flex items-center gap-3 uppercase tracking-[0.3em] text-xs px-2">
            <Info className="w-4 h-4 text-indigo-400" />
            XAI NEURAL RECONSTRUCTION
          </h3>
          <div className="grid gap-4">
            {questions.map((q, i) => (
              <div key={i} className={`p-6 rounded-[2rem] border backdrop-blur-sm transition-all hover:bg-white/5 ${userAnswers[i]?.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Question {i + 1}</div>
                  {userAnswers[i]?.isCorrect ? <CheckCircle2 className="text-emerald-400 w-5 h-5" /> : <XCircle className="text-red-400 w-5 h-5" />}
                </div>
                <p className="text-base text-slate-200 font-semibold leading-relaxed mb-6">{q.question}</p>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Subjective Response</span>
                    <span className={`text-sm font-bold ${userAnswers[i]?.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>{userAnswers[i]?.option}</span>
                  </div>
                  {!userAnswers[i]?.isCorrect && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Correct Invariant</span>
                      <span className="text-sm font-bold text-indigo-300">{q.correctAnswer}</span>
                    </div>
                  )}
                  <div className="mt-6 p-5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <div className="text-[9px] font-black mb-3 uppercase tracking-[0.3em] text-indigo-300">XAI Logic Rationale</div>
                    <p className="text-xs text-slate-400 italic leading-relaxed font-medium">"{q.explanation}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="flex justify-between items-center bg-white/5 border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
            {currentIdx + 1}
          </div>
          <div className="hidden sm:block">
             <div className="h-1.5 w-48 bg-white/5 rounded-full overflow-hidden border border-white/10">
               <div 
                 className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                 style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
               />
             </div>
          </div>
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Task {currentIdx + 1} of {questions.length}</span>
      </div>

      <motion.div
        key={currentIdx}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-xl shadow-2xl space-y-12 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <h3 className="text-3xl font-bold leading-tight text-white relative z-10">{q.question}</h3>
        
        <div className="grid gap-4 relative z-10">
          {q.options.map((opt: string) => (
            <button
              key={opt}
              onClick={() => handleAnswerSelect(opt)}
              className="group w-full p-6 text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-between shadow-lg"
            >
              <span className="text-lg font-semibold text-slate-300 group-hover:text-white transition-colors">{opt}</span>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-indigo-400 group-hover:bg-indigo-500/10 transition-all">
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
