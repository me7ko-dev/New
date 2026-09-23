import type { CalcSettings, Element } from './calc';

export type Role = 'client' | 'worker' | 'manager';

export type Level = {
  id: string;
  name: string;
  /** Кота, м (напр. 0 за ±0.00, 3.2 за +3.20). */
  elevation: number;
};

export type Discipline = 'arch' | 'struct' | 'elec' | 'plumb' | 'hvac' | 'other';

export type Drawing = {
  id: string;
  name: string;
  kind: 'pdf' | 'image';
  uri: string;
  levelId: string | null;
  discipline: Discipline;
  addedAt: string;
};

export type TaskStatus = 'todo' | 'doing' | 'done';

export type Task = {
  id: string;
  title: string;
  levelId: string | null;
  /** ISO дата (ГГГГ-ММ-ДД). */
  start: string;
  days: number;
  status: TaskStatus;
  doneAt?: string;
};

export type Project = {
  id: string;
  name: string;
  address: string;
  levels: Level[];
  drawings: Drawing[];
  elements: Element[];
  tasks: Task[];
  settings: CalcSettings;
  createdAt: string;
};
