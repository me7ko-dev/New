import type { Element, ElementStatus } from './calc';
import type { Project } from './types';

const WEIGHT: Record<ElementStatus, number> = { todo: 0, formwork: 0.25, rebar: 0.5, concrete: 0.8, done: 1 };

export function elementsProgress(elements: Element[]): number {
  if (elements.length === 0) return 0;
  return elements.reduce((s, e) => s + WEIGHT[e.status], 0) / elements.length;
}

export function tasksProgress(p: Project, levelId?: string): number {
  const tasks = levelId ? p.tasks.filter((t) => t.levelId === levelId) : p.tasks;
  if (tasks.length === 0) return 0;
  return tasks.reduce((s, t) => s + (t.status === 'done' ? 1 : t.status === 'doing' ? 0.5 : 0), 0) / tasks.length;
}

export function levelProgress(p: Project, levelId: string): number {
  const els = p.elements.filter((e) => e.levelId === levelId);
  const hasTasks = p.tasks.some((t) => t.levelId === levelId);
  if (els.length === 0) return tasksProgress(p, levelId);
  if (!hasTasks) return elementsProgress(els);
  return (elementsProgress(els) + tasksProgress(p, levelId)) / 2;
}

export function projectProgress(p: Project): number {
  if (p.levels.length === 0) return 0;
  return p.levels.reduce((s, l) => s + levelProgress(p, l.id), 0) / p.levels.length;
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
