import { FormEvent, useEffect, useState } from 'react';
import { db, AppSettings, WeightUnit, Exercise, exportAllData, importAllData, getExerciseHistory, ExerciseHistoryPoint } from '@/db';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'strength' | 'cardio'>('strength');
  const [newBodyPart, setNewBodyPart] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'strength' | 'cardio'>('strength');
  const [editBodyPart, setEditBodyPart] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const s = await db.settings.get(1);
      if (s) setSettings(s);

      await reloadExercises();
    })();
  }, []);

  const reloadExercises = async () => {
    const ex = await db.exercises.orderBy('name').toArray();
    setExercises(ex);
  };

  const handleUnitChange = async (unit: WeightUnit) => {
    const next: AppSettings = { id: 1, weightUnit: unit };
    await db.settings.put(next);
    setSettings(next);
  };

  const handleExport = async () => {
    const blob = await exportAllData(db);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiting-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: FormEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importAllData(db, text);
    const s = await db.settings.get(1);
    if (s) setSettings(s);
    await reloadExercises();
    e.currentTarget.value = '';
  };

  const handleAddExercise = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const exercise: Omit<Exercise, 'id'> = {
      name: trimmed,
      type: newType,
      bodyPart: newBodyPart.trim() || undefined,
    };

    await db.exercises.add(exercise as Exercise);
    await reloadExercises();

    setNewName('');
    setNewBodyPart('');
  };

  const beginEdit = (ex: Exercise) => {
    setEditingId(ex.id ?? null);
    setEditName(ex.name);
    setEditType(ex.type);
    setEditBodyPart(ex.bodyPart ?? '');
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditType('strength');
    setEditBodyPart('');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (editingId == null) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('請輸入動作名稱');
      return;
    }
    if (trimmed.length > 50) {
      setEditError('名稱太長，請縮短一點（最多 50 個字）');
      return;
    }
    const body = editBodyPart.trim();
    await db.exercises.update(editingId, {
      name: trimmed,
      type: editType,
      bodyPart: body || undefined,
    });
    await reloadExercises();
    cancelEdit();
  };

  const handleDeleteExercise = async (ex: Exercise) => {
    if (!ex.id) return;
    const setsCount = await db.sets.where('exerciseId').equals(ex.id).count();
    const templates = await db.templates.toArray();
    const templateUsage = templates.filter((t) => t.exerciseIds?.includes(ex.id!)).length;

    if (setsCount > 0 || templateUsage > 0) {
      alert(
        `無法刪除「${ex.name}」，因為已有訓練或模板使用此動作。為了保留歷史紀錄，目前不支援刪除此類動作。`
      );
      return;
    }

    if (
      !window.confirm(
        `確定要刪除動作「${ex.name}」嗎？此動作將從清單中移除，且無法復原。`
      )
    ) {
      return;
    }

    await db.exercises.delete(ex.id);
    await reloadExercises();
    if (editingId === ex.id) {
      cancelEdit();
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-2">重量單位</h2>
        <div className="flex gap-2 text-sm">
          {(['kg', 'lb'] as WeightUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => handleUnitChange(u)}
              className={`flex-1 rounded-lg border px-3 py-2 ${
                settings?.weightUnit === u
                  ? 'border-emerald-600 bg-emerald-600/10 text-emerald-700'
                  : 'border-slate-300 bg-white text-slate-800'
              }`}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2 text-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">資料備份</h2>
        <div className="btn-group-sm">
          <button
            onClick={handleExport}
            className="btn-secondary text-sm py-2"
          >
            匯出 JSON
          </button>
          <label className="btn-secondary text-sm py-2 text-center cursor-pointer">
            匯入JSON
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>
        </div>
        <p className="text-xs text-slate-600">
          備份檔包含所有動作、模板、訓練與設定。匯入時會覆蓋現有資料。
        </p>
      </section>

      <section className="space-y-3 text-sm">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">動作管理</h2>

        <form onSubmit={handleAddExercise} className="space-y-2">
          <div className="flex flex-col gap-2">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500"
              placeholder="動作名稱（例如：深蹲）"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'strength' | 'cardio')}
              >
                <option value="strength">力量</option>
                <option value="cardio">有氧</option>
              </select>
              <input
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500"
                placeholder="部位（選填，例如：腿、胸、背）"
                value={newBodyPart}
                onChange={(e) => setNewBodyPart(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={!newName.trim()}
          >
            新增動作
          </button>
        </form>

        {exercises.length > 0 ? (
          <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white/60 p-2">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-slate-900"
              >
                <div>
                  <div className="font-medium">{ex.name}</div>
                  <div className="flex gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        ex.type === 'strength'
                          ? 'bg-emerald-600/10 text-emerald-700 border border-emerald-600/30'
                          : 'bg-sky-600/10 text-sky-700 border border-sky-600/30'
                      }`}
                    >
                      {ex.type === 'strength' ? '力量' : '有氧'}
                    </span>
                    {ex.bodyPart && (
                      <span className="inline-flex items-center rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-700">
                        {ex.bodyPart}
                      </span>
                    )}
                  </div>
                </div>
                <div className="btn-group-sm">
                  <button
                    type="button"
                    onClick={() => setViewingHistoryId(ex.id!)}
                    className="btn-xs flex-1"
                  >
                    歷史
                  </button>
                  <button
                    type="button"
                    onClick={() => beginEdit(ex)}
                    className="btn-xs flex-1"
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteExercise(ex)}
                    className="btn-xs flex-1 hover:border-rose-500 hover:text-rose-500"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600">目前的動作只有預設清單，你可以在這裡新增常用的動作。</p>
        )}
      </section>

      {editingId !== null && (
        <section className="space-y-2 text-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">編輯動作</h2>
          <div className="space-y-2">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500"
              placeholder="動作名稱"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={editType}
                onChange={(e) => setEditType(e.target.value as 'strength' | 'cardio')}
              >
                <option value="strength">力量</option>
                <option value="cardio">有氧</option>
              </select>
              <input
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500"
                placeholder="部位（選填，例如：腿、胸、背）"
                value={editBodyPart}
                onChange={(e) => setEditBodyPart(e.target.value)}
              />
            </div>
          </div>
          {editError && <p className="text-xs text-rose-600">{editError}</p>}
          <div className="btn-group-sm justify-end text-xs">
            <button
              type="button"
              onClick={cancelEdit}
              className="btn-xs px-3 py-1 flex-1"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="btn-sm bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-600 px-3 py-1 flex-1 disabled:opacity-40"
              disabled={!editName.trim()}
            >
              儲存變更
            </button>
          </div>
        </section>
      )}
      {viewingHistoryId !== null && (
        <ExerciseHistoryView
          exerciseId={viewingHistoryId}
          onClose={() => setViewingHistoryId(null)}
        />
      )}
    </div>
  );
}

function ExerciseHistoryView({ exerciseId, onClose }: { exerciseId: number; onClose: () => void }) {
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [exerciseName, setExerciseName] = useState('');

  useEffect(() => {
    (async () => {
      const ex = await db.exercises.get(exerciseId);
      if (ex) setExerciseName(ex.name);
      const data = await getExerciseHistory(db, exerciseId);
      setHistory(data);
    })();
  }, [exerciseId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{exerciseName} 歷史紀錄</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-800">
            ✕
          </button>
        </div>
        
        {history.length === 0 ? (
          <p className="text-sm text-slate-600 py-8 text-center">尚無訓練紀錄</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-2 text-sm">
                <span className="text-slate-600 text-xs">{h.date.toLocaleDateString()}</span>
                <div className="flex gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-600">1RM (估)</div>
                    <div className="font-medium text-amber-400">{h.estimated1RM} kg</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-600">最大重量</div>
                    <div className="font-medium text-emerald-600">{h.maxWeight} kg</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-600">最大次數</div>
                    <div className="font-medium text-slate-800">{h.maxReps}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
