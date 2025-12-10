import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, WeeklySummary, getCurrentAndLastWeekSummary, WorkoutTemplate, startWorkoutFromTemplate } from '@/db';

function formatDelta(delta: number | null): { label: string; color: string } {
  if (delta === null) return { label: '-', color: 'text-slate-400' };
  if (Math.abs(delta) < 2) return { label: '持平', color: 'text-slate-400' };
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? 'text-emerald-400' : 'text-rose-400';
  return { label: `${sign}${delta.toFixed(1)}%`, color };
}

function StatRow({
  label,
  value,
  delta
}: {
  label: string;
  value: string | number;
  delta: number | null;
}) {
  const { label: deltaLabel, color } = formatDelta(delta);
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-medium text-slate-50">{value}</span>
        <span className={`text-xs ${color}`}>{deltaLabel}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [lastTemplate, setLastTemplate] = useState<WorkoutTemplate | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const s = await getCurrentAndLastWeekSummary(db);
      setSummary(s);

      const lastWorkout = await db.workouts.orderBy('startTime').reverse().first();
      if (lastWorkout?.templateId) {
        const t = await db.templates.get(lastWorkout.templateId);
        if (t) setLastTemplate(t);
      }
    })();
  }, []);

  const handleQuickStart = async () => {
    if (!lastTemplate?.id) return;
    const workoutId = await startWorkoutFromTemplate(db, lastTemplate.id);
    navigate(`/workout/${workoutId}`);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100 mb-2">本週概況（週一 ~ 週日）</h2>
        {!summary ? (
          <p className="text-slate-500 text-sm">載入中...</p>
        ) : (
          <div className="space-y-2">
            <StatRow
              label="訓練天數"
              value={summary.current.trainingDays}
              delta={summary.delta.trainingDays}
            />
            <StatRow
              label="總訓練時間"
              value={`${Math.round(summary.current.totalMinutes)} 分鐘`}
              delta={summary.delta.totalMinutes}
            />
            <StatRow
              label="總組數（含有氧，排除熱身）"
              value={summary.current.totalSets}
              delta={summary.delta.totalSets}
            />
            <StatRow
              label="總重量（正式力量組）"
              value={`${Math.round(summary.current.totalWeight)} kg`}
              delta={summary.delta.totalWeight}
            />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100 mb-2">快速開始</h2>
        <p className="text-sm text-slate-400 mb-3">從模板選擇訓練，或查看最近一次訓練。</p>
        
        {lastTemplate && (
          <button
            onClick={handleQuickStart}
            className="w-full mb-3 flex items-center justify-center rounded-lg bg-emerald-600 text-slate-50 text-sm font-semibold py-3 hover:bg-emerald-500 transition-colors"
          >
            再次進行「{lastTemplate.name}」
          </button>
        )}

        <div className="flex gap-2">
          <a
            href="/start"
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-slate-800 text-slate-50 text-sm font-semibold py-2 hover:bg-slate-700"
          >
            從模板開始訓練
          </a>
          <a
            href="/history"
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-700 text-slate-100 text-sm py-2"
          >
            查看歷史
          </a>
        </div>
      </section>
    </div>
  );
}
