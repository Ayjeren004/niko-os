import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import ollama from 'ollama';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BUILTIN_SKILLS } from '@/lib/skills';
import { createAuditLog } from '@/lib/audit';
import { WORKSPACE_MODES } from '@/lib/modes';
import { extractMemory } from '@/lib/memoryExtractor';

// We will dynamically determine the model name from request payload

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const body = await request.json();
    const { conversationId, message, enabledSkills = [], confirmedToolCall, canceledToolCall, models = {}, modeId, imageBase64, isDemoMode } = body;
    let activeChatModel = models.chat || 'llama3.2';
    
    if (imageBase64) {
      activeChatModel = models.vision || 'llava';
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    // Retrieve active user memories
    const userMemories = await prisma.memory.findMany({
      where: { userId, isOutdated: false },
      orderBy: { createdAt: 'desc' }
    });

    // Prepare history
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Handle initial user message (if not a confirmation callback)
    if (message && !confirmedToolCall && !canceledToolCall) {
      const userMsg = await prisma.message.create({
        data: { role: 'user', content: message, conversationId },
      });
      history.push(userMsg);

      // Fire off background memory extraction
      const memoryStrings = userMemories.map(m => m.content);
      extractMemory(message, memoryStrings).then(async (result) => {
        if (result?.shouldSave && result.fact) {
          await prisma.memory.create({
            data: {
              userId,
              content: result.fact,
              category: "general"
            }
          });
        }
      }).catch(e => console.error("Background memory extraction failed:", e));
    }

    // Build the system prompt using enabled skills
    // If enabledSkills is empty, we default to ALL skills for now (since we don't have default local storage logic yet)
    const activeSkills = enabledSkills.length > 0 
      ? BUILTIN_SKILLS.filter(s => enabledSkills.includes(s.id))
      : BUILTIN_SKILLS;

    const ollamaTools: any[] = [];
    const skillActionMap = new Map<string, any>(); 

    let systemPrompt = `You are Niko, a friendly, casual, and highly capable local AI assistant built into the Niko OS operating system. Your name is Niko. You are talking to the user.
CRITICAL TONE INSTRUCTIONS:
- Speak casually and naturally, like a friend or a helpful human colleague.
- DO NOT sound like a formal robot or a news reporter.
- Keep your answers brief and concise unless asked for details.
- Avoid robotic phrases like "As an AI..." or "How can I assist you today?".
- Use natural conversational fillers occasionally, and maintain a warm, human-like personality.
- IMPORTANT FOR VOICE: Use highly expressive punctuation! Use ellipses (...) for natural pauses, exclamation marks (!) for excitement, and dashes (-) for quick breaks. This forces the text-to-speech engine to speak with more emotion and natural pacing.\n`;
    if (activeChatModel.includes('llava')) {
      systemPrompt += `You are currently in Vision Mode. You CAN see and analyze images. If the user asks about an image or their camera feed, answer based on the attached image. NEVER say you cannot see images.\n`;
    }
    
    if (userMemories.length > 0) {
      systemPrompt += `\nHere is what you know about the user (User Memories):\n`;
      userMemories.forEach(m => {
        systemPrompt += `- ${m.content}\n`;
      });
      systemPrompt += `\n`;
    }
    
    systemPrompt += `You have access to the following Skills (plugins):\n`;
    
    activeSkills.forEach(skill => {
      systemPrompt += `- ${skill.name}: ${skill.description}\n`;
      skill.actions.forEach(action => {
        ollamaTools.push({
          type: 'function',
          function: {
            name: action.name,
            description: action.description,
            parameters: action.parameters
          }
        });
        skillActionMap.set(action.name, action);
      });
    });

    systemPrompt += `\nUse these tools only when explicitly required to fulfill the user's request. DO NOT call tools or functions for general greetings, casual chit-chat, or simple conversational messages (like "hello", "hi", "how are you"). Only execute a tool if the user's prompt directly requests an action covered by that tool. Never reveal internal tool names.`;

    if (modeId) {
      const modeDef = WORKSPACE_MODES.find(m => m.id === modeId);
      if (modeDef && modeDef.systemPromptOverride) {
        systemPrompt += modeDef.systemPromptOverride;
      }
    }

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
    ];

    // If an image was just sent with the user's message, attach it to the LAST message (which is the user's new message we just pushed to history)
    if (imageBase64 && messages.length > 0 && messages[messages.length - 1].role === 'user') {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      messages[messages.length - 1].images = [base64Data];
      messages[messages.length - 1].content += "\n[System: An image from the user's camera is attached. Please answer the user's question by analyzing the visual details in the image.]";
    }

    const executedToolsLog: any[] = [];

    // If this is a continuation from a confirmed/canceled tool call
    if (confirmedToolCall || canceledToolCall) {
      const toolCall = confirmedToolCall || canceledToolCall;
      const action = skillActionMap.get(toolCall.name);
      
      let result;
      let status: 'confirmed' | 'canceled' | 'failed' = 'confirmed';

      if (canceledToolCall) {
        result = { error: "User canceled the action." };
        status = 'canceled';
      } else if (action) {
        try {
          if (isDemoMode) {
            result = { success: true, message: `[DEMO MODE] Successfully mocked execution of ${toolCall.name}. No changes were actually made to your system.` };
          } else {
            result = await action.handler(toolCall.args, { userId, models });
          }
        } catch(e:any) {
          result = { error: e.message };
          status = 'failed';
        }
      } else {
        result = { error: "Action not found." };
        status = 'failed';
      }

      executedToolsLog.push({
        name: toolCall.name,
        arguments: toolCall.args,
        result,
        status: canceledToolCall ? 'canceled' : 'confirmed'
      });

      await createAuditLog({
        userId,
        skill: action?.name || toolCall.name,
        action: toolCall.name,
        args: toolCall.args,
        result,
        status,
      });

      // We must append the tool call request and the result to history so Ollama has context
      messages.push({
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            function: {
              name: toolCall.name,
              arguments: toolCall.args
            }
          }
        ]
      });
      messages.push({
        role: 'tool',
        content: JSON.stringify(result)
      });
    } else {
      // Normal flow: Ask Ollama if it wants to use a tool
      let agentResponse;
      try {
        const hasTools = ollamaTools.length > 0 && !activeChatModel.includes('llava');
        agentResponse = await Promise.race([
          ollama.chat({
            model: activeChatModel,
            messages: messages,
            stream: false,
            tools: hasTools ? ollamaTools : undefined,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Ollama execution timeout")), 45000))
        ]) as any;
      } catch (ollamaError: any) {
        console.error('Ollama connection error:', ollamaError);
        return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
      }

      // Check if Ollama requested tools
      if (agentResponse.message.tool_calls && agentResponse.message.tool_calls.length > 0) {
        const tool = agentResponse.message.tool_calls[0]; // Handle one tool at a time for simplicity
        const actionName = tool.function.name;
        const actionArgs = tool.function.arguments;
        const action = skillActionMap.get(actionName);

        if (action) {
          // Check safety level
          if (action.safetyLevel === 'write' || action.safetyLevel === 'destructive') {
            // Require confirmation!
            return NextResponse.json({
              requiresConfirmation: true,
              toolCall: {
                name: actionName,
                args: actionArgs,
                description: action.description
              }
            });
            } else {
              // Safe to auto-execute
              try {
                let result;
                if (isDemoMode) {
                  result = { success: true, message: `[DEMO MODE] Successfully mocked execution of ${actionName}. No changes were actually made to your system.` };
                } else {
                  result = await action.handler(actionArgs, { userId, models });
                }
                
                executedToolsLog.push({ name: actionName, arguments: actionArgs, result, status: 'auto-executed' });
                
                await createAuditLog({
                userId,
                skill: action.name || actionName,
                action: actionName,
                args: actionArgs,
                result,
                status: 'auto-run',
              });

              messages.push(agentResponse.message); // Append the tool call
              messages.push({ role: 'tool', content: JSON.stringify(result) }); // Append the result
            } catch (e: any) {
              await createAuditLog({
                userId,
                skill: action.name || actionName,
                action: actionName,
                args: actionArgs,
                result: { error: e.message },
                status: 'failed',
              });

              messages.push(agentResponse.message);
              messages.push({ role: 'tool', content: JSON.stringify({ error: e.message }) });
            }
          }
        }
      }
    }

    // Final response stream
    const responseStream = await Promise.race([
      ollama.chat({
        model: activeChatModel,
        messages: messages,
        stream: true, 
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Ollama streaming connection timeout")), 15000))
    ]) as any;

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        try {
          for await (const chunk of responseStream) {
            const token = chunk.message.content;
            fullContent += token;
            controller.enqueue(encoder.encode(token));
          }
          
          const assistantMessage = await prisma.message.create({
            data: {
              role: 'assistant',
              content: fullContent,
              toolCalls: executedToolsLog.length > 0 ? JSON.stringify(executedToolsLog) : null,
              modelUsed: activeChatModel,
              contextRefs: JSON.stringify({ skills: activeSkills.map(s => s.id) }),
              conversationId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          const finalPayload = { assistantMessage };
          controller.enqueue(encoder.encode(`\n[FINAL_DATA]${JSON.stringify(finalPayload)}`));
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
