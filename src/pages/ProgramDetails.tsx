import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db, Program, ProgramDay, startWorkoutFromTemplate } from '@/db';

export default function ProgramDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);

  useEffect(() => {
    if (!id) return;
    const pid = parseInt(id);
    db.programs.get(pid).then((p) => setProgram(p ?? null));
    db.programDays.where('programId').equals(pid).toArray().then(d => {
        // Sort by week then day
        d.sort((a, b) => (a.week - b.week) || (a.day - b.day));
        setDays(d);
    });
  }, [id]);

  const startDay = async (templateId: number) => {
    const workoutId = await startWorkoutFromTemplate(db, templateId);
    navigate(`/workout/${workoutId}`);
  };

  if (!program) return <div className="text-sm text-slate-400">載入中...</div>;

  // Group by week
  const weeks: Record<number, ProgramDay[]> = {};
  days.forEach(d => {
    if (!weeks[d.week]) weeks[d.week] = [];
    weeks[d.week].push(d);
  });

  return (
    <div className="space-y-6 pb-20">
      <header className="space-y-2">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-xs mb-1 hover:text-slate-200">
          &larr; 返回計畫列表
        </button>
        <h1 className="text-lg font-semibold text-slate-50">{program.name}</h1>
        <p className="text-xs text-slate-500">{program.description}</p>
      </header>

      <div className="space-y-6">
        {Object.entries(weeks).map(([weekNum, weekDays]) => (
          <div key={weekNum} className="space-y-3">
            <h3 className="text-xs font-semibold text-emerald-400">第 {weekNum} 週</h3>
            <div className="grid gap-3">
              {weekDays.map(day => (
                <div key={day.id} className="flex items-center justify-between p-4 fiting-card-soft">
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">Day {day.day}</div>
                    <div className="text-sm font-medium text-slate-50">{day.name}</div>
                  </div>
                  <button
                    onClick={() => startDay(day.templateId)}
                    className="px-4 py-2 rounded-full bg-slate-900 text-emerald-400 text-xs font-medium border border-emerald-500/40 hover:bg-slate-800"
                  >
                    開始
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
