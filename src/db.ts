import Dexie, { Table } from 'dexie';

export type ExerciseType = 'strength' | 'cardio';
export type WeightUnit = 'kg' | 'lb';

export interface Exercise {
  id?: number;
  name: string;
  type: ExerciseType;
  bodyPart?: string;
}

export interface WorkoutTemplate {
  id?: number;
  name: string;
  exerciseIds: number[];
}

export interface Workout {
  id?: number;
  templateId: number | null;
  startTime: string;
  endTime?: string;
  note?: string;
}

export interface SetRecord {
  id?: number;
  workoutId: number;
  exerciseId: number;
  isWarmup: boolean;
  weight?: number;
  reps?: number;
  durationMinutes?: number;
  distance?: number;
}

export interface AppSettings {
  id: number;
  weightUnit: WeightUnit;
  weeklyTargetDays?: number;
  bodyWeightTarget?: number;
}

export interface WorkoutExerciseStatus {
  id?: number;
  workoutId: number;
  exerciseId: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface BodyMeasurement {
  id?: number;
  date: string; // ISO date string YYYY-MM-DD
  weight: number;
  bodyFat?: number;
  note?: string;
}

export interface Program {
  id?: number;
  name: string;
  description?: string;
  weeks: number;
}

export interface ProgramDay {
  id?: number;
  programId: number;
  week: number;
  day: number;
  name: string;
  templateId: number;
}

export class FitingDB extends Dexie {
  exercises!: Table<Exercise, number>;
  templates!: Table<WorkoutTemplate, number>;
  workouts!: Table<Workout, number>;
  sets!: Table<SetRecord, number>;
  settings!: Table<AppSettings, number>;
  statuses!: Table<WorkoutExerciseStatus, number>;
  measurements!: Table<BodyMeasurement, number>;
  programs!: Table<Program, number>;
  programDays!: Table<ProgramDay, number>;

  constructor() {
    super('fiting');
    this.version(1).stores({
      exercises: '++id, name, type',
      templates: '++id, name',
      workouts: '++id, templateId, startTime, endTime',
      sets: '++id, workoutId, exerciseId, isWarmup',
      settings: 'id'
    });
    this.version(2).stores({
      exercises: '++id, name, type',
      templates: '++id, name',
      workouts: '++id, templateId, startTime, endTime',
      sets: '++id, workoutId, exerciseId, isWarmup',
      settings: 'id',
      statuses: '++id, workoutId, exerciseId'
    });
    this.version(3).stores({
      measurements: '++id, date'
    });
    this.version(4).stores({
      programs: '++id, name',
      programDays: '++id, programId, [programId+week+day]'
    });
  }
}

export const db = new FitingDB();

export async function ensureInitialData() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({ id: 1, weightUnit: 'kg' });
  }

  const exerciseCount = await db.exercises.count();
  if (exerciseCount === 0) {
    const squatId = await db.exercises.add({ name: '深蹲', type: 'strength', bodyPart: 'legs' });
    const benchId = await db.exercises.add({ name: '臥推', type: 'strength', bodyPart: 'chest' });
    const deadliftId = await db.exercises.add({ name: '硬舉', type: 'strength', bodyPart: 'back' });
    const runId = await db.exercises.add({ name: '跑步', type: 'cardio' });

    await db.templates.bulkAdd([
      {
        name: '全身力量基礎',
        exerciseIds: [squatId, benchId, deadliftId]
      },
      {
        name: '跑步 + 深蹲',
        exerciseIds: [runId, squatId]
      }
    ]);
  }
}

export interface WeeklyStats {
  trainingDays: number;
  totalMinutes: number;
  totalSets: number;
  totalWeight: number;
}

