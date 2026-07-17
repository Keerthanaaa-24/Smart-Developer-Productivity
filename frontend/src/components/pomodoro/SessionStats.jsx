const SessionStats = () => {

  const stats = [
    {
      title: "Today's Sessions",
      value: 5,
    },
    {
      title: "Focus Hours",
      value: "3h 20m",
    },
    {
      title: "Weekly Sessions",
      value: 24,
    },
  ];

  return (

    <div className="bg-white p-6 rounded-xl shadow-md">

      <h2 className="text-2xl font-bold mb-6">
        Session Statistics
      </h2>

      <div className="space-y-5">

        {stats.map((item, index) => (

          <div
            key={index}
            className="flex justify-between items-center border-b pb-3"
          >

            <span className="font-medium">
              {item.title}
            </span>

            <span className="text-blue-600 font-bold">
              {item.value}
            </span>

          </div>

        ))}

      </div>

    </div>
  );
};

export default SessionStats;