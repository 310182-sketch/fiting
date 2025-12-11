import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import Templates from '@/pages/Templates';
import StartWorkout from '@/pages/StartWorkout';
import History from '@/pages/History';
import Settings from '@/pages/Settings';
import WorkoutPage from '@/pages/WorkoutPage';
import Programs from '@/pages/Programs';
import ProgramDetails from '@/pages/ProgramDetails';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      <header className="px-4 py-3 border-b border-slate-800/60 bg-gradient-to-r from-slate-950 via-slate-900/80 to-slate-950/90 backdrop-blur flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Fiting</h1>
          <p className="text-xs text-slate-400 mt-0.5">專注訓練的極簡紀錄器</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="fiting-page">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/:id" element={<ProgramDetails />} />
            <Route path="/start" element={<StartWorkout />} />
            <Route path="/workout/:id" element={<WorkoutPage />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-slate-800/60 bg-slate-950/95 backdrop-blur flex text-xs shadow-[0_-12px_35px_rgba(15,23,42,0.9)]">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 py-2 text-center font-medium transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`
          }
        >
          首頁
        </NavLink>
        <NavLink
          to="/start"
          className={({ isActive }) =>
            `flex-1 py-2 text-center font-medium transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`
          }
        >
          開始
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex-1 py-2 text-center font-medium transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`
          }
        >
          歷史
        </NavLink>
        <NavLink
          to="/programs"
          className={({ isActive }) =>
            `flex-1 py-2 text-center font-medium transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`
          }
        >
          計畫
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex-1 py-2 text-center font-medium transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`
          }
        >
          設定
        </NavLink>
      </nav>
    </div>
  );
}

export default App;
