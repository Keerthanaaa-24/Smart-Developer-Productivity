const KanbanBoard = () => {

  const columns = [
    {
      title: "Pending",
      tasks: [
        "Build Backend APIs",
        "Design Dashboard",
      ],
    },
    {
      title: "In Progress",
      tasks: [
        "JWT Authentication",
      ],
    },
    {
      title: "Completed",
      tasks: [
        "Setup MySQL",
        "Create FastAPI Project",
      ],
    },
  ];

  return (

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

      {columns.map((column, index) => (

        <div
          key={index}
          className="bg-gray-100 p-5 rounded-xl"
        >

          <h2 className="text-xl font-bold mb-5">
            {column.title}
          </h2>

          <div className="space-y-4">

            {column.tasks.map(
              (task, taskIndex) => (

                <div
                  key={taskIndex}
                  className="bg-white p-4 rounded-lg shadow-sm"
                >

                  {task}

                </div>

              )
            )}

          </div>

        </div>

      ))}

    </div>
  );
};

export default KanbanBoard;