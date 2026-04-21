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
}

interface QuizResult {
  id: string;
  score: number;
  date: string;
  topic: string;
}

interface AppState {
  user: User | null;
  documents: Document[];
  quizHistory: QuizResult[];
  setUser: (user: User | null) => void;
  setDocuments: (docs: Document[]) => void;
  setQuizHistory: (history: QuizResult[]) => void;
  addDocument: (doc: Document) => void;
  addQuizResult: (result: QuizResult) => void;
  addXp: (amount: number) => void;
}

export const useStore = create<AppState>()(
  (set) => ({
    user: null,
    documents: [],
    quizHistory: [],
    setUser: (user) => set({ user }),
    setDocuments: (documents) => set({ documents }),
    setQuizHistory: (quizHistory) => set({ quizHistory }),
    addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
    addQuizResult: (result) => set((state) => ({ quizHistory: [...state.quizHistory, result] })),
    addXp: (amount) => set((state) => {
      if (!state.user) return state;
      const newXp = state.user.xp + amount;
      const newLevel = Math.floor(newXp / 1000) + 1;
      return {
        user: { ...state.user, xp: newXp, level: newLevel }
      };
    }),
  })
);
