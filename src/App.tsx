import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import History from '@/pages/History';
import Settings from '@/pages/Settings';
import WorkoutPage from '@/pages/WorkoutPage';
import Programs from '@/pages/Programs';
import ProgramDetails from '@/pages/ProgramDetails';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Fiting</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:id" element={<ProgramDetails />} />
          <Route path="/workout/:id" element={<WorkoutPage />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 inset-x-0 border-t border-slate-200 bg-white/90 backdrop-blur flex">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 py-3.5 text-base text-center flex flex-col items-center justify-center gap-0.5 ${isActive ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`
          }
        >
          首頁
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex-1 py-3.5 text-base text-center flex flex-col items-center justify-center gap-0.5 ${isActive ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`
          }
        >
          歷史
        </NavLink>
        <NavLink
          to="/programs"
          className={({ isActive }) =>
            `flex-1 py-3.5 text-base text-center flex flex-col items-center justify-center gap-0.5 ${isActive ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`
          }
        >
          課表
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex-1 py-3.5 text-base text-center flex flex-col items-center justify-center gap-0.5 ${isActive ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`
          }
        >
          設定
        </NavLink>
      </nav>
    </div>
  );
}

export default App;
