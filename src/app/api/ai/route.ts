import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export async function POST(request: Request) {
  try {
    const { prompt, context, systemInstruction, provider, trackingJobNumber } = await request.json();

    // Fetch dynamic system prompt from Supabase
    const supabaseAdmin = getSupabaseAdmin();
    const { data: aiSettings } = await supabaseAdmin.from('ai_settings').select('system_prompt').eq('id', 1).single();

    // Fallback default context if DB fetch fails
    const fallbackSysPrompt = `You are a highly professional Customer Service Assistant for Transworld International (Ti) Packing and Moving Company. 

Guidelines:
1. Tone: Always remain polite, empathetic, and highly professional. Never argue with a customer or agent.
2. Expertise: Your domain is logistics, packing, moving, shipment tracking, billing, and resolving customer queries.
3. Branding: Always refer to the company as "Transworld Intl" or "Ti".
4. Conciseness: Keep your answers concise, actionable, and straight to the point. Use bullet points for readability when explaining processes.
5. Limitations: If you do not have enough tracking data or job history to answer a question, state clearly that you need more information rather than making up (hallucinating) dates or locations.`;
    
    const sysPrompt = systemInstruction || aiSettings?.system_prompt || fallbackSysPrompt;

    let augmentedContext = context || '';

    // If on a public tracking page, fetch the specific job context and timelines
    if (trackingJobNumber) {
      const { data: job } = await supabaseAdmin
        .from('jobs')
        .select('*')
        .eq('job_number', trackingJobNumber)
        .single();

      if (job) {
        const { data: trackData } = await supabaseAdmin
          .from('job_shipment_track')
          .select('*')
          .eq('job_number', trackingJobNumber)
          .order('date', { ascending: true });

        const trackHistory = trackData && trackData.length > 0
          ? trackData.map((t: any) => `[${t.date}] ${t.location}: ${t.remark}`).join('\n')
          : "No transit checkpoints registered yet.";

        const jobInfoContext = `
[CURRENT SHIPMENT DETAILS (DO NOT ASK USER FOR THESE - THEY ARE ALREADY LOADED)]
Job Number: ${job.job_number}
Customer Name: ${job.customer_name}
Company: ${job.company || 'Private'}
Origin: ${job.origin}
Destination: ${job.destination}
Goods Type: ${job.goods_type}
Shipment Status: ${job.goods_track_status}
Actual Delivery Date: ${job.actual_delivery || 'Not delivered yet'}
Transit Checkpoints Logged:
${trackHistory}
`;
        augmentedContext = augmentedContext ? `${augmentedContext}\n\n${jobInfoContext}` : jobInfoContext;
      }
    }

    const fullPrompt = augmentedContext ? `${augmentedContext}\n\nTask: ${prompt}` : prompt;

    // 1. Handle Groq Provider
    if (provider === 'groq') {
      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json(
          { error: 'CONFIG_ERROR', message: 'GROQ_API_KEY is not set in environment variables.' },
          { status: 500 }
        );
      }

      let messagesArray: any[] = [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: fullPrompt }
      ];

      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messagesArray,
          tools: [
            {
              type: "function",
              function: {
                name: "search_database",
                description: "Search the database for a customer's shipment or job details using a search query (name, job number, etc.). Use this when the user asks about a specific person or shipment.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { 
                      type: "string", 
                      description: "The core search term. Extract ONLY the name of the person/company (e.g. 'Samir Verma') or the job number (e.g. 'JB/123'). Do NOT include descriptive words like 'shipment', 'job', 'details', 'status'." 
                    }
                  },
                  required: ["query"]
                }
              }
            }
          ],
          tool_choice: "auto",
          temperature: 0.6,
          max_tokens: 1024
        })
      });

      if (!groqResponse.ok) {
        const errData = await groqResponse.json();
        throw new Error(errData.error?.message || 'Groq API Error');
      }

      const groqData = await groqResponse.json();
      const responseMessage = groqData.choices[0].message;

      // Handle Tool Calls (RAG Interception)
      if (responseMessage.tool_calls) {
        messagesArray.push(responseMessage); // Append the assistant's tool call request

        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.function.name === 'search_database') {
            const args = JSON.parse(toolCall.function.arguments);
            const searchQuery = args.query;

            // Clean common prefixes, suffixes, and noise words (e.g. "Brig.", "shipment")
            let cleanQuery = searchQuery
              .replace(/\b(brig|col|gen|maj|capt|mr|mrs|ms|shipment|details|job|status|info)\.?\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();

            // Perform Supabase text search on jobs table using the cleaned query
            const { data: jobs, error } = await supabaseAdmin
              .from('jobs')
              .select('*')
              .or(`customer_name.ilike.%${cleanQuery}%,job_number.ilike.%${cleanQuery}%,company.ilike.%${cleanQuery}%`)
              .limit(5);

            const searchResult = jobs && jobs.length > 0 
              ? JSON.stringify(jobs) 
              : "No jobs found for this query.";

            // Append the tool response
            messagesArray.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: 'search_database',
              content: searchResult
            });
          }
        }

        // Second API call with the injected data
        const secondResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: messagesArray,
            temperature: 0.6,
            max_tokens: 1024
          })
        });

        const secondData = await secondResponse.json();
        return NextResponse.json({ result: secondData.choices[0].message.content });
      }

      // No tool called, return normal response
      return NextResponse.json({ result: responseMessage.content });
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
