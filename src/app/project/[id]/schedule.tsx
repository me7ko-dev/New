import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, Chip, Empty, Field, Label, Progress, Row, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { addDays, isoDate, uid } from '@/lib/factory';
import { isTaskLate, LATE_COLOR, TASK_STATUS_LABEL } from '@/lib/labels';
import { pct, tasksProgress } from '@/lib/progress';
import { can, useProject } from '@/lib/store';
import type { Task, TaskStatus } from '@/lib/types';

const NEXT: Record<TaskStatus, TaskStatus> = { todo: 'doing', doing: 'done', done: 'todo' };

function dateBg(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export default function ScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project: p, update, role } = useProject(id);
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [levelId, setLevelId] = useState<string | null>(null);
  const [start, setStart] = useState(isoDate(new Date()));
  const [days, setDays] = useState('1');
  if (!p) return <Screen title="График"><Empty icon="🤷" text="Обектът не е намерен." /></Screen>;

  const tasks = [...p.tasks].sort((a, b) => a.start.localeCompare(b.start));
  const first = tasks[0]?.start ?? isoDate(new Date());
  const last = tasks.reduce((m, x) => (addDays(x.start, x.days) > m ? addDays(x.start, x.days) : m), first);
  const span = Math.max(1, (new Date(last).getTime() - new Date(first).getTime()) / 86400000);
  const today = (new Date().getTime() - new Date(first).getTime()) / 86400000 / span;
  const late = tasks.filter((x) => isTaskLate(x));

  const setTask = (tid: string, patch: Partial<Task>) =>
    update((pr) => ({ ...pr, tasks: pr.tasks.map((x) => (x.id === tid ? { ...x, ...patch } : x)) }));

  const addTask = () => {
    const d = Math.max(1, parseInt(days, 10) || 1);
    update((pr) => ({ ...pr, tasks: [...pr.tasks, { id: uid(), title: title.trim(), levelId, start, days: d, status: 'todo' }] }));
    setAdding(false);
    setTitle('');
  };

  return (
    <Screen title="График">
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Body bold>Свършено по график</Body>
          <Body bold style={{ fontSize: 22 }}>{pct(tasksProgress(p))}</Body>
        </Row>
        <Progress value={tasksProgress(p)} />
        <Row>
          {(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => (
            <Chip key={s} title={`${TASK_STATUS_LABEL[s].title}: ${p.tasks.filter((x) => x.status === s).length}`} color={TASK_STATUS_LABEL[s].color} />
          ))}
          {late.length > 0 ? <Chip title={`Закъснява: ${late.length}`} color={LATE_COLOR} /> : null}
        </Row>
        {can(role, 'progress') ? <Label style={{ textTransform: 'none' }}>Натиснете задача, за да смените състоянието ѝ.</Label> : null}
      </Card>

      {tasks.length === 0 ? <Empty icon="📅" text="Няма задачи в графика." /> : null}

      {tasks.map((task) => {
        const st = TASK_STATUS_LABEL[task.status];
        const isLate = isTaskLate(task);
        const color = isLate ? LATE_COLOR : st.color;
        const left = (new Date(task.start).getTime() - new Date(first).getTime()) / 86400000 / span;
        const width = Math.max(0.01, task.days / span);
        return (
          <Pressable
            key={task.id}
            disabled={!can(role, 'progress')}
            onPress={() => setTask(task.id, { status: NEXT[task.status], doneAt: NEXT[task.status] === 'done' ? isoDate(new Date()) : undefined })}
            onLongPress={
              can(role, 'edit')
                ? () => confirm(`Да изтрия ли задачата „${task.title}“?`, () => update((pr) => ({ ...pr, tasks: pr.tasks.filter((x) => x.id !== task.id) })))
                : undefined
            }>
            <Card style={{ borderLeftWidth: 6, borderLeftColor: color }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body bold style={{ flexShrink: 1 }}>
                  {task.status === 'done' ? '✅ ' : ''}
                  {task.title}
                </Body>
                <Chip title={isLate ? 'Закъснява' : st.title} color={color} />
              </Row>
              <Label style={{ textTransform: 'none' }}>
                {dateBg(task.start)} → {dateBg(addDays(task.start, task.days))} · {task.days} дни
                {task.doneAt ? ` · готово на ${dateBg(task.doneAt)}` : ''}
              </Label>
              <View style={{ height: 8, backgroundColor: t.backgroundElement, borderRadius: 4 }}>
                <View style={{ position: 'absolute', left: `${left * 100}%`, width: `${width * 100}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
                {today >= 0 && today <= 1 ? (
                  <View style={{ position: 'absolute', left: `${today * 100}%`, top: -3, width: 2, height: 14, backgroundColor: t.text }} />
                ) : null}
              </View>
            </Card>
          </Pressable>
        );
      })}

      {can(role, 'edit') ? (
        adding ? (
          <Card>
            <Field label="Какво ще се прави" value={title} onChange={setTitle} />
            <Label>Етаж</Label>
            <Row>
              <Chip title="Целия обект" selected={levelId === null} onPress={() => setLevelId(null)} />
              {p.levels.map((l) => (
                <Chip key={l.id} title={l.name} selected={levelId === l.id} onPress={() => setLevelId(l.id)} />
              ))}
            </Row>
            <Row>
              <Field label="Начало (ГГГГ-ММ-ДД)" value={start} onChange={setStart} />
              <Field label="Продължителност" value={days} onChange={setDays} numeric unit="дни" />
            </Row>
            <Row>
              <Button kind="primary" title="💾 Добави" disabled={!title.trim() || isNaN(new Date(start).getTime())} onPress={addTask} />
              <Button title="Отказ" onPress={() => setAdding(false)} />
            </Row>
          </Card>
        ) : (
          <>
            <Button kind="primary" title="＋ Нова задача" onPress={() => setAdding(true)} />
            <Label style={{ textTransform: 'none' }}>Задръжте задача, за да я изтриете.</Label>
          </>
        )
      ) : null}
    </Screen>
  );
}
