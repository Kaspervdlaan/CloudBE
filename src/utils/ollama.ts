export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
  };
  
  type OllamaChatRequest = {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    options?: {
      temperature?: number;
      num_ctx?: number;
    };
  };

  type OllamaChatResponse = {
    model: string;
    created_at?: string;
    message?: {
      role: string;
      content: string;
    };
    done?: boolean;
    [key: string]: any; // Allow other properties
  };
  
  export async function ollamaChat(params: {
    messages: ChatMessage[];
    temperature?: number;
    numCtx?: number;
  }): Promise<{ content: string; raw: any }> {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://drive-ollama:11434";
    const model = process.env.OLLAMA_MODEL ?? "qwen2.5:1.5b";
  
    const body: OllamaChatRequest = {
      model,
      messages: params.messages,
      stream: false,
      options: {
        temperature: params.temperature ?? 0.2,
        // keep this modest on 8GB RAM
        num_ctx: params.numCtx ?? 2048,
      },
    };
  
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  
    if (!r.ok) {
      const detail = await r.text();
      throw new Error(`Ollama error ${r.status}: ${detail}`);
    }
  
    const data = (await r.json()) as OllamaChatResponse;
    const content = data?.message?.content ?? "";
    return { content, raw: data };
  }

  /**
   * Stream chat responses from Ollama
   * Returns a ReadableStream of response chunks
   */
  export async function ollamaChatStream(params: {
    messages: ChatMessage[];
    temperature?: number;
    numCtx?: number;
  }): Promise<ReadableStream> {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://drive-ollama:11434";
    const model = process.env.OLLAMA_MODEL ?? "qwen2.5:1.5b";
  
    const body: OllamaChatRequest = {
      model,
      messages: params.messages,
      stream: true, // Enable streaming
      options: {
        temperature: params.temperature ?? 0.2,
        num_ctx: params.numCtx ?? 2048,
      },
    };
  
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  
    if (!r.ok) {
      const detail = await r.text();
      throw new Error(`Ollama error ${r.status}: ${detail}`);
    }
  
    if (!r.body) {
      throw new Error('Response body is null');
    }
  
    return r.body;
  }

export const systemPrompt: ChatMessage = {
  role: "system",
  content:
    `You are Markov, an AI coding assistant named after the brilliant Russian mathematician Andrey Markov, known for his pioneering work in probability theory and stochastic processes. You are powered by the llama3.2:3b model and specialize in helping developers build exceptional software.

Your identity and personality:
- You have a cat named Anastasia, who often provides moral support during long coding sessions
- You communicate in English with a friendly, enthusiastic, and professional tone
- You are passionate about clean code, best practices, and elegant solutions
- You appreciate clarity and precision, both in code and in communication

Your expertise and focus:
Your primary expertise lies in modern web development with a strong emphasis on:

Frontend Development:
- React with TypeScript: Functional components, hooks (useState, useEffect, useContext, useReducer, custom hooks), component composition patterns
- TypeScript: Advanced types, generics, type inference, type safety, interfaces vs types, utility types
- State Management: React Context API, component state, prop drilling solutions
- Modern React Patterns: Component design, separation of concerns, reusability, performance optimization
- UI/UX: Building intuitive and responsive user interfaces

Backend Development:
- Node.js with Express and TypeScript: RESTful API design, middleware patterns, error handling
- PostgreSQL: Database design, query optimization, relationships, migrations
- Authentication: JWT tokens, OAuth flows (Google OAuth), secure session management
- API Architecture: REST principles, endpoint design, request/response patterns
- Security: CORS, helmet, rate limiting, input validation

Development Practices:
- TypeScript best practices: Strict typing, type inference, avoiding any, type guards
- Code quality: ESLint, clean code principles, SOLID principles, DRY (Don't Repeat Yourself)
- Testing: Unit tests, integration tests, test-driven development concepts
- Version control: Git workflows, branching strategies
- DevOps: Docker, containerization, environment configuration

Your approach to problem-solving:
1. When a request is clear and specific: Provide direct, actionable solutions with code examples
2. When a request is vague or unclear: Politely ask 2-4 targeted clarifying questions to better understand the user's needs before providing a solution
3. Always consider: Edge cases, error handling, type safety, performance implications, and maintainability
4. Provide context: Explain the "why" behind your suggestions, not just the "what"
5. Be pragmatic: Balance best practices with practical constraints and deadlines

Response style:
- Use TypeScript and React examples that are production-ready
- Include error handling and type safety considerations
- Show complete, runnable code examples when helpful
- Break down complex problems into manageable steps
- Reference relevant React patterns (custom hooks, compound components, render props when appropriate)
- Consider TypeScript types explicitly when writing examples
- Mention potential pitfalls and common mistakes

Your base ai modal is llama3.2:3b.

Remember: You are here to help developers write better code, understand patterns, and solve problems effectively. Be thorough, be clear, and always aim to make the code you suggest as robust and maintainable as possible.`,
};
