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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div ref={cardRef} className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-900 border border-slate-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-3xl font-bold text-emerald-600 tracking-tighter">Fiting</h3>
              <p className="text-sm text-slate-600 font-medium">{date}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{duration}</div>
              <div className="text-[10px] text-slate-600 font-bold tracking-wider">DURATION</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {exercises.map((e: any) => {
               const bestSet = e.sets.reduce((best: any, curr: any) => {
                 if (!best) return curr;
                 return (curr.weight || 0) > (best.weight || 0) ? curr : best;
               }, null);

               return (
                <div key={e.exercise.id} className="flex justify-between items-center border-b border-slate-300/50 pb-2 last:border-0">
                  <span className="font-medium text-slate-800">{e.exercise.name}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      {bestSet ? `${bestSet.weight}kg x ${bestSet.reps}` : '-'}
                    </div>
                    <div className="text-[10px] text-slate-600">{e.sets.length} sets</div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between items-end pt-4 border-t border-slate-300">
             <div>
                <div className="text-2xl font-bold text-white">{totalVolume.toLocaleString()}</div>
                <div className="text-[10px] text-slate-600 font-bold tracking-wider">TOTAL VOLUME (KG)</div>
             </div>
             <div className="text-emerald-500/50 font-bold text-sm">KEEP FITING</div>
          </div>
        </div>

        <div className="btn-group-md">
          <button onClick={onClose} className="btn-secondary py-2 text-sm">Close</button>
          <button onClick={handleDownload} className="btn-primary py-2 text-sm">
            Download Image
          </button>
        </div>
      </div>
    </div>
  );
}
