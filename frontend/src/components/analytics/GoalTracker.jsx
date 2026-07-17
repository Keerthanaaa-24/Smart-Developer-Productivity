const GoalTracker = () => {

  const goals = [
    {
      title: "Complete Backend APIs",
      progress: 90,
    },
    {
      title: "Frontend Dashboard UI",
      progress: 60,
    },
    {
      title: "GitHub Integration",
      progress: 30,
    },
  ];

  return (

    <div className="bg-white p-5 rounded-xl shadow-md">

      <h2 className="text-xl font-bold mb-6">
        Goal Tracker
      </h2>

      <div className="space-y-5">

        {goals.map((goal, index) => (

          <div key={index}>

            <div className="flex justify-between mb-2">

              <span className="font-medium">
                {goal.title}
              </span>

              <span>
                {goal.progress}%
              </span>

            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">

              <div
                className="bg-blue-500 h-3 rounded-full"
                style={{
                  width: `${goal.progress}%`,
                }}
              />

            </div>

          </div>

        ))}

      </div>

    </div>
  );
};

export default GoalTracker;