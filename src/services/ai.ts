import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function askGemini(context: string, question: string) {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `You are an AI Education Assistant. Knowledge base is provided below. 
  Answer only based on the context. If the answer isn't in context, say you don't know based on the materials.
  Include source citations as [Source segment]. 
  Provide a confidence score (0-100%).
  
  Format:
  Answer: [Your answer]
  Confidence: [Score]%
  Citations: [List sources]`;

  const response = await ai.models.generateContent({
    model,
    contents: `Context: ${context}\n\nQuestion: ${question}`,
    config: { systemInstruction },
  });

  return response.text;
}

export async function generateChatTitle(firstMessage: string) {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Summarize this message into a short 2-4 word chat title: "${firstMessage}"`,
  });

  return response.text?.replace(/["']/g, '').trim() || "New Chat";
}

export async function generateQuiz(context: string, difficulty: 'easy' | 'medium' | 'hard') {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Generate 5 multiple choice questions based on this text at ${difficulty} level: ${context}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export async function evaluateAnswer(question: string, correctAnswer: string, userAnswer: string) {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `You are an AI Grader. Use semantic similarity.
  Provide feedback and a score 0-100.
  If wrong, highlight why and provide the correct concept explanation.`;

  const response = await ai.models.generateContent({
    model,
    contents: `Question: ${question}\nExpected: ${correctAnswer}\nUser: ${userAnswer}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          isCorrect: { type: Type.BOOLEAN },
          conceptExplanation: { type: Type.STRING }
        },
        required: ["score", "feedback", "isCorrect", "conceptExplanation"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function extractQuestionFromImage(base64Image: string) {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { text: "Extract the question from this image and solve it step-by-step." },
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
      ]
    }
  });
  return response.text;
}

export async function generateFlashcards(context: string) {
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Generate 8 high-impact study flashcards based on this context: ${context}. Focus on definitions, key concepts, and critical relationships.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING, description: "The term or question" },
            back: { type: Type.STRING, description: "The definition or answer" },
            hint: { type: Type.STRING, description: "A subtle hint for the cognitive link" },
            category: { type: Type.STRING, description: "The conceptual category" }
          },
          required: ["front", "back", "hint", "category"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}
