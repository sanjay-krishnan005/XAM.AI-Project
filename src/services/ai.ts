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

  const response = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: `Context: ${context}\n\nQuestion: ${question}` }
    ]
  });

  return response.choices[0]?.message?.content || "";
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

  const response = await groq.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Difficulty: ${difficulty}\n\nText: ${context}` }
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

  const response = await groq.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate 8 high-impact study flashcards based on this context: ${context}. Focus on definitions, key concepts, and critical relationships.` }
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
