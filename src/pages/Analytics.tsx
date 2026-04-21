import React from 'react';
import { useStore } from '../store/useStore';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Activity, Target, Brain, Award } from 'lucide-react';

export default function Analytics() {
  const { quizHistory } = useStore();

  const data = quizHistory.map(h => ({
    date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: h.score,
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-12">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="font-black text-xl text-white flex items-center gap-3 uppercase tracking-tighter">
                <Activity className="text-indigo-400 w-6 h-6" />
                Cognitive Retention Trend
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Matrix Analysis Stream</p>
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">Synced Live</div>
          </div>
          <div className="h-[300px] min-h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%" minHeight={300} debounce={50}>
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(2, 6, 23, 0.8)', 
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} 
                  itemStyle={{ color: '#818cf8' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#818cf8" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#020617', strokeWidth: 3, stroke: '#818cf8' }}
                  activeDot={{ r: 10, strokeWidth: 0, fill: '#c084fc' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-black text-xl mb-10 text-white flex items-center gap-3 uppercase tracking-tighter">
              <Target className="text-fuchsia-400 w-6 h-6" />
              Topic Mastery
            </h3>
            <div className="space-y-8">
              {[
                { name: 'RAG Efficiency', val: 85, color: 'from-indigo-500 to-indigo-400' },
                { name: 'Retention Rate', val: 62, color: 'from-fuchsia-500 to-fuchsia-400' },
                { name: 'Logic Depth', val: 45, color: 'from-teal-500 to-emerald-400' },
              ].map((item, i) => (
                <div key={item.name} className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <span>{item.name}</span>
                    <span className="text-white">{item.val}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${item.color} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} 
                      style={{ width: `${item.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 mt-10">
            <div className="bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 p-5 rounded-2xl flex items-center gap-5 border border-white/5">
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                 <Brain className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Recommended Node</div>
                <div className="text-sm font-bold text-white">Neural Architectures</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {[
          { label: 'Sync Accuracy', value: quizHistory.length ? Math.round(quizHistory.reduce((a, b) => a + b.score, 0) / quizHistory.length) + '%' : 'N/A', icon: Target, color: 'text-indigo-400' },
          { label: 'Matrix Probes', value: quizHistory.length, icon: Activity, color: 'text-fuchsia-400' },
          { label: 'Logic Gaps', value: '2 Nodes', icon: Brain, color: 'text-teal-400' },
          { label: 'Global Rank', value: '#402', icon: Award, color: 'text-amber-400' },
        ].map((item, i) => (
          <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md shadow-xl hover:bg-white/10 transition-all cursor-crosshair group">
            <item.icon className={`w-5 h-5 ${item.color} mb-4 opacity-60 group-hover:opacity-100 transition-all`} />
            <div className="text-2xl font-black text-white tracking-tighter">{item.value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mt-2">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
