import { Skill } from './types';
import prisma from '@/lib/prisma';

export const BriefingSkill: Skill = {
  id: 'briefing_skill',
  name: 'Daily Briefing',
  description: 'Generate or retrieve the user\'s daily briefing. Use this when the user asks for their morning report or what to focus on today.',
  actions: [
    {
      name: 'generateBriefing',
      description: 'Generate a new daily briefing.',
      safetyLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {}
      },
      handler: async (args, context) => {
        const today = new Date().toISOString().split('T')[0];
        
        // Return instructions so the LLM can point the user to the Briefing page, 
        // or we could fetch the briefing data and return it to the LLM directly.
        // For simplicity, let's just return the latest briefing or tell it to go to /briefing
        const briefing = await prisma.briefing.findFirst({
          where: { userId: context.userId, date: today }
        });
        
        if (briefing) {
           return { success: true, message: "A briefing already exists for today. Here is the content:", content: briefing.content };
        } else {
           return { success: true, message: "I don't have the briefing generation logic here, but I can remind the user to click the 'Morning Briefing' tab to generate it! Let them know to navigate there." };
        }
      }
    }
  ]
};
