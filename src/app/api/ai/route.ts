import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { prompt, context, systemInstruction } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'CONFIG_ERROR', message: 'GEMINI_API_KEY is not set in environment variables.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const fullPrompt = context ? `${context}\n\nTask: ${prompt}` : prompt;
    
    // Default context for the CSC Assistant
    const defaultSysPrompt = "You are a highly professional Customer Service Assistant for Transworld International (Ti) Packing and Moving Company. Keep your answers concise, helpful, and strictly related to logistics, moving, tracking, or resolving customer queries.";
    const sysPrompt = systemInstruction || defaultSysPrompt;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: sysPrompt,
      }
    });

    return NextResponse.json({ result: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // 429 Graceful Fallback
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      return NextResponse.json(
        { error: 'RATE_LIMIT', message: "I am currently processing a high volume of requests. Please give me a minute and try again!" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'AI_ERROR', message: "An error occurred while generating the response. Please try again later." },
      { status: 500 }
    );
  }
}
