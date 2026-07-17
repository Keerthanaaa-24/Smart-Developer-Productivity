const AIInsights = () => {

  const insights = [
    "You are most productive between 9 AM - 11 AM",
    "Your coding streak improved by 15%",
    "Complete high priority tasks earlier",
    "Take short breaks every 45 minutes",
  ];

  return (

    <div className="bg-white p-6 rounded-xl shadow-md">

      <h2 className="text-2xl font-bold mb-6">
        AI Productivity Insights 🤖
      </h2>

      <div className="space-y-4">

        {insights.map((item, index) => (

          <div
            key={index}
            className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded"
          >

            <p className="text-gray-700">
              {item}
            </p>

          </div>

        ))}

      </div>

    </div>
  );
};

export default AIInsights;