import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, WeeklySummary, getCurrentAndLastWeekSummary, WorkoutTemplate, startWorkoutFromTemplate, BodyMeasurement, getBodyMeasurements, addBodyMeasurement, deleteBodyMeasurement, Exercise, SetRecord, saveSetForWorkout, getTemplateWithExercises } from '@/db';

interface TodayExercise {
  id: string;
  setId: number;
  exerciseId: number;
  exerciseName: string;
  sets: number;
  reps: number;
  weight?: number;
  addedAt: string;
}

function Heatmap() {
  const [activity, setActivity] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const workouts = await db.workouts.toArray();
      const map: Record<string, boolean> = {};
      workouts.forEach(w => {
        // Use local date string for consistency
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
            className={`w-2 h-2 rounded-sm ${active ? 'bg-emerald-500' : 'bg-white'}`}
            title={dateStr}
          />
        );
      })}
    </div>
  );
}

function ExpandableSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-sm mb-3 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 px-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
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
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="font-medium text-slate-900">{value}</span>
        <span className={`text-xs ${color}`}>{deltaLabel}</span>
      </div>
    </div>
  );
}

function formatDelta(delta: number | null): { label: string; color: string } {
  if (delta === null) return { label: '-', color: 'text-slate-600' };
  if (Math.abs(delta) < 2) return { label: '持平', color: 'text-slate-600' };
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? 'text-emerald-600' : 'text-rose-600';
  return { label: `${sign}${delta.toFixed(1)}%`, color };
}

export default function Dashboard() {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [lastTemplate, setLastTemplate] = useState<WorkoutTemplate | null>(null);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [todayExercises, setTodayExercises] = useState<TodayExercise[]>([]);
  const [currentWorkoutId, setCurrentWorkoutId] = useState<number | null>(null);
  
  // Exercise input state
  const [selectedExerciseName, setSelectedExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Template lists
  const [allTemplates, setAllTemplates] = useState<WorkoutTemplate[]>([]);

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

      const templates = await db.templates.toArray();
      setAllTemplates(templates);

      await reloadMeasurements();
      await loadExercises();
      await loadTodayExercises();
    })();
  }, []);

  const reloadMeasurements = async () => {
    const m = await getBodyMeasurements(db);
    setMeasurements(m);
  };

  const loadExercises = async () => {
    const exs = await db.exercises.toArray();
    setExercises(exs);
  };

  const loadTodayExercises = async () => {
    // Get or create today's workout
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    let todayWorkout = await db.workouts.where('startTime')
      .belowOrEqual(todayEnd.toISOString())
      .reverse()
      .first();

    if (!todayWorkout || new Date(todayWorkout.startTime) < todayStart) {
      // Create new workout for today
      const id = await (db.workouts as any).add({
        templateId: null,
        startTime: new Date().toISOString()
      });
      todayWorkout = await db.workouts.get(id);
    }

    setCurrentWorkoutId(todayWorkout?.id || null);

    if (todayWorkout?.id) {
      const sets = await db.sets.where('workoutId').equals(todayWorkout.id).toArray();
      const today: TodayExercise[] = [];
      
      for (const set of sets) {
        const exercise = await db.exercises.get(set.exerciseId);
        if (exercise) {
          today.push({
            id: `${set.id}`,
            setId: set.id || 0,
            exerciseId: set.exerciseId,
            exerciseName: exercise.name,
            sets: 1,
            reps: set.reps || 0,
            weight: set.weight,
            addedAt: new Date().toISOString()
          });
        }
      }
      
      setTodayExercises(today);
    }
  };

  const handleAddExercise = async () => {
    if (!selectedExerciseName.trim() || !sets.trim() || !reps.trim()) {
      alert('請填寫所有欄位');
      return;
    }

    if (!currentWorkoutId) return;

    try {
      // Find or create exercise
      let exerciseId: number | undefined;
      const existing = exercises.find(e => e.name === selectedExerciseName);
      if (existing?.id) {
        exerciseId = existing.id;
      } else {
        exerciseId = await (db.exercises as any).add({
          name: selectedExerciseName.trim(),
          type: 'strength'
        });
        await loadExercises();
      }

      // Save set record
      const setCount = parseInt(sets);
      const repCount = parseInt(reps);
      
      for (let i = 0; i < setCount; i++) {
        await saveSetForWorkout(db, currentWorkoutId, exerciseId, {
          isWarmup: false,
          reps: repCount
        });
      }

      // Clear form and reload
      setSelectedExerciseName('');
      setSets('');
      setReps('');
      setShowExerciseDropdown(false);
      await loadTodayExercises();
    } catch (error) {
      console.error('Error adding exercise:', error);
      alert('添加動作失敗');
    }
  };

  const handleCountSet = async (exercise: TodayExercise) => {
    try {
      const setRecord = await db.sets.get(exercise.setId);
      if (setRecord) {
        setRecord.reps = (setRecord.reps || 0) + 1;
        await db.sets.put(setRecord);
        await loadTodayExercises();
      }
    } catch (error) {
      console.error('Error updating set:', error);
    }
  };

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(selectedExerciseName.toLowerCase())
  );

  const handleStartTemplate = async (templateId: number) => {
    const workoutId = await startWorkoutFromTemplate(db, templateId);
    navigate(`/workout/${workoutId}`);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Weekly Summary */}
      <ExpandableSection title="本週概況" defaultOpen={false}>
        {!summary ? (
          <p className="text-slate-600 text-sm">載入中...</p>
        ) : (
          <div className="space-y-2">
            <div className="mb-2">
              <Heatmap />
            </div>
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
              label="總組數"
              value={summary.current.totalSets}
              delta={summary.delta.totalSets}
            />
            <StatRow
              label="總重量"
              value={`${Math.round(summary.current.totalWeight)} kg`}
              delta={summary.delta.totalWeight}
            />
          </div>
        )}
      </ExpandableSection>

      {/* Weight Tracking */}
      <ExpandableSection title="體重追蹤">
        {measurements.length === 0 ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">尚無體重紀錄</p>
            <button 
              onClick={() => setShowWeightModal(true)}
              className="text-xs text-emerald-600 hover:text-emerald-500"
            >
              + 紀錄
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-900">
                  {measurements[measurements.length - 1].weight}
                </span>
                <span className="text-xs text-slate-600">kg</span>
                {measurements.length > 1 && (
                  <span className={`text-xs ${
                    measurements[measurements.length - 1].weight < measurements[measurements.length - 2].weight 
                      ? 'text-emerald-600' 
                      : 'text-rose-600'
                  }`}>
                    {measurements[measurements.length - 1].weight < measurements[measurements.length - 2].weight ? '↓' : '↑'}
                    {Math.abs(measurements[measurements.length - 1].weight - measurements[measurements.length - 2].weight).toFixed(1)}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setShowWeightModal(true)}
                className="text-xs text-emerald-600 hover:text-emerald-500"
              >
                + 紀錄
              </button>
            </div>
            
            {/* Simple Chart */}
            <div className="h-20 flex items-end gap-1 pt-2 border-t border-slate-200/50">
              {(() => {
                const recent = measurements.slice(-7);
                const min = Math.min(...recent.map(m => m.weight)) - 1;
                const max = Math.max(...recent.map(m => m.weight)) + 1;
                const range = max - min;
                
                return recent.map((m, i) => (
                  <div key={m.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div 
                      className="w-full bg-emerald-500/20 rounded-t hover:bg-emerald-500/40 transition-colors"
                      style={{ height: `${((m.weight - min) / range) * 100}%`, minHeight: '4px' }}
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {m.weight}kg
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-600">
                      {new Date(m.date).getDate()}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </ExpandableSection>

      {/* Exercise Input Section */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">快速輸入動作</h3>
        <div className="space-y-2">
          {/* Exercise Name Selection */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜尋或輸入動作名稱"
              value={selectedExerciseName}
              onChange={(e) => {
                setSelectedExerciseName(e.target.value);
                setShowExerciseDropdown(true);
              }}
              onFocus={() => setShowExerciseDropdown(true)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base text-slate-900 placeholder-slate-500 focus:border-emerald-500 outline-none"
            />
            {showExerciseDropdown && filteredExercises.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-10">
                {filteredExercises.slice(0, 5).map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setSelectedExerciseName(ex.name);
                      setShowExerciseDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-white first:rounded-t-lg last:rounded-b-lg"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sets and Reps */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-600 block mb-1">組數</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">次數</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setReps(String(Math.max(0, parseInt(reps || '0') - 1)))}
                  className="btn-control flex-1 text-lg"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base text-slate-900 text-center focus:border-emerald-500 outline-none"
                />
                <button
                  onClick={() => setReps(String(parseInt(reps || '0') + 1))}
                  className="btn-control flex-1 text-lg"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleAddExercise}
            disabled={!selectedExerciseName.trim() || !sets.trim() || !reps.trim()}
            className="btn-primary mt-4"
          >
            保存動作
          </button>
        </div>
      </div>

      {/* Today's Exercises */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">今日訓練</h3>
        
        {todayExercises.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm text-slate-600">尚無訓練紀錄，請在上方輸入動作</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayExercises.map((exercise) => (
              <div key={exercise.id} className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-4">
                {/* Exercise Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-gray-900">{exercise.exerciseName}</p>
                    <p className="text-xs text-gray-500 mt-1">{exercise.sets} 組</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedExerciseName(exercise.exerciseName);
                      setSets(String(exercise.sets));
                      setReps(String(exercise.reps));
                      setEditingId(exercise.id);
                    }}
                    className="text-xs px-2.5 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                  >
                    編輯
                  </button>
                </div>

                {/* Rep Counter */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-600">{exercise.reps}</span>
                    <span className="text-sm text-gray-500">次</span>
                  </div>
                  <button
                    onClick={() => handleCountSet(exercise)}
                    className="btn-primary px-6 w-auto"
                  >
                    計次 +1
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Start Section & Templates */}
      <div className="bg-transparent">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 ml-1">選擇模板開始訓練</h3>
        
        {lastTemplate && (
          <button
            onClick={() => handleStartTemplate(lastTemplate.id!)}
            className="btn-primary mb-3 flex items-center justify-center bg-emerald-700 hover:bg-emerald-600"
          >
            再次進行「{lastTemplate.name}」
          </button>
        )}

        <div className="space-y-3">
          {allTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleStartTemplate(t.id!)}
              className="w-full rounded-xl bg-white shadow-sm p-5 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="font-bold text-base text-slate-900 mb-1">{t.name}</div>
              <TemplateSummary templateId={t.id!} />
            </button>
          ))}
          {allTemplates.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center bg-white shadow-sm">
              <p className="text-sm text-slate-600 mb-3">還沒有訓練模板</p>
              <a href="/programs" className="btn-sm inline-flex justify-center text-emerald-600">
                建立模板
              </a>
            </div>
          )}
        </div>
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4 shadow-2xl space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 text-center">紀錄今日體重</h3>
                <div className="flex items-center justify-center gap-2">
                    <input 
                        type="number" 
                        step="0.1"
                        autoFocus
                        className="w-24 text-center bg-slate-50 border border-slate-300 rounded-lg py-2 text-xl text-slate-900 focus:border-emerald-500 outline-none"
                        placeholder="0.0"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                    />
                    <span className="text-slate-600">kg</span>
                </div>
                <div className="btn-group-sm">
                    <button 
                        onClick={onClose}
                        className="btn-secondary py-2 text-sm"
                    >
                        取消
                    </button>
                    <button 
                        onClick={() => weight && onSave(Number(weight))}
                        disabled={!weight}
                        className="btn-primary py-2 text-sm"
                    >
                        儲存
                    </button>
                </div>
            </div>
        </div>
    );
}

function TemplateSummary({ templateId }: { templateId: number }) {
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    (async () => {
      const detailed = await getTemplateWithExercises(db, templateId);
      setSummary(detailed.exercises.map((e: Exercise) => e.name).join(' · '));
    })();
  }, [templateId]);

  return <p className="text-xs text-slate-600 truncate">{summary}</p>;
}
