const DeveloperScoreCards = ({ stats = {} }) => {
  const codingScore = Number(
    stats?.coding_score ?? 0
  );

  const learningScore = Number(
    stats?.learning_score ?? 0
  );

  const consistencyScore = Number(
    stats?.consistency_score ?? 0
  );

  const overallScore = Number(
    stats?.overall_score ??
      (
        codingScore * 0.45 +
        learningScore * 0.35 +
        consistencyScore * 0.20
      ).toFixed(2)
  );

  const scores = [
    {
      title: "Overall Developer Score",
      value: overallScore,
      description: "Your overall developer performance",
      icon: "⚡",
      gradient: "from-violet-600 to-blue-600",
    },
    {
      title: "Coding Score",
      value: codingScore,
      description: "Coding activity and progress",
      icon: "💻",
      gradient: "from-blue-600 to-cyan-500",
    },
    {
      title: "Learning Score",
      value: learningScore,
      description: "Learning and certifications",
      icon: "🎓",
      gradient: "from-emerald-600 to-teal-500",
    },
    {
      title: "Consistency",
      value: consistencyScore,
      description: "Your development consistency",
      icon: "🔥",
      gradient: "from-orange-500 to-red-500",
    },
  ];

  return (
    <div className="space-y-5">

      {/* Section Header */}
      <div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Developer Performance
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Your coding, learning and consistency scores.
        </p>

      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {scores.map((score) => {

          const safeValue = Math.min(
            Math.max(score.value, 0),
            100
          );

          return (
            <div
              key={score.title}
              className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >

              {/* Top Gradient */}
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${score.gradient}`}
              />

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-sm font-medium text-slate-500">
                    {score.title}
                  </p>

                  <div className="flex items-baseline gap-1 mt-3">

                    <span className="text-3xl font-bold text-slate-900">
                      {Math.round(score.value)}
                    </span>

                    <span className="text-sm text-slate-400">
                      /100
                    </span>

                  </div>

                </div>

                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${score.gradient} flex items-center justify-center text-white shadow-sm`}
                >
                  {score.icon}
                </div>

              </div>

              <p className="text-xs text-slate-400 mt-3">
                {score.description}
              </p>

              {/* Progress */}
              <div className="mt-4">

                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">

                  <div
                    className={`h-full bg-gradient-to-r ${score.gradient} rounded-full transition-all duration-700`}
                    style={{
                      width: `${safeValue}%`,
                    }}
                  />

                </div>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
};

export default DeveloperScoreCards;