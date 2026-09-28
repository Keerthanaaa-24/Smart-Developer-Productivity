const DashboardCards = ({ stats = {} }) => {
  const cards = [
    {
      title: "Total Tasks",
      value: stats?.total_tasks ?? 0,
      subtitle: "All assigned tasks",
      icon: "📋",
      gradient: "from-blue-600 to-cyan-500",
    },
    {
      title: "Completed",
      value: stats?.completed_tasks ?? 0,
      subtitle: "Tasks completed",
      icon: "✓",
      gradient: "from-emerald-600 to-green-500",
    },
    {
      title: "Pending",
      value: stats?.pending_tasks ?? 0,
      subtitle: "Tasks remaining",
      icon: "⏳",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "High Priority",
      value: stats?.high_priority_tasks ?? 0,
      subtitle: "Needs attention",
      icon: "⚡",
      gradient: "from-rose-600 to-red-500",
    },
  ];

  const total = stats?.total_tasks ?? 0;
  const completed = stats?.completed_tasks ?? 0;

  const completionRate =
    total > 0
      ? Math.round((completed / total) * 100)
      : 0;

  return (
    <div className="space-y-5">

      {/* Productivity Summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div>
            <p className="text-sm font-medium text-slate-500">
              Task Productivity
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              {completionRate}% complete
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              {completed} of {total} tasks completed
            </p>
          </div>

          <div className="w-full sm:w-48">

            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">
                Progress
              </span>

              <span className="font-semibold text-blue-600">
                {completionRate}%
              </span>
            </div>

            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">

              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-700"
                style={{
                  width: `${completionRate}%`,
                }}
              />

            </div>

          </div>

        </div>

      </div>

      {/* Task Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {cards.map((card) => (

          <div
            key={card.title}
            className="group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >

            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}
            />

            <div className="flex items-start justify-between">

              <div>

                <p className="text-sm font-medium text-slate-500">
                  {card.title}
                </p>

                <p className="text-3xl sm:text-4xl font-bold text-slate-900 mt-3">
                  {card.value}
                </p>

                <p className="text-xs text-slate-400 mt-2">
                  {card.subtitle}
                </p>

              </div>

              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} text-white flex items-center justify-center text-lg font-bold shadow-sm`}
              >
                {card.icon}
              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
};

export default DashboardCards;