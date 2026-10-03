import { Link } from "react-router-dom";
import {
  FaTasks,
  FaCheckCircle,
  FaHourglassHalf,
  FaExclamationTriangle,
  FaArrowRight,
  FaCalendarAlt,
} from "react-icons/fa";

const TaskOverviewCard = ({ taskStats = {} }) => {
  const total = taskStats?.total ?? 0;
  const completed = taskStats?.completed ?? 0;
  const pending = taskStats?.pending ?? 0;
  const highPriority = taskStats?.high_priority ?? 0;
  const overdue = taskStats?.overdue ?? 0;
  const completionRate = taskStats?.completion_rate ?? 0;
  const recentTasks = taskStats?.recent_tasks ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
              <FaTasks />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Task Command Hub</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Workflow status and task completion velocity.
              </p>
            </div>
          </div>

          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100/70 transition"
          >
            <span>Manage Tasks</span>
            <FaArrowRight className="text-[10px]" />
          </Link>
        </div>

        {/* Task Velocity Bar */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-5">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-600">Completion Rate</span>
            <span className="text-blue-600">{completionRate}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total</span>
              <span className="font-bold text-slate-800 text-sm">{total}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Done</span>
              <span className="font-bold text-emerald-600 text-sm">{completed}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pending</span>
              <span className="font-bold text-amber-600 text-sm">{pending}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">High Pri</span>
              <span className="font-bold text-rose-600 text-sm">{highPriority}</span>
            </div>
          </div>
        </div>

        {/* Overdue Alert if any */}
        {overdue > 0 && (
          <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2 rounded-xl">
            <FaExclamationTriangle />
            <span className="font-medium">
              {overdue} overdue task{overdue > 1 ? "s" : ""} need attention.
            </span>
          </div>
        )}

        {/* Recent / Key Tasks List */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            Active Workflow Tasks
          </h3>

          {recentTasks.length === 0 ? (
            <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500">No tasks created yet.</p>
              <Link
                to="/tasks"
                className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline"
              >
                + Create your first task
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {task.status === "Completed" ? (
                      <FaCheckCircle className="text-emerald-500 shrink-0" />
                    ) : (
                      <FaHourglassHalf className="text-amber-500 shrink-0" />
                    )}
                    <span className="font-medium text-slate-800 truncate">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.priority === "High" && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                        High
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <FaCalendarAlt className="text-[9px]" />
                        {task.due_date.slice(5)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-right">
        <Link
          to="/tasks"
          className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
        >
          View all tasks in task manager →
        </Link>
      </div>
    </div>
  );
};

export default TaskOverviewCard;
