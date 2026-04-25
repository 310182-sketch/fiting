import { useState, useEffect } from 'react';
import { db, Program, ProgramDay, WorkoutTemplate } from '@/db';
import { useNavigate } from 'react-router-dom';
import Templates from './Templates';

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'programs'>('templates');
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
      <div className="flex bg-slate-200/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'templates' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          訓練模板
        </button>
        <button
          onClick={() => setActiveTab('programs')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'programs' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          多週計畫
        </button>
      </div>

      {activeTab === 'templates' ? (
        <div className="pt-2">
          <Templates />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">訓練計畫</h2>
            <div className="btn-group-sm">
              <button 
                onClick={createSampleProgram}
                className="btn-primary"
              >
                建立範例
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {programs.map(p => (
              <div key={p.id} className="p-4 rounded-xl bg-white border border-slate-200">
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <p className="text-slate-600 text-sm mb-3">{p.description}</p>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>{p.weeks} 週</span>
                </div>
                <button 
                  className="btn-secondary w-full"
                  onClick={() => navigate(`/programs/${p.id}`)}
                >
                  查看詳情
                </button>
              </div>
            ))}
            
            {programs.length === 0 && (
              <div className="text-center py-8 text-slate-600">
                尚無訓練計畫
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
