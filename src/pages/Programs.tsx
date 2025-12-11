import { useState, useEffect } from 'react';
import { db, Program, ProgramDay, WorkoutTemplate } from '@/db';
import { useNavigate } from 'react-router-dom';

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    db.programs.toArray().then(setPrograms);
  }, []);

  const createSampleProgram = async () => {
    // Create a sample 4-week program
    const templates = await db.templates.toArray();
    if (templates.length === 0) {
      alert('請先建立一些訓練課表 (Templates)');
      return;
    }

    const programId = await db.programs.add({
      name: '新手入門 4 週計畫',
      description: '適合初學者的全身訓練計畫',
      weeks: 4
    });

    // Add days (3 days per week)
    const daysPerWeek = 3;
    const weeks = 4;
    
    for (let w = 1; w <= weeks; w++) {
      for (let d = 1; d <= daysPerWeek; d++) {
        await db.programDays.add({
          programId: programId as number,
          week: w,
          day: d,
          name: `Week ${w} Day ${d}`,
          templateId: templates[d % templates.length].id!
        });
      }
    }

    const newPrograms = await db.programs.toArray();
    setPrograms(newPrograms);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">訓練計畫</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/templates')}
            className="px-3 py-1.5 bg-slate-800 text-slate-300 text-sm rounded-lg"
          >
            管理模板
          </button>
          <button 
            onClick={createSampleProgram}
            className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg"
          >
            建立範例
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {programs.map(p => (
          <div key={p.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="font-semibold text-lg">{p.name}</h3>
            <p className="text-slate-400 text-sm mb-3">{p.description}</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{p.weeks} 週</span>
            </div>
            <button 
              className="mt-3 w-full py-2 bg-slate-800 rounded-lg text-sm font-medium"
              onClick={() => navigate(`/programs/${p.id}`)}
            >
              查看詳情
            </button>
          </div>
        ))}
        
        {programs.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            尚無訓練計畫
          </div>
        )}
      </div>
    </div>
  );
}
