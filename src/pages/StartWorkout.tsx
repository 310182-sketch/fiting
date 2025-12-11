import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, WorkoutTemplate, Exercise, getTemplateWithExercises, startWorkoutFromTemplate } from '@/db';

export default function StartWorkout() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const allTemplates = await db.templates.toArray();
      setTemplates(allTemplates);
    })();
  }, []);

  const handleStart = async (templateId: number) => {
    const workoutId = await startWorkoutFromTemplate(db, templateId);
    navigate(`/workout/${workoutId}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="fiting-section-title">選擇模板開始訓練</h2>
        <p className="text-xs text-slate-500 mt-1">挑一套課表，快速進入今天的訓練模式。</p>
      </div>
      <div className="space-y-3">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => handleStart(t.id!)}
            className="w-full text-left text-sm fiting-card-soft px-3 py-2 hover:border-emerald-500/50 transition-colors"
          >
            <div className="font-medium text-slate-50 mb-1">{t.name}</div>
            <TemplateSummary templateId={t.id!} />
          </button>
        ))}
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

  return <p className="text-xs text-slate-400 truncate">{summary}</p>;
}
