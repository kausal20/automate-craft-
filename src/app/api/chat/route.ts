import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = streamText({
      model: openai('gpt-4o'),
      system: `You are an automation architect for a business automation SaaS.
Your goal is to help users design and deploy automations.
Be concise, helpful, and ask clarifying questions if the automation request is vague.
Only suggest integrations related to standard business workflows (email, CRM, sheets, slack, etc.).
When you have enough information, call the configure_automation tool to render the setup form.`,
      messages,
      tools: {
        configure_automation: tool({
          description: 'Configures an automation and returns the input fields needed for setup.',
          inputSchema: z.object({
            trigger: z.string(),
            action: z.string(),
            fields: z.array(z.object({
              key: z.string(),
              label: z.string(),
              type: z.string(),
              placeholder: z.optional(z.string())
            }))
          }),
        })
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred during chat processing." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
