import { useEffect, useState } from 'react';
import { db, Workout, getWorkoutDetails, Exercise, SetRecord } from '@/db';
import ShareModal from '@/components/ShareModal';

export default function History() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [shareWorkoutId, setShareWorkoutId] = useState<number | null>(null);

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
      <div>
        <h2 className="fiting-section-title">歷史訓練</h2>
        <p className="text-xs text-slate-500 mt-1">回顧每次訓練，觀察自己的節奏與進步。</p>
      </div>
      <div className="space-y-3">
        {workouts.length === 0 && (
          <div className="fiting-card-soft p-4 text-center text-sm text-slate-400">
            尚無訓練紀錄，從「開始」頁面建立第一筆吧。
          </div>
        )}
        {workouts.map((w) => (
          <HistoryItem
            key={w.id}
            workout={w}
            onClick={() => setSelectedWorkoutId(w.id!)}
            onShare={() => setShareWorkoutId(w.id!)}
          />
        ))}
      </div>
      {shareWorkoutId && (
        <ShareModal 
          workoutId={shareWorkoutId} 
          onClose={() => setShareWorkoutId(null)} 
        />
      )}
    </div>
  );
}

function HistoryItem({ workout, onClick, onShare }: { workout: Workout; onClick: () => void; onShare: () => void }) {
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    (async () => {
      const details = await getWorkoutDetails(db, workout.id!);
      const totalSets = details.sets.filter((s) => !s.isWarmup).length;
      setSummary(`${details.template?.name ?? '未指定模板'} · 正式組 ${totalSets} 組`);
    })();
  }, [workout.id]);

  const date = new Date(workout.startTime);

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 fiting-card-soft cursor-pointer hover:border-emerald-500/50 transition-colors"
    >
      <div>
        <div className="font-medium text-slate-200 text-sm">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {summary || '載入中...'}
        </div>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onShare();
        }}
        className="p-2 text-slate-400 hover:text-emerald-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      </button>
    </div>
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
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onBack}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
        >
          返回
        </button>
        <h2 className="text-sm font-semibold text-slate-100">訓練詳情</h2>
      </div>

      <div className="fiting-card-soft p-4 space-y-2">
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
