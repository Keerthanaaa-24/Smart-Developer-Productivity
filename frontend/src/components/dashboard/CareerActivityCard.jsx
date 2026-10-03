import { Link } from "react-router-dom";
import { FaBriefcase, FaArrowRight, FaPlus } from "react-icons/fa";

const PLATFORM_ICONS = {
  linkedin: "💼",
  naukri: "🌐",
  other: "📌",
};

const TYPE_LABELS = {
  job_applied: "Job Applied",
  job_viewed: "Job Viewed",
  resume_updated: "Resume Updated",
  profile_updated: "Profile Updated",
  assessment_completed: "Assessment Completed",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  recruiter_contact: "Recruiter Contact",
  certification_added: "Cert Added",
  portfolio_updated: "Portfolio Updated",
  other: "Career Event",
};

export default function CareerActivityCard({ careerSummary }) {
  const summary = careerSummary?.summary || {
    total_career_activities: 0,
    applications: 0,
    interviews: 0,
    assessments: 0,
    profile_updates: 0,
  };

  const recent = careerSummary?.recent_activities || [];
  const linkedinConn = careerSummary?.platforms?.linkedin?.connected;

  const formatDate = (dateStr) => {
    try {
      if (!dateStr) return "Recent";
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-colors duration-200">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg shadow-xs">
              <FaBriefcase />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Career Activity</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Applications, interviews & verified milestones.
              </p>
            </div>
          </div>

          <Link
            to="/activity"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 px-3 py-1.5 rounded-xl border border-purple-100 dark:border-purple-800/40 transition"
          >
            <span>Hub</span>
            <FaArrowRight className="text-[10px]" />
          </Link>
        </div>

        {/* Real Summary Metrics */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-3 text-center">
            <span className="text-xl font-black text-slate-900 dark:text-white block">
              {summary.applications}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Applied
            </span>
          </div>

          <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/40 rounded-2xl p-3 text-center">
            <span className="text-xl font-black text-purple-700 dark:text-purple-400 block">
              {summary.interviews}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-300 uppercase tracking-wider">
              Interviews
            </span>
          </div>

          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl p-3 text-center">
            <span className="text-xl font-black text-indigo-700 dark:text-indigo-400 block">
              {summary.assessments}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
              Assessments
            </span>
          </div>
        </div>

        {/* Recent Career Feed */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recent Activity
            </h3>
            {linkedinConn && (
              <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700/50">
                LinkedIn Profile Linked
              </span>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="text-center py-6 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                No career activity recorded yet.
              </p>
              <Link
                to="/activity"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
              >
                <FaPlus className="text-[10px]" />
                Log first application or interview
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.slice(0, 3).map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base flex-shrink-0">
                      {PLATFORM_ICONS[act.platform?.toLowerCase()] || "💼"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {act.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="capitalize font-medium text-slate-600 dark:text-slate-300">
                          {act.platform}
                        </span>
                        <span>•</span>
                        <span>{TYPE_LABELS[act.activity_type] || act.activity_type}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 pl-2">
                    {formatDate(act.created_at || act.activity_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Verified user records</span>
        <span className="font-medium text-purple-600 dark:text-purple-400">
          {summary.total_career_activities} Total Logged
        </span>
      </div>
    </div>
  );
}
