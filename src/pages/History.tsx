import { useEffect, useState } from 'react';
import { db, Workout, getWorkoutDetails, Exercise, SetRecord } from '@/db';

export default function History() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const all = await db.workouts.orderBy('startTime').reverse().toArray();
      setWorkouts(all);
    })();
  }, []);

  if (selectedWorkoutId !== null) {
    return (
      <WorkoutDetail
        workoutId={selectedWorkoutId}
        onBack={() => setSelectedWorkoutId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-100 mb-2">歷史訓練</h2>
      <div className="space-y-3">
        {workouts.length === 0 && (
          <p className="text-sm text-slate-400">尚無訓練紀錄，從「開始」頁面建立一筆吧。</p>
        )}
        {workouts.map((w) => (
          <HistoryItem
            key={w.id}
            workout={w}
            onClick={() => setSelectedWorkoutId(w.id!)}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryItem({ workout, onClick }: { workout: Workout; onClick: () => void }) {
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    (async () => {
      const details = await getWorkoutDetails(db, workout.id!);
      const date = new Date(workout.startTime);
      const label = date.toLocaleString();
      const totalSets = details.sets.filter((s) => !s.isWarmup).length;
      setSummary(`${label} · ${details.template?.name ?? '未指定模板'} · 正式組 ${totalSets} 組`);
    })();
  }, [workout.id, workout.startTime]);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
    >
      {summary}
    </button>
  );
}

function WorkoutDetail({ workoutId, onBack }: { workoutId: number; onBack: () => void }) {
  const [data, setData] = useState<{
    workout: Workout;
    exercises: Exercise[];
    sets: SetRecord[];
  } | null>(null);

  useEffect(() => {
    getWorkoutDetails(db, workoutId).then((res) => setData(res));
  }, [workoutId]);

  if (!data) return <div className="text-slate-400 text-sm">載入中...</div>;

  const { workout, exercises, sets } = data;
  const date = new Date(workout.startTime).toLocaleString();
  const duration = workout.endTime 
    ? Math.round((new Date(workout.endTime).getTime() - new Date(workout.startTime).getTime()) / 60000)
    : null;

  const handleNoteChange = async (newNote: string) => {
    setData(prev => prev ? { ...prev, workout: { ...prev.workout, note: newNote } } : null);
    await db.workouts.update(workoutId, { note: newNote });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
        >
          返回
        </button>
        <h2 className="text-sm font-semibold text-slate-100">訓練詳情</h2>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-2">
        <div className="text-xs text-slate-400">時間：{date}</div>
        {duration !== null && (
           <div className="text-xs text-slate-400">
             耗時：{duration} 分鐘
           </div>
        )}
        <div className="pt-2 border-t border-slate-800 mt-2">
            <label className="text-xs text-slate-400 block mb-1">訓練筆記</label>
            <textarea
                className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-emerald-500 outline-none resize-none"
                rows={3}
                placeholder="寫點什麼..."
                value={workout.note || ''}
                onChange={(e) => handleNoteChange(e.target.value)}
            />
        </div>
      </div>

      <div className="space-y-4">
        {exercises.map(ex => {
          const exSets = sets.filter(s => s.exerciseId === ex.id);
          if (exSets.length === 0) return null;
          
          return (
            <div key={ex.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <h3 className="text-sm font-medium text-emerald-400 mb-2">{ex.name}</h3>
              <div className="space-y-1">
                {exSets.map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-6 text-slate-500">#{idx + 1}</span>
                    {s.isWarmup && <span className="text-amber-400 text-[10px] border border-amber-400/30 px-1 rounded">熱身</span>}
                    {ex.type === 'strength' ? (
                        <>
                            <span>{s.weight} kg</span>
                            <span>x</span>
                            <span>{s.reps}</span>
                        </>
                    ) : (
                        <>
                            <span>{s.durationMinutes} min</span>
                            {s.distance && <span>({s.distance} km)</span>}
                        </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
