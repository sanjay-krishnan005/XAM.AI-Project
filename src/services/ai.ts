import Groq from "groq-sdk";

const groq = new Groq({ 
  apiKey: import.meta.env.VITE_GROQ_API_KEY || "", 
  dangerouslyAllowBrowser: true 
});

export async function askGemini(context: string, question: string) {
  const model = "llama-3.1-8b-instant";
  const systemInstruction = `You are an AI Education Assistant. Knowledge base is provided below. 
Answer only based on the context. If the answer isn't in context, say you don't know based on the materials.
Include source citations as [Source segment]. 
Provide a confidence score (0-100%).

Format:
Answer: [Your answer]
Confidence: [Score]%
Citations: [List sources]`;

  const safeContext = context.substring(0, 4000);
  const response = await groq.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: `Context: ${safeContext}\n\nQuestion: ${question}` }
    ]
  });

  return response.choices[0]?.message?.content || "";
}

export async function summarizeDocument(docName: string, content: string) {
  const model = "llama-3.1-8b-instant";
  const systemPrompt = `You are a document analyzer. Create a concise summary of the document.
Return ONLY valid JSON with this schema:
{
  "summary": "2-3 sentence summary of the key content",
  "keyTopics": ["topic1", "topic2", "topic3"]
}`;

  const safeContent = content.substring(0, 8000);
  const response = await groq.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Document: ${docName}\n\n${safeContent}` }
    ]
  });

  try {
    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch(e) {
    return { summary: "Could not generate summary", keyTopics: [] };
  }
}

interface UserContext {
  name: string;
  level: number;
  xp: number;
  documentsCount: number;
  documents: { name: string; summary?: string }[];
  quizHistory: { score: number; topic: string; date: string }[];
  recommendations: { title: string; type: string }[];
}

export async function askAssistantWithContext(question: string, userContext: UserContext) {
  const model = "llama-3.1-8b-instant";
  
  const quizScores = userContext.quizHistory.length > 0 
    ? userContext.quizHistory.map(q => `${q.topic}: ${q.score}%`).join(', ')
    : 'No quizzes taken yet';
  
  const docList = userContext.documents.length > 0
    ? userContext.documents.map(d => d.name).join(', ')
    : 'No documents uploaded';

  const recList = userContext.recommendations.length > 0
    ? userContext.recommendations.map(r => r.title).join(', ')
    : 'No active recommendations';

  const systemPrompt = `You are XAM.AI - a smart learning assistant that knows the user's progress and performance.
You help users understand their learning journey, suggest next steps, and answer questions about their materials.

User Profile:
- Name: ${userContext.name}
- Level: ${userContext.level} (Level = XP / 1000)
- XP Total: ${userContext.xp} points
- Documents: ${docList}
- Quiz History: ${quizScores}
- Active Recommendations: ${recList}

Guidelines:
- Use the user's stats to give personalized advice
- Reference their documents when relevant
- Celebrate their achievements (high scores, level ups)
- Suggest improvements based on quiz performance
- Keep responses conversational and encouraging
- If they ask about their progress, summarize their stats
- If they ask what to do next, check their recommendations
- Be concise but helpful`;

  const response = await groq.chat.completions.create({
    model,
    max_tokens: 512,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ]
  });

  return response.choices[0]?.message?.content || "I'm here to help! Ask me about your progress or anything else.";
}

export async function askGeneralAI(question: string) {
  const model = "llama-3.1-8b-instant";
  const systemPrompt = `You are XAM.AI Assistant - a helpful, friendly AI tutor.
You're knowledgeable in many subjects: programming, science, math, general knowledge, etc.
Keep responses conversational, clear, and helpful.
Use simple language. Be encouraging.
If you don't know something, say so honestly.

Guidelines:
- Be concise but thorough when needed
- Use formatting (bullets, bold) for clarity
- Match the user's energy level`;

  const response = await groq.chat.completions.create({
    model,
    max_tokens: 512,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ]
  });

  return response.choices[0]?.message?.content || "I couldn't generate a response. Try again!";
}

