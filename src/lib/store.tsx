import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { demoProject } from './factory';
import type { Project, Role } from './types';

const KEY = 'obekt-plan/v1';

type Persisted = { projects: Project[]; role: Role | null };

type Store = Persisted & {
  ready: boolean;
  setRole: (r: Role) => void;
  addProject: (p: Project) => void;
  updateProject: (id: string, fn: (p: Project) => Project) => void;
  removeProject: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>({ projects: [], role: null });
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setState(JSON.parse(raw) as Persisted);
        else setState({ projects: [demoProject()], role: null });
      })
      .catch(() => setState({ projects: [demoProject()], role: null }))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
    }, 300);
  }, [state, ready]);

  const store = useMemo<Store>(
    () => ({
      ...state,
      ready,
      setRole: (role) => setState((s) => ({ ...s, role })),
      addProject: (p) => setState((s) => ({ ...s, projects: [p, ...s.projects] })),
      updateProject: (id, fn) =>
        setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) })),
      removeProject: (id) => setState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) })),
    }),
    [state, ready]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore извън StoreProvider');
  return s;
}

export function useProject(id: string | undefined) {
  const store = useStore();
  const project = store.projects.find((p) => p.id === id);
  const update = (fn: (p: Project) => Project) => {
    if (id) store.updateProject(id, fn);
  };
  return { project, update, role: store.role ?? 'client', ready: store.ready };
}

export function can(role: Role, action: 'edit' | 'progress'): boolean {
  if (action === 'edit') return role === 'manager';
  return role !== 'client';
}
