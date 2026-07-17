const GithubStats = () => {

  const stats = [
    {
      title: "Repositories",
      value: 24,
    },
    {
      title: "Commits",
      value: 534,
    },
    {
      title: "Pull Requests",
      value: 38,
    },
  ];

  return (

    <div className="bg-white p-6 rounded-xl shadow-md">

      <h2 className="text-2xl font-bold mb-6">
        GitHub Statistics
      </h2>

      <div className="space-y-4">

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

export default GithubStats;