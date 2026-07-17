const ActivityHeatmap = () => {

  const days = Array.from(
    { length: 35 },
    (_, i) => i
  );

  return (

    <div className="bg-white p-6 rounded-xl shadow-md">

      <h2 className="text-2xl font-bold mb-5">
        Activity Heatmap
      </h2>

      <div className="grid grid-cols-7 gap-2">

        {days.map((day) => (

          <div
            key={day}
            className={`w-10 h-10 rounded ${
              day % 3 === 0
                ? "bg-green-500"
                : day % 2 === 0
                ? "bg-green-300"
                : "bg-gray-200"
            }`}
          />

        ))}

      </div>

    </div>
  );
};

export default ActivityHeatmap;