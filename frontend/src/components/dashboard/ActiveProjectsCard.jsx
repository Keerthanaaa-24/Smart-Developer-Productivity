import { Link } from "react-router-dom";
import { FaFolder, FaArrowRight, FaClock, FaGithub } from "react-icons/fa";

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const ActiveProjectsCard = ({ projects = [] }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm border border-blue-500/20">
              <FaFolder />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Active Projects</h2>
              <p className="text-xs text-slate-400">
                Codebases and task execution progress
              </p>
            </div>
          </div>

          <Link
            to="/projects"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 transition"
          >
            <span>View All</span>
            <FaArrowRight className="text-[10px]" />
          </Link>
        </div>

        {projects.length > 0 ? (
          <div className="space-y-3">
            {projects.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-2xl p-3.5 transition group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                    {p.name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {p.status}
                  </span>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden my-2">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <FaClock className="text-[10px] text-blue-400" />
                    {formatDuration(p.coding_seconds)}
                  </span>
                  <span>
                    {p.completed_tasks}/{p.total_tasks} tasks ({p.progress}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400 mb-2">No active projects yet.</p>
            <Link
              to="/projects"
              className="text-xs text-blue-400 font-bold hover:underline"
            >
              + Create Your First Project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveProjectsCard;
