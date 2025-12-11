import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, WeeklySummary, getCurrentAndLastWeekSummary, WorkoutTemplate, startWorkoutFromTemplate, BodyMeasurement, getBodyMeasurements, addBodyMeasurement, deleteBodyMeasurement } from '@/db';

function Heatmap() {
  const [activity, setActivity] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const workouts = await db.workouts.toArray();
      const map: Record<string, boolean> = {};
      workouts.forEach(w => {
        const date = new Date(w.startTime).toLocaleDateString('en-CA');
        map[date] = true;
      });
      setActivity(map);
    })();
  }, []);

  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return d;
  });

  return (
    <div className="flex gap-1">
      {days.map((d, i) => {
        const dateStr = d.toLocaleDateString('en-CA');
        const active = activity[dateStr];
        return (
          <div
            key={i}
            className={`w-2 h-2 rounded-sm transition-colors ${
              active
                ? 'bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.9)]'
                : 'bg-slate-800/80'
            }`}
            title={dateStr}
          />
        );
      })}
    </div>
  );
}

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
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
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

      await reloadMeasurements();
    })();
  }, []);

  const reloadMeasurements = async () => {
    const m = await getBodyMeasurements(db);
    setMeasurements(m);
  };

  const handleQuickStart = async () => {
    if (!lastTemplate?.id) return;
    const workoutId = await startWorkoutFromTemplate(db, lastTemplate.id);
    navigate(`/workout/${workoutId}`);
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden fiting-card border-emerald-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-[-48px] h-40 w-40 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative flex items-start justify-between mb-4">
          <div>
            <h2 className="fiting-section-title text-emerald-400">本週概況</h2>
            <p className="text-xs text-slate-400 mt-1">過去 7 天的訓練節奏與累積量</p>
          </div>
          <div className="fiting-pill-muted">
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">STREAK</span>
            <Heatmap />
          </div>
        </div>

        {!summary ? (
          <p className="relative text-slate-400 text-sm">載入中...</p>
        ) : (
          <div className="relative grid grid-cols-2 gap-3 pt-1">
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

      <section className="fiting-card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="fiting-section-title">體重追蹤</h2>
          <button 
            onClick={() => setShowWeightModal(true)}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            + 紀錄
          </button>
        </div>
        
        {measurements.length === 0 ? (
          <p className="text-sm text-slate-500">尚無體重紀錄</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-50">
                {measurements[measurements.length - 1].weight}
              </span>
              <span className="text-sm text-slate-400">kg</span>
              {measurements.length > 1 && (
                <span className={`text-xs ${
                  measurements[measurements.length - 1].weight < measurements[measurements.length - 2].weight 
                    ? 'text-emerald-400' 
                    : 'text-rose-400'
                }`}>
                  {measurements[measurements.length - 1].weight < measurements[measurements.length - 2].weight ? '↓' : '↑'}
                  {Math.abs(measurements[measurements.length - 1].weight - measurements[measurements.length - 2].weight).toFixed(1)}
                </span>
              )}
            </div>
            
            {/* Simple Chart */}
            <div className="h-24 flex items-end gap-1 pt-4 border-t border-slate-800/50">
              {(() => {
                const recent = measurements.slice(-7);
                const min = Math.min(...recent.map(m => m.weight)) - 1;
                const max = Math.max(...recent.map(m => m.weight)) + 1;
                const range = max - min;
                
                return recent.map((m, i) => (
                  <div key={m.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div 
                      className="w-full bg-emerald-500/20 rounded-t hover:bg-emerald-500/40 transition-colors relative"
                      style={{ height: `${((m.weight - min) / range) * 100}%` }}
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-200 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {m.weight}kg
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(m.date).getDate()}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </section>

      <section className="fiting-card">
        <h2 className="fiting-section-title mb-2">快速開始</h2>
        <p className="text-sm text-slate-400 mb-3">從模板選擇訓練，或查看最近一次訓練。</p>
        
        {lastTemplate && (
          <button
            onClick={handleQuickStart}
            className="w-full mb-3 flex items-center justify-center fiting-cta-primary"
          >
            再次進行「{lastTemplate.name}」
          </button>
        )}

        <div className="flex gap-2">
          <a
            href="/start"
            className="flex-1 inline-flex items-center justify-center rounded-full bg-slate-900 text-slate-100 text-sm font-semibold py-2 hover:bg-slate-800 border border-slate-700/70"
          >
            從模板開始訓練
          </a>
          <a
            href="/history"
            className="flex-1 inline-flex items-center justify-center rounded-full border border-slate-700/70 text-slate-300 text-sm py-2 hover:bg-slate-900/60"
          >
            查看歷史
          </a>
        </div>
      </section>

      {showWeightModal && (
        <WeightModal 
          onClose={() => setShowWeightModal(false)} 
          onSave={async (w) => {
            await addBodyMeasurement(db, {
                date: new Date().toISOString().split('T')[0],
                weight: w
            });
            await reloadMeasurements();
            setShowWeightModal(false);
          }}
        />
      )}
    </div>
  );
}

function WeightModal({ onClose, onSave }: { onClose: () => void; onSave: (weight: number) => void }) {
    const [weight, setWeight] = useState('');
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl space-y-4">
                <h3 className="text-lg font-semibold text-slate-100 text-center">紀錄今日體重</h3>
                <div className="flex items-center justify-center gap-2">
                    <input 
                        type="number" 
                        step="0.1"
                        autoFocus
                        className="w-24 text-center bg-slate-950 border border-slate-700 rounded-lg py-2 text-xl text-slate-50 focus:border-emerald-500 outline-none"
                        placeholder="0.0"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                    />
                    <span className="text-slate-400">kg</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                        取消
                    </button>
                    <button 
                        onClick={() => weight && onSave(Number(weight))}
                        disabled={!weight}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 text-slate-50 hover:bg-emerald-500 disabled:opacity-50"
                    >
                        儲存
                    </button>
                </div>
            </div>
        </div>
    );
}
