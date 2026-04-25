import { useEffect, useState } from 'react';
import {
  db,
  Exercise,
  WorkoutTemplate,
  getTemplateWithExercises,
  createTemplate,
  updateTemplate,
  deleteTemplateSafely
} from '@/db';

type TemplateWithExercises = {
  template: WorkoutTemplate;
  exercises: Exercise[];
};

export default function Templates() {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await reloadTemplates();
      const ex = await db.exercises.orderBy('name').toArray();
      setAllExercises(ex);
    })();
  }, []);

  const reloadTemplates = async () => {
    const allTemplates = await db.templates.toArray();
    const detailed = await Promise.all(
      allTemplates.map((t) => getTemplateWithExercises(db, t.id!))
    );
    setTemplates(detailed);
  };

  const beginCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setName('');
    setSelectedIds([]);
    setError(null);
  };

  const beginEdit = (tpl: WorkoutTemplate) => {
    setIsCreating(false);
    setEditingId(tpl.id!);
    setName(tpl.name);
    setSelectedIds(tpl.exerciseIds || []);
    setError(null);
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingId(null);
    setName('');
    setSelectedIds([]);
    setError(null);
  };

  const toggleExercise = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setError(null);
      if (isCreating) {
        await createTemplate(db, name, selectedIds);
      } else if (editingId != null) {
        await updateTemplate(db, editingId, name, selectedIds);
      }
      await reloadTemplates();
      cancelEdit();
    } catch (err: any) {
      if (err?.message === 'TEMPLATE_NAME_REQUIRED') {
        setError('請輸入模板名稱');
      } else if (err?.message === 'TEMPLATE_NAME_TOO_LONG') {
        setError('名稱太長，請縮短一點（最多 50 個字）');
      } else {
        setError('儲存失敗，請稍後再試');
      }
    }
  };

  const handleDelete = async (tpl: WorkoutTemplate) => {
    const usage = await deleteTemplateSafely(db, tpl.id!);
    if (usage > 0) {
      alert(`已刪除模板「${tpl.name}」。過去有 ${usage} 次訓練曾使用此模板，但訓練紀錄本身仍會保留。`);
    }
    await reloadTemplates();
    if (editingId === tpl.id) {
      cancelEdit();
    }
  };

  const hasEditor = isCreating || editingId != null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-900 border-l-4 border-emerald-500 pl-2">訓練模板集</h2>
        <button
          onClick={beginCreate}
          className="btn-primary py-2 px-3 text-xs"
        >
          新增模板
        </button>
      </div>

      <div className="space-y-3">
        {templates.length === 0 && (
          <p className="text-xs text-slate-600">
            目前還沒有自訂模板，先新增一個常用課表吧。
          </p>
        )}
        {templates.map(({ template, exercises }) => (
          <div
            key={template.id}
            className="rounded-lg border border-slate-200 bg-white/60 px-3 py-2 text-sm flex items-start justify-between gap-2"
          >
            <div>
              <div className="font-medium text-slate-900 mb-1">{template.name}</div>
              <div className="text-slate-600 flex flex-wrap gap-1">
                {exercises.length > 0 ? (
                  exercises.map((e) => (
                    <span
                      key={e.id}
                      className="px-2 py-0.5 rounded-full bg-white text-xs text-slate-900"
                    >
                      {e.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-600">目前沒有預設動作</span>
                )}
              </div>
            </div>
            <div className="btn-group-sm">
              <button
                onClick={() => beginEdit(template)}
                className="btn-xs"
              >
                編輯
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `確定要刪除模板「${template.name}」嗎？此動作無法復原。`
                    )
                  ) {
                    void handleDelete(template);
                  }
                }}
                className="btn-xs hover:border-rose-500 hover:text-rose-500"
              >
                刪除
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasEditor && (
        <section className="mt-2 rounded-xl border border-slate-200 bg-white/70 p-3 space-y-2 text-sm">
          <h3 className="text-xs font-semibold text-slate-900 mb-1">
            {isCreating ? '新增模板' : '編輯模板'}
          </h3>
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-600">模板名稱</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-500"
                placeholder="例如：全身力量 A、推拉腿 B"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-600">包含動作（可多選）</label>
              {allExercises.length === 0 ? (
                <p className="text-xs text-slate-600">
                  目前尚未建立任何動作，請先到「設定 &gt; 動作管理」新增動作。
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80 p-2 space-y-1">
                  {allExercises.map((ex) => (
                    <label
                      key={ex.id}
                      className="flex items-center gap-2 text-xs text-slate-900"
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3 rounded border-slate-600 bg-white"
                        checked={selectedIds.includes(ex.id!)}
                        onChange={() => toggleExercise(ex.id!)}
                      />
                      <span>{ex.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="btn-group-sm justify-end pt-1 text-xs">
            <button
              type="button"
              onClick={cancelEdit}
              className="btn-xs px-3 py-1"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary btn-sm disabled:opacity-40"
              disabled={!name.trim()}
            >
              儲存
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