export interface WeeklySummary {
  current: WeeklyStats;
  last: WeeklyStats;
  delta: {
    trainingDays: number | null;
    totalMinutes: number | null;
    totalSets: number | null;
    totalWeight: number | null;
  };
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday as 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(start: Date) {
  const d = new Date(start);
  d.setDate(d.getDate() + 7);
  return d;
}

function emptyStats(): WeeklyStats {
  return { trainingDays: 0, totalMinutes: 0, totalSets: 0, totalWeight: 0 };
}

function computeDelta(current: number, last: number): number | null {
  if (last === 0) return null;
  return ((current - last) / last) * 100;
}

export async function getCurrentAndLastWeekSummary(dbInstance: FitingDB): Promise<WeeklySummary> {
  const now = new Date();
  const currentStart = startOfWeek(now);
  const lastStart = new Date(currentStart);
  lastStart.setDate(lastStart.getDate() - 7);
  const lastEnd = currentStart;
  const currentEnd = endOfWeek(currentStart);

  const allWorkouts = await dbInstance.workouts.toArray();
  const allSets = await dbInstance.sets.toArray();

  function computeForRange(start: Date, end: Date): WeeklyStats {
    const workoutIds = allWorkouts
      .filter((w) => {
        const t = new Date(w.startTime).getTime();
        return t >= start.getTime() && t < end.getTime();
      })
      .map((w) => w.id!) as number[];

    const daySet = new Set<string>();
    let totalMinutes = 0;

    for (const w of allWorkouts) {
      if (!w.id || !workoutIds.includes(w.id)) continue;
      const startTime = new Date(w.startTime);
      const dayKey = startTime.toISOString().slice(0, 10);
      daySet.add(dayKey);
      if (w.endTime) {
        const endTime = new Date(w.endTime);
        const diff = (endTime.getTime() - startTime.getTime()) / 60000;
        if (diff > 0) totalMinutes += diff;
      }
    }

    const relevantSets = allSets.filter((s) => workoutIds.includes(s.workoutId) && !s.isWarmup);

    let totalSets = relevantSets.length;
    let totalWeight = 0;

    for (const s of relevantSets) {
      if (s.weight && s.reps) {
        totalWeight += s.weight * s.reps;
      }
    }

    return {
      trainingDays: daySet.size,
      totalMinutes,
      totalSets,
      totalWeight
    };
  }

  const current = computeForRange(currentStart, currentEnd);
  const last = computeForRange(lastStart, lastEnd);

  return {
    current,
    last,
    delta: {
      trainingDays: computeDelta(current.trainingDays, last.trainingDays),
      totalMinutes: computeDelta(current.totalMinutes, last.totalMinutes),
      totalSets: computeDelta(current.totalSets, last.totalSets),
      totalWeight: computeDelta(current.totalWeight, last.totalWeight)
    }
  };
}

export async function getTemplateWithExercises(dbInstance: FitingDB, templateId: number) {
  const template = await dbInstance.templates.get(templateId);
  if (!template) throw new Error('Template not found');
  const exercises = await dbInstance.exercises.where('id').anyOf(template.exerciseIds).toArray();
  return { template, exercises };
}

export async function startWorkoutFromTemplate(dbInstance: FitingDB, templateId: number) {
  const id = await dbInstance.workouts.add({
    templateId,
    startTime: new Date().toISOString()
  });
  return id;
}

export async function getWorkoutDetails(dbInstance: FitingDB, workoutId: number) {
  const workout = await dbInstance.workouts.get(workoutId);
  if (!workout) throw new Error('Workout not found');
  const template = workout.templateId ? await dbInstance.templates.get(workout.templateId) : null;
  const sets = await dbInstance.sets.where('workoutId').equals(workoutId).toArray();
  let exercises: Exercise[] = [];
  if (template) {
    exercises = await dbInstance.exercises.where('id').anyOf(template.exerciseIds).toArray();
  } else {
    const ids = Array.from(new Set(sets.map((s) => s.exerciseId)));
    exercises = await dbInstance.exercises.where('id').anyOf(ids).toArray();
  }
  return { workout, template, sets, exercises };
}

export async function saveSetForWorkout(
  dbInstance: FitingDB,
  workoutId: number,
  exerciseId: number,
  data: {
    isWarmup: boolean;
    weight?: number;
    reps?: number;
    durationMinutes?: number;
    distance?: number;
  }
) {
  const record: SetRecord = {
    workoutId,
    exerciseId,
    isWarmup: data.isWarmup,
    weight: data.weight,
    reps: data.reps,
    durationMinutes: data.durationMinutes,
    distance: data.distance
  };
  await dbInstance.sets.add(record);
}

export async function finishWorkout(dbInstance: FitingDB, workoutId: number) {
  const workout = await dbInstance.workouts.get(workoutId);
  if (!workout) return;
  workout.endTime = new Date().toISOString();
  await dbInstance.workouts.put(workout);
}

export async function getWorkoutExerciseStatuses(dbInstance: FitingDB, workoutId: number) {
  const rows = await dbInstance.statuses.where('workoutId').equals(workoutId).toArray();
  const map: Record<number, boolean> = {};
  for (const row of rows) {
    map[row.exerciseId] = row.isCompleted;
  }
  return map;
}

export async function setExerciseCompleted(
  dbInstance: FitingDB,
  workoutId: number,
  exerciseId: number,
  isCompleted: boolean
) {
  const existing = await dbInstance.statuses
    .where({ workoutId, exerciseId })
    .first();

  if (!existing) {
    if (!isCompleted) return;
    await dbInstance.statuses.add({
      workoutId,
      exerciseId,
      isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined
    });
    return;
  }

  existing.isCompleted = isCompleted;
  existing.completedAt = isCompleted ? new Date().toISOString() : undefined;
  await dbInstance.statuses.put(existing);
}

export async function createTemplate(
  dbInstance: FitingDB,
  name: string,
  exerciseIds: number[]
) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('TEMPLATE_NAME_REQUIRED');
  }
  if (trimmed.length > 50) {
    throw new Error('TEMPLATE_NAME_TOO_LONG');
  }
  const id = await dbInstance.templates.add({ name: trimmed, exerciseIds });
  return id;
}

export async function updateTemplate(
  dbInstance: FitingDB,
  templateId: number,
  name: string,
  exerciseIds: number[]
) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('TEMPLATE_NAME_REQUIRED');
  }
  if (trimmed.length > 50) {
    throw new Error('TEMPLATE_NAME_TOO_LONG');
  }
  const existing = await dbInstance.templates.get(templateId);
  if (!existing) return;
  existing.name = trimmed;
  existing.exerciseIds = exerciseIds;
  await dbInstance.templates.put(existing);
}

export async function deleteTemplateSafely(dbInstance: FitingDB, templateId: number) {
  const usageCount = await dbInstance.workouts.where('templateId').equals(templateId).count();
  await dbInstance.templates.delete(templateId);
  return usageCount;
}

export async function exportAllData(dbInstance: FitingDB): Promise<Blob> {
  const [exercises, templates, workouts, sets, settings] = await Promise.all([
    dbInstance.exercises.toArray(),
    dbInstance.templates.toArray(),
    dbInstance.workouts.toArray(),
    dbInstance.sets.toArray(),
    dbInstance.settings.toArray()
  ]);

  const payload = { exercises, templates, workouts, sets, settings };
  const json = JSON.stringify(payload, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export async function importAllData(dbInstance: FitingDB, json: string) {
  const parsed = JSON.parse(json) as {
    exercises: Exercise[];
    templates: WorkoutTemplate[];
    workouts: Workout[];
    sets: SetRecord[];
    settings: AppSettings[];
  };

  await dbInstance.exercises.clear();
  await dbInstance.templates.clear();
  await dbInstance.workouts.clear();
  await dbInstance.sets.clear();
  await dbInstance.settings.clear();
  await dbInstance.statuses.clear();

  if (parsed.exercises.length) {
    await dbInstance.exercises.bulkAdd(parsed.exercises);
  }
  if (parsed.templates.length) {
    await dbInstance.templates.bulkAdd(parsed.templates);
  }
  if (parsed.workouts.length) {
    await dbInstance.workouts.bulkAdd(parsed.workouts);
  }
  if (parsed.sets.length) {
    await dbInstance.sets.bulkAdd(parsed.sets);
  }
  await dbInstance.settings.bulkAdd(
    parsed.settings.length ? parsed.settings : [{ id: 1, weightUnit: 'kg' }]
  );
}

export interface ExerciseHistoryPoint {
  date: Date;
  maxWeight: number;
  totalVolume: number;
  maxReps: number;
  estimated1RM: number;
}

export async function getExerciseHistory(dbInstance: FitingDB, exerciseId: number): Promise<ExerciseHistoryPoint[]> {
  const sets = await dbInstance.sets.where('exerciseId').equals(exerciseId).toArray();
  if (sets.length === 0) return [];

  const workoutIds = Array.from(new Set(sets.map(s => s.workoutId)));
  const workouts = await dbInstance.workouts.where('id').anyOf(workoutIds).toArray();
  const workoutMap = new Map(workouts.map(w => [w.id!, w]));

  const grouped = new Map<number, SetRecord[]>();
  for (const s of sets) {
    if (s.isWarmup) continue;
    const list = grouped.get(s.workoutId) || [];
    list.push(s);
    grouped.set(s.workoutId, list);
  }

  const history: ExerciseHistoryPoint[] = [];
  for (const [wid, wSets] of grouped) {
    const workout = workoutMap.get(wid);
    if (!workout) continue;
    if (wSets.length === 0) continue;

    let maxWeight = 0;
    let maxReps = 0;
    let totalVolume = 0;
    let max1RM = 0;

    for (const s of wSets) {
      const w = s.weight || 0;
      const r = s.reps || 0;
      if (w > maxWeight) {
        maxWeight = w;
        maxReps = r;
      } else if (w === maxWeight && r > maxReps) {
        maxReps = r;
      }
      totalVolume += w * r;

      // Epley formula: 1RM = w * (1 + r/30)
      if (w > 0 && r > 0) {
        const e1rm = w * (1 + r / 30);
        if (e1rm > max1RM) max1RM = e1rm;
      }
    }

    history.push({
      date: new Date(workout.startTime),
      maxWeight,
      maxReps,
      totalVolume,
      estimated1RM: Math.round(max1RM)
    });
  }

  return history.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface ExercisePRSummary {
  bestWeight: number;
  best1RM: number;
  bestDate: Date | null;
}

export async function getExercisePR(dbInstance: FitingDB, exerciseId: number): Promise<ExercisePRSummary> {
  const history = await getExerciseHistory(dbInstance, exerciseId);
  if (history.length === 0) {
    return { bestWeight: 0, best1RM: 0, bestDate: null };
  }

  let best1RM = 0;
  let bestWeight = 0;
  let bestDate: Date | null = null;

  for (const h of history) {
    if (h.estimated1RM > best1RM) {
      best1RM = h.estimated1RM;
      bestWeight = h.maxWeight;
      bestDate = h.date;
    }
  }

  return { bestWeight, best1RM, bestDate };
}

export interface WeeklyGoalProgress {
  targetDays: number | null;
  completedDays: number;
  streakDays: number;
}

export async function getWeeklyGoalProgress(dbInstance: FitingDB): Promise<WeeklyGoalProgress> {
  const settings = await dbInstance.settings.get(1);
  const targetDays = settings?.weeklyTargetDays ?? null;

  const workouts = await dbInstance.workouts.toArray();
  const today = new Date();
  const start = startOfWeek(today);
  const end = endOfWeek(start);

  const dayKey = (d: Date) => d.toLocaleDateString('en-CA');

  const daysWithWorkoutsThisWeek = new Set<string>();
  const allDaysWithWorkouts = new Set<string>();

  for (const w of workouts) {
    const d = new Date(w.startTime);
    const key = dayKey(d);
    allDaysWithWorkouts.add(key);
    if (d >= start && d < end) {
      daysWithWorkoutsThisWeek.add(key);
    }
  }

  // Compute streak: count back from today until遇到沒有訓練的日期
  let streakDays = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = dayKey(cursor);
    if (!allDaysWithWorkouts.has(key)) break;
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    targetDays,
    completedDays: daysWithWorkoutsThisWeek.size,
    streakDays
  };
}

export async function getBodyMeasurements(dbInstance: FitingDB): Promise<BodyMeasurement[]> {
  return await dbInstance.measurements.orderBy('date').toArray();
}

export async function addBodyMeasurement(dbInstance: FitingDB, measurement: Omit<BodyMeasurement, 'id'>) {
  return await dbInstance.measurements.add(measurement as BodyMeasurement);
}

export async function deleteBodyMeasurement(dbInstance: FitingDB, id: number) {
  return await dbInstance.measurements.delete(id);
}
