const DashboardCards = ({
  stats,
}) => {

  const cards = [
    {
      title: "Total Tasks",
      value: stats?.total_tasks || 0,
      color: "bg-blue-500",
    },
    {
      title: "Completed",
      value: stats?.completed_tasks || 0,
      color: "bg-green-500",
    },
    {
      title: "Pending",
      value: stats?.pending_tasks || 0,
      color: "bg-yellow-500",
    },
    {
      title: "High Priority",
      value: stats?.high_priority_tasks || 0,
      color: "bg-red-500",
    },
  ];

  return (

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

      {cards.map((card, index) => (

        <div
          key={index}
          className={`${card.color} text-white p-6 rounded-xl shadow-lg`}
        >

          <h2 className="text-lg font-medium">
            {card.title}
          </h2>

          <p className="text-4xl font-bold mt-4">
            {card.value}
          </p>

        </div>

      ))}

    </div>
  );
};

export default DashboardCards;