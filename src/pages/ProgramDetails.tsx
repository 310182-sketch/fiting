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
    db.programs.get(pid).then(setProgram);
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

  if (!program) return <div className="p-4">Loading...</div>;

  // Group by week
  const weeks: Record<number, ProgramDay[]> = {};
  days.forEach(d => {
    if (!weeks[d.week]) weeks[d.week] = [];
    weeks[d.week].push(d);
  });

  return (
    <div className="space-y-6 pb-20">
      <header>
        <button onClick={() => navigate(-1)} className="text-slate-400 text-sm mb-2">
          &larr; 返回計畫列表
        </button>
        <h1 className="text-2xl font-bold">{program.name}</h1>
        <p className="text-slate-400">{program.description}</p>
      </header>

      <div className="space-y-6">
        {Object.entries(weeks).map(([weekNum, weekDays]) => (
          <div key={weekNum} className="space-y-3">
            <h3 className="font-semibold text-emerald-400">第 {weekNum} 週</h3>
            <div className="grid gap-3">
              {weekDays.map(day => (
                <div key={day.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Day {day.day}</div>
                    <div className="font-medium">{day.name}</div>
                  </div>
                  <button
                    onClick={() => startDay(day.templateId)}
                    className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-600/30"
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
