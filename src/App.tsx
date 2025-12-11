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
      <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Fiting</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-16 px-4 pt-4">
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
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-slate-800 bg-slate-900/90 backdrop-blur flex text-sm">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 py-2 text-center ${isActive ? 'text-emerald-400' : 'text-slate-400'}`
          }
        >
          首頁
        </NavLink>
        <NavLink
          to="/start"
          className={({ isActive }) =>
            `flex-1 py-2 text-center ${isActive ? 'text-emerald-400' : 'text-slate-400'}`
          }
        >
          開始
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex-1 py-2 text-center ${isActive ? 'text-emerald-400' : 'text-slate-400'}`
          }
        >
          歷史
        </NavLink>
        <NavLink
          to="/programs"
          className={({ isActive }) =>
            `flex-1 py-2 text-center ${isActive ? 'text-emerald-400' : 'text-slate-400'}`
          }
        >
          計畫
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex-1 py-2 text-center ${isActive ? 'text-emerald-400' : 'text-slate-400'}`
          }
        >
          設定
        </NavLink>
      </nav>
    </div>
  );
}

export default App;
