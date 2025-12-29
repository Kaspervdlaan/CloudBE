import { Request, Response, NextFunction } from 'express';
import { ollamaChat, ollamaChatStream, ChatMessage, systemPrompt } from '../utils/ollama';

/**
 * Check Ollama health and list available models
 */
export async function checkOllamaHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://drive-ollama:11434";
    const r = await fetch(`${baseUrl}/api/tags`);
    
    if (!r.ok) {
      res.status(502).json({ ok: false });
      return;
    }
    
    const data = await r.json();
    res.json({ 
      ok: true, 
      models: (data as any)?.models?.map((m: any) => m.name) ?? [] 
    });
  } catch (error) {
    res.status(502).json({ ok: false });
  }
}

/**
 * Handle chat requests to Ollama
 */
export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { prompt, messages, temperature } = req.body as {
      prompt?: string;
      messages?: ChatMessage[];
      temperature?: number;
    };

    // Allow either `prompt` or `messages`
    const finalMessages: ChatMessage[] =
      Array.isArray(messages) && messages.length > 0
        ? messages
        : typeof prompt === "string" && prompt.trim().length > 0
          ? [{ role: "user", content: prompt.trim() }]
          : [];

    if (finalMessages.length === 0) {
      res.status(400).json({ error: "Provide `prompt` or `messages[]`" });
      return;
    }

    const { content, raw } = await ollamaChat({
      messages: [systemPrompt, ...finalMessages],
      temperature: typeof temperature === "number" ? temperature : 0.2,
      numCtx: 2048,
    });

    res.json({
      model: process.env.OLLAMA_MODEL,
      reply: content,
      raw, // Full metadata from Ollama response
    });
  } catch (err: any) {
    res.status(502).json({
      error: "ai_upstream_failed",
      detail: err?.message ?? "Unknown error",
    });
  }
}

/**
 * Handle streaming chat requests to Ollama
 */
export async function chatStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { prompt, messages, temperature } = req.body as {
      prompt?: string;
      messages?: ChatMessage[];
      temperature?: number;
    };

    // Allow either `prompt` or `messages`
    const finalMessages: ChatMessage[] =
      Array.isArray(messages) && messages.length > 0
        ? messages
        : typeof prompt === "string" && prompt.trim().length > 0
          ? [{ role: "user", content: prompt.trim() }]
          : [];

    if (finalMessages.length === 0) {
      res.status(400).json({ error: "Provide `prompt` or `messages[]`" });
      return;
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in Nginx/Caddy

    const stream = await ollamaChatStream({
      messages: [systemPrompt, ...finalMessages],
      temperature: typeof temperature === "number" ? temperature : 0.2,
      numCtx: 2048,
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          res.write('data: [DONE]\n\n');
          res.end();
          break;
        }

        // Decode the chunk
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const data = JSON.parse(line);
            
            // Send the chunk as SSE
            if (data.message?.content) {
              res.write(`data: ${JSON.stringify({ 
                content: data.message.content,
                done: data.done || false 
              })}\n\n`);
            }
            
            if (data.done) {
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }
          } catch (parseError) {
            // Skip invalid JSON lines (might be partial chunks)
            continue;
          }
        }
      }
    } catch (streamError: any) {
      console.error('Stream error:', streamError);
      res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
      res.end();
    } finally {
      reader.releaseLock();
    }
  } catch (err: any) {
    res.status(502).json({
      error: "ai_upstream_failed",
      detail: err?.message ?? "Unknown error",
    });
  }
}

