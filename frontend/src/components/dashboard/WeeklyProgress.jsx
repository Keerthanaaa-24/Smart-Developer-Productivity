const WeeklyProgress = () => {

  const progress = 76;

  return (

    <div className="bg-white p-6 rounded-xl shadow-md">

      <h2 className="text-2xl font-bold mb-6">
        Weekly Progress
      </h2>

      <div className="w-full bg-gray-200 rounded-full h-5">

        <div
          className="bg-blue-500 h-5 rounded-full"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

      <p className="mt-4 text-lg font-medium">
        {progress}% Completed
      </p>

    </div>
  );
};

export default WeeklyProgress;