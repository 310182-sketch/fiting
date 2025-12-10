import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  db,
  Exercise,
  SetRecord,
  Workout,
  getWorkoutDetails,
  saveSetForWorkout,
  finishWorkout,
  getWorkoutExerciseStatuses,
  setExerciseCompleted
} from '@/db';

export default function WorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const workoutId = Number(id);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sets, setSets] = useState<SetRecord[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [isWarmup, setIsWarmup] = useState(true);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [exerciseCompleted, setExerciseCompletedState] = useState<Record<number, boolean>>({});
  const [restTotalSeconds, setRestTotalSeconds] = useState(90);
  const [restRemainingSeconds, setRestRemainingSeconds] = useState<number | null>(null);
  const [isRestActive, setIsRestActive] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const details = await getWorkoutDetails(db, workoutId);
      setWorkout(details.workout);
      setExercises(details.exercises);
      setSets(details.sets);
       const statusMap = await getWorkoutExerciseStatuses(db, workoutId);
       setExerciseCompletedState(statusMap);
      if (details.exercises.length > 0) setSelectedExerciseId(details.exercises[0].id!);
    })();
  }, [workoutId]);

  useEffect(() => {
    if (!isRestActive || restRemainingSeconds === null) return;
    if (restRemainingSeconds <= 0) {
      setIsRestActive(false);
      return;
    }

    const id = window.setInterval(() => {
      setRestRemainingSeconds((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [isRestActive, restRemainingSeconds]);

  const findLastSetForExercise = (exerciseId: number): SetRecord | null => {
    const candidates = sets.filter((s) => s.exerciseId === exerciseId);
    if (candidates.length === 0) return null;
    const nonWarmups = candidates.filter((s) => !s.isWarmup);
    const list = nonWarmups.length > 0 ? nonWarmups : candidates;
    const latest = list.reduce<SetRecord | null>((acc, cur) => {
      if (!acc) return cur;
      const accId = acc.id ?? 0;
      const curId = cur.id ?? 0;
      return curId > accId ? cur : acc;
    }, null);
    return latest;
  };

  useEffect(() => {
    if (!selectedExerciseId) return;
    if (weight || reps || duration || distance) return;
    const last = findLastSetForExercise(selectedExerciseId);
    if (!last) return;

    setIsWarmup(last.isWarmup);
    setWeight(last.weight != null ? String(last.weight) : '');
    setReps(last.reps != null ? String(last.reps) : '');
    setDuration(last.durationMinutes != null ? String(last.durationMinutes) : '');
    setDistance(last.distance != null ? String(last.distance) : '');
  }, [selectedExerciseId, sets, weight, reps, duration, distance]);

  const handleAddSet = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedExerciseId) return;
    await saveSetForWorkout(db, workoutId, selectedExerciseId, {
      isWarmup,
      weight: weight ? Number(weight) : undefined,
      reps: reps ? Number(reps) : undefined,
      durationMinutes: duration ? Number(duration) : undefined,
      distance: distance ? Number(distance) : undefined
    });
    const details = await getWorkoutDetails(db, workoutId);
    setSets(details.sets);
    setWeight('');
    setReps('');
    setDuration('');
    setDistance('');

    setRestRemainingSeconds(restTotalSeconds);
    setIsRestActive(true);
  };

  const handleFinish = async () => {
    await finishWorkout(db, workoutId);
    navigate('/history');
  };

  const handleToggleCompleted = async (exerciseId: number, completed: boolean) => {
    setExerciseCompletedState((prev) => ({ ...prev, [exerciseId]: completed }));
    await setExerciseCompleted(db, workoutId, exerciseId, completed);
  };

  const grouped = useMemo(() => {
    const map = new Map<number, SetRecord[]>();
    for (const s of sets) {
      const list = map.get(s.exerciseId) ?? [];
      list.push(s);
      map.set(s.exerciseId, list);
    }
    return map;
  }, [sets]);

  if (!workout) {
    return <p className="text-sm text-slate-400">載入訓練中...</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-100 mb-2">進行中訓練</h2>

      {restRemainingSeconds !== null && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-300 mb-1">休息倒數</div>
              <div className="text-slate-100 text-sm font-semibold">
                {Math.max(restRemainingSeconds, 0)} 秒
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700"
                onClick={() => setRestRemainingSeconds(prev => (prev ?? 0) + 10)}
              >
                +10s
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700"
                onClick={() => setRestRemainingSeconds(prev => Math.max((prev ?? 0) - 10, 0))}
              >
                -10s
              </button>
            </div>
          </div>
          
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            {isRestActive && restRemainingSeconds > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min((restRemainingSeconds / restTotalSeconds) * 100, 100)}%` }}
              />
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className="text-slate-400">預設：</span>
               <select 
                 value={restTotalSeconds}
                 onChange={(e) => setRestTotalSeconds(Number(e.target.value))}
                 className="bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-slate-200"
               >
                 <option value={30}>30s</option>
                 <option value={60}>60s</option>
                 <option value={90}>90s</option>
                 <option value={120}>120s</option>
                 <option value={180}>180s</option>
               </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded bg-slate-800 text-slate-200"
                onClick={() => {
                  setRestRemainingSeconds(restTotalSeconds);
                  setIsRestActive(true);
                }}
              >
                重設
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded bg-slate-800 text-slate-200"
                onClick={() => {
                  setIsRestActive(false);
                  setRestRemainingSeconds(null);
                }}
              >
                停止
              </button>
            </div>
          </div>
        </section>
      )}

      <form onSubmit={handleAddSet} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm">
        <div className="space-y-1">
          <label className="text-xs text-slate-400">動作</label>
          <select
            value={selectedExerciseId ?? ''}
            onChange={(e) => {
              setSelectedExerciseId(Number(e.target.value));
              setWeight('');
              setReps('');
              setDuration('');
              setDistance('');
            }}
            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-300">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={isWarmup}
              onChange={(e) => setIsWarmup(e.target.checked)}
              className="accent-emerald-500"
            />
            熱身組
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <input
            type="number"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="重量 (kg)"
            className="rounded bg-slate-900 border border-slate-700 px-2 py-1"
          />
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="次數"
            className="rounded bg-slate-900 border border-slate-700 px-2 py-1"
          />
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="時間 (分鐘，可選)"
            className="rounded bg-slate-900 border border-slate-700 px-2 py-1 col-span-1"
          />
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="距離 (km，可選)"
            className="rounded bg-slate-900 border border-slate-700 px-2 py-1 col-span-1"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-500 text-slate-950 font-semibold py-2 text-sm mt-1"
        >
          新增一組
        </button>
      </form>

      <section className="space-y-2 text-xs">
        {exercises.map((ex) => {
          const setList = grouped.get(ex.id!) ?? [];
          if (setList.length === 0) return null;
          return (
            <div key={ex.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-slate-100 flex items-center gap-2">
                  <span className={exerciseCompleted[ex.id!] ? 'text-emerald-300' : ''}>{ex.name}</span>
                </div>
                <label className="flex items-center gap-1 text-xs text-emerald-300">
                  <input
                    type="checkbox"
                    checked={!!exerciseCompleted[ex.id!]}
                    onChange={(e) => handleToggleCompleted(ex.id!, e.target.checked)}
                    className="accent-emerald-500"
                  />
                  完成
                </label>
              </div>
              <div className="space-y-1">
                {setList.map((s) => (
                  <div key={s.id} className="flex justify-between text-slate-300">
                    <span>{s.isWarmup ? '熱身' : '正式'}</span>
                    <span>
                      {s.weight && s.reps && `${s.weight}kg × ${s.reps}`}
                      {s.durationMinutes && ` · ${s.durationMinutes} 分`}
                      {s.distance && ` · ${s.distance} km`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <div className="mt-4">
        <textarea
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500"
          placeholder="訓練筆記..."
          rows={2}
          value={workout?.note || ''}
          onChange={async (e) => {
            const val = e.target.value;
            setWorkout(prev => prev ? { ...prev, note: val } : null);
            await db.workouts.update(workoutId, { note: val });
          }}
        />
      </div>

      <button
        onClick={handleFinish}
        className="w-full rounded-lg bg-slate-800 text-slate-50 py-2 text-sm mt-2"
      >
        結束訓練
      </button>
    </div>
  );
}
