# XAM.AI - AI-Powered Study Platform

An AI-powered learning platform with document analysis, AI tutoring, flashcards, quizzes, and progress tracking.

## Features

- **AI Tutor** - Chat with your uploaded materials using AI
- **Flashcards** - Auto-generate study cards from documents
- **Quizzes** - Generate quizzes to test your knowledge
- **Progress Tracking** - Track XP, level, scores, and streaks
- **Multi-Document** - Select specific materials for study sessions
- **Floating Assistant** - Context-aware AI helper

## Tech Stack

- React 19 + TypeScript
- Vite
- TailwindCSS
- Zustand (state)
- Groq API (AI)
- Firebase (Auth + Firestore)
- Motion (animations)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Add your API keys to `.env`:
- `GEMINI_API_KEY` - For Gemini AI
- `VITE_GROQ_API_KEY` - For Groq AI

4. Run locally:
```bash
npm run dev
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 19, TypeScript |
| Styling | TailwindCSS |
| State | Zustand |
| AI | Groq SDK |
| Database | Firebase Firestore |
| Auth | Firebase Auth |

## Project Structure

```
src/
├── App.tsx          # Main app
├── components/      # Reusable components
├── pages/          # Page components
├── services/       # AI functions
├── store/         # State management
└── lib/          # Utilities
```

## License

MIT