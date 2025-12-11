import { useState, useEffect, useRef } from 'react';
import { db, getWorkoutDetails } from '@/db';
import html2canvas from 'html2canvas';

export default function ShareModal({ workoutId, onClose }: { workoutId: number, onClose: () => void }) {
  const [details, setDetails] = useState<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getWorkoutDetails(db, workoutId).then(setDetails);
  }, [workoutId]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#0f172a', // slate-900
      scale: 2 // Retina support
    });
    const link = document.createElement('a');
    link.download = `fiting-workout-${workoutId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (!details) return null;

  const { workout, exercises } = details;
  const date = new Date(workout.startTime).toLocaleDateString();
  const duration = workout.endTime 
    ? Math.round((new Date(workout.endTime).getTime() - new Date(workout.startTime).getTime()) / 60000) + ' min'
    : '';

  // Calculate total volume
  const totalVolume = exercises.reduce((acc: number, e: any) => {
    return acc + e.sets.reduce((sAcc: number, s: any) => sAcc + (s.weight || 0) * (s.reps || 0), 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-[0_24px_80px_rgba(15,23,42,0.95)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div ref={cardRef} className="p-6 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 text-slate-50 border-b border-slate-800/80">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-3xl font-bold text-emerald-400 tracking-tighter">Fiting</h3>
              <p className="text-sm text-slate-400 font-medium">{date}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{duration}</div>
              <div className="text-[10px] text-slate-500 font-bold tracking-wider">DURATION</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {exercises.map((e: any) => {
               const bestSet = e.sets.reduce((best: any, curr: any) => {
                 if (!best) return curr;
                 return (curr.weight || 0) > (best.weight || 0) ? curr : best;
               }, null);

               return (
                <div key={e.exercise.id} className="flex justify-between items-center border-b border-slate-700/50 pb-2 last:border-0">
                  <span className="font-medium text-slate-200">{e.exercise.name}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400">
                      {bestSet ? `${bestSet.weight}kg x ${bestSet.reps}` : '-'}
                    </div>
                    <div className="text-[10px] text-slate-500">{e.sets.length} sets</div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between items-end pt-4 border-t border-slate-700">
             <div>
                <div className="text-2xl font-bold text-white">{totalVolume.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 font-bold tracking-wider">TOTAL VOLUME (KG)</div>
             </div>
             <div className="text-emerald-500/50 font-bold text-sm">KEEP FITING</div>
          </div>
        </div>

        <div className="p-4 flex gap-2 bg-slate-950/90">
          <button onClick={onClose} className="flex-1 py-2 rounded-full border border-slate-700 text-slate-400 text-xs hover:bg-slate-900">
            關閉
          </button>
          <button onClick={handleDownload} className="flex-1 py-2 fiting-cta-primary text-xs">
            下載分享卡片
          </button>
        </div>
      </div>
    </div>
  );
}
