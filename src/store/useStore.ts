import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  xp: number;
  level: number;
  badges: string[];
}

interface Document {
  id: string;
  name: string;
  content: string;
  summary?: string;
  keyTopics?: string[];
}

interface AppState {
  user: User | null;
  documents: Document[];
  quizHistory: QuizResult[];
  recommendations: Recommendation[];
  studyPlan: StudyPlan | null;
  motivation: string;
  setUser: (user: User | null) => void;
  setDocuments: (docs: Document[]) => void;
  setQuizHistory: (history: QuizResult[]) => void;
  addDocument: (doc: Document) => void;
  updateDocumentSummary: (docId: string, summary: string, keyTopics: string[]) => void;
  deleteDocument: (docId: string) => void;
  addQuizResult: (result: QuizResult) => void;
  addXp: (amount: number) => void;
  setRecommendations: (recs: Recommendation[], plan: StudyPlan, motivation: string) => void;
  clearRecommendations: () => void;
}

interface QuizResult {
  id: string;
  score: number;
  date: string;
  topic: string;
}

interface Recommendation {
  type: 'flashcard' | 'review' | 'practice' | 'next_level';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

interface StudyPlan {
  focusAreas: string[];
  suggestedDuration: string;
  nextQuizDifficulty: 'easy' | 'medium' | 'hard';
}

interface AppState {
  user: User | null;
  documents: Document[];
  quizHistory: QuizResult[];
  recommendations: Recommendation[];
  studyPlan: StudyPlan | null;
  motivation: string;
  setUser: (user: User | null) => void;
  setDocuments: (docs: Document[]) => void;
  setQuizHistory: (history: QuizResult[]) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (docId: string) => void;
  addQuizResult: (result: QuizResult) => void;
  addXp: (amount: number) => void;
  setRecommendations: (recs: Recommendation[], plan: StudyPlan, motivation: string) => void;
  clearRecommendations: () => void;
}

export const useStore = create<AppState>()(
  (set) => ({
    user: null,
    documents: [],
    quizHistory: [],
    recommendations: [],
    studyPlan: null,
    motivation: "",
    setUser: (user) => set({ user }),
    setDocuments: (documents) => set({ documents }),
    setQuizHistory: (quizHistory) => set({ quizHistory }),
    addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
    updateDocumentSummary: (docId, summary, keyTopics) => set((state) => ({
      documents: state.documents.map(doc => 
        doc.id === docId ? { ...doc, summary, keyTopics } : doc
      )
    })),
    deleteDocument: (docId) => set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== docId)
    })),
    addQuizResult: (result) => set((state) => ({ quizHistory: [...state.quizHistory, result] })),
    addXp: (amount) => set((state) => {
      if (!state.user) return state;
      const newXp = state.user.xp + amount;
      const newLevel = Math.floor(newXp / 1000) + 1;
      return {
        user: { ...state.user, xp: newXp, level: newLevel }
      };
    }),
    setRecommendations: (recommendations, studyPlan, motivation) => set({ 
      recommendations, 
      studyPlan, 
      motivation 
    }),
    clearRecommendations: () => set({ 
      recommendations: [], 
      studyPlan: null, 
      motivation: "" 
    }),
  })
);
