import { NotesSkill } from './notes';
import { TaskSkill } from './tasks';
import { DocumentSkill } from './documents';
import { BriefingSkill } from './briefing';
import { Skill } from './types';

export const BUILTIN_SKILLS: Skill[] = [
  NotesSkill,
  TaskSkill,
  DocumentSkill,
  BriefingSkill
];