export async function generateChatTitle(firstMessage: string) {
  const model = "llama-3.1-8b-instant";
  const response = await groq.chat.completions.create({
    model,
    messages: [
      { role: "user", content: `Summarize this message into a short 2-4 word chat title: "${firstMessage}"` }
    ]
  });

  return response.choices[0]?.message?.content?.replace(/["']/g, '').trim() || "New Chat";
}

export async function generateQuiz(context: string, difficulty: 'easy' | 'medium' | 'hard') {
  const model = "llama-3.1-8b-instant";
  const systemPrompt = `You must return a valid JSON object. 
Output a JSON object with a "questions" key containing exactly 5 multiple choice questions.
Schema for each item in the "questions" array:
{
  "question": "string",
  "options": ["string", "string", "string", "string"],
  "correctAnswer": "string (must exactly match one option)",
  "explanation": "string"
}`;

  const safeContext = context.substring(0, 6000);
  const response = await groq.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Difficulty: ${difficulty}\n\nText: ${safeContext}` }
    ]
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    const json = JSON.parse(text);
    return json.questions || [];
  } catch(e) {
    console.error("Failed to parse quiz JSON:", e);
    return [];
  }
}

export async function evaluateAnswer(question: string, correctAnswer: string, userAnswer: string) {
  const model = "llama-3.1-8b-instant";
  const systemPrompt = `You are an AI Grader. Evaluate using semantic similarity. Return a JSON object ONLY.
Schema:
{
  "score": number (0-100),
  "feedback": "string",
  "isCorrect": boolean,
  "conceptExplanation": "string"
}`;

  const response = await groq.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Question: ${question}\nExpected: ${correctAnswer}\nUser: ${userAnswer}` }
    ]
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text);
  } catch(e) {
    console.error("Failed to parse evaluation JSON:", e);
    return {};
  }
}

export async function extractQuestionFromImage(base64Image: string) {
  const model = "llama-3.2-11b-vision-preview";
  // Format as data URL if not already formatted
  const formattedImage = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

  const response = await groq.chat.completions.create({
    model,
    messages: [
      { 
        role: "user", 
        content: [
          { type: "text", text: "Extract the question from this image and solve it step-by-step." },
          { type: "image_url", image_url: { url: formattedImage } }
        ]
      }
    ]
  });
  return response.choices[0]?.message?.content || "";
}

export async function generateFlashcards(context: string) {
  const model = "llama-3.1-8b-instant";
  const systemPrompt = `You must return a valid JSON object. 
Output a JSON object with a "flashcards" key containing an array of 8 flashcards.
Schema for each item in the array:
{
  "front": "string (The term or question)",
  "back": "string (The definition or answer)",
  "hint": "string (A subtle hint)",
  "category": "string"
}`;

  const safeContext = context.substring(0, 10000);
  const response = await groq.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate 8 high-impact study flashcards based on this context: ${safeContext}. Focus on definitions, key concepts, and critical relationships.` }
    ]
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    const json = JSON.parse(text);
    return json.flashcards || [];
  } catch(e) {
    console.error("Failed to parse flashcards JSON:", e);
    return [];
  }
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface UserAnswer {
  option: string;
  isCorrect: boolean;
}

export async function generateRecommendations(
  quizScore: number,
  questions: Question[],
  userAnswers: UserAnswer[],
  userLevel: number
) {
  const model = "llama-3.1-8b-instant";

  const weakAreas = questions
    .filter((_, i) => !userAnswers[i]?.isCorrect)
    .map(q => q.question.slice(0, 150));

  const strongAreas = questions
    .filter((_, i) => userAnswers[i]?.isCorrect)
    .map(q => q.question.slice(0, 100));

  const systemPrompt = `You are an AI Learning Path Advisor.
Analyze quiz performance and provide personalized recommendations.
Return ONLY valid JSON with this schema:
{
  "recommendations": [
    {
      "type": "flashcard" | "review" | "practice" | "next_level",
      "title": "string",
      "description": "string",
      "priority": "high" | "medium" | "low",
      "action": "string (specific action to take)"
    }
  ],
  "studyPlan": {
    "focusAreas": ["string (topics to focus on)"],
    "suggestedDuration": "string (e.g., '15-20 minutes')",
    "nextQuizDifficulty": "easy" | "medium" | "hard"
  },
  "motivation": "string (encouraging message for the user)"
}`;

  const response = await groq.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `
User Level: ${userLevel}
Quiz Score: ${quizScore}%
Strong Areas (answered correctly): ${strongAreas.join(', ') || 'None identified'}
Weak Areas (answered incorrectly): ${weakAreas.join(', ') || 'None identified'}
Analyze this performance and generate personalized learning recommendations.
      `}
    ]
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text);
  } catch(e) {
    console.error("Failed to parse recommendations JSON:", e);
    return { recommendations: [], studyPlan: {}, motivation: "" };
  }
}
