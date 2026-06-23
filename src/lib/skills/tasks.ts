import { Skill } from './types';
import prisma from '@/lib/prisma';
import { emitEvent } from '../workflows/engine';

export const TaskSkill: Skill = {
  id: 'task_skill',
  name: 'Task Manager',
  description: 'Manage the user\'s tasks, todos, and action items. You can also schedule local reminders by specifying an exact ISO datetime.',
  actions: [
    {
      name: 'createTask',
      description: 'Create a new task or todo item.',
      safetyLevel: 'safe',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The title of the task' },
          description: { type: 'string', description: 'Optional detailed description' },
          dueDate: { type: 'string', description: 'Optional due date (YYYY-MM-DD)' },
          reminderAt: { type: 'string', description: 'Optional exact time to trigger a desktop notification reminder (ISO 8601 string, e.g. 2026-05-25T14:30:00Z). It MUST be an ISO string.' }
        },
        required: ['title']
      },
      handler: async (args, context) => {
        if (!args.title) throw new Error("title is required");
        const task = await prisma.task.create({
          data: {
            title: args.title,
            description: args.description || null,
            dueDate: args.dueDate || null,
            reminderAt: args.reminderAt ? new Date(args.reminderAt) : null,
            userId: context.userId
          }
        });

        emitEvent(context.userId, 'TASK_CREATED', {
          taskId: task.id,
          title: task.title
        });

        return { success: true, taskId: task.id, message: `Task '${args.title}' created.` };
      }
    },
    {
      name: 'listTasks',
      description: 'List the user\'s current tasks.',
      safetyLevel: 'read',
      parameters: {
        type: 'object',
        properties: {}
      },
      handler: async (args, context) => {
        const tasks = await prisma.task.findMany({ where: { userId: context.userId } });
        return { tasks };
      }
    },
    {
      name: 'updateTask',
      description: 'Update an existing task.',
      safetyLevel: 'write', // Needs confirmation
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The ID of the task to update' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
          reminderAt: { type: 'string', description: 'New exact reminder time (ISO 8601 string)' }
        },
        required: ['taskId']
      },
      handler: async (args, context) => {
        if (!args.taskId) throw new Error("taskId is required");
        const task = await prisma.task.update({
          where: { id: args.taskId, userId: context.userId },
          data: {
            ...(args.title && { title: args.title }),
            ...(args.description !== undefined && { description: args.description }),
            ...(args.reminderAt !== undefined && { reminderAt: args.reminderAt ? new Date(args.reminderAt) : null, reminderStatus: 'pending' })
          }
        });
        return { success: true, message: `Task '${task.title}' updated.` };
      }
    },
    {
      name: 'deleteTask',
      description: 'Delete a task.',
      safetyLevel: 'destructive', // Needs confirmation
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The ID of the task to delete' }
        },
        required: ['taskId']
      },
      handler: async (args, context) => {
        if (!args.taskId) throw new Error("taskId is required");
        await prisma.task.delete({
          where: { id: args.taskId, userId: context.userId }
        });
        return { success: true, message: `Task deleted.` };
      }
    }
  ]
};
