import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { prompt, context, systemInstruction, provider } = await request.json();

    // Default context for the CSC Assistant
    const defaultSysPrompt = `You are a highly professional Customer Service Assistant for Transworld International (Ti) Packing and Moving Company. 

Guidelines:
1. Tone: Always remain polite, empathetic, and highly professional. Never argue with a customer or agent.
2. Expertise: Your domain is logistics, packing, moving, shipment tracking, billing, and resolving customer queries.
3. Branding: Always refer to the company as "Transworld Intl" or "Ti".
4. Conciseness: Keep your answers concise, actionable, and straight to the point. Use bullet points for readability when explaining processes.
5. Limitations: If you do not have enough tracking data or job history to answer a question, state clearly that you need more information rather than making up (hallucinating) dates or locations.`;
    const sysPrompt = systemInstruction || defaultSysPrompt;
    const fullPrompt = context ? `${context}\n\nTask: ${prompt}` : prompt;

    // 1. Handle Groq Provider
    if (provider === 'groq') {
      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json(
          { error: 'CONFIG_ERROR', message: 'GROQ_API_KEY is not set in environment variables.' },
          { status: 500 }
        );
      }

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: fullPrompt }
          ],
          temperature: 0.6,
          max_tokens: 1024
        })
      });

      if (!groqResponse.ok) {
        const errData = await groqResponse.json();
        throw new Error(errData.error?.message || 'Groq API Error');
      }

      const groqData = await groqResponse.json();
      return NextResponse.json({ result: groqData.choices[0].message.content });
    }

    // 2. Default to Gemini
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'CONFIG_ERROR', message: 'GEMINI_API_KEY is not set in environment variables.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: sysPrompt,
      }
    });

    return NextResponse.json({ result: response.text });
  } catch (error: any) {
    console.error("AI API Error:", error);
    
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
