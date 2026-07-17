const TaskCard = ({
  task,
}) => {

  return (

    <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-500">

      <div className="flex items-center justify-between mb-4">

        <h2 className="text-xl font-bold">
          {task.title}
        </h2>

        <span
          className={`px-3 py-1 rounded-full text-sm text-white ${
            task.priority === "High"
              ? "bg-red-500"
              : task.priority === "Medium"
              ? "bg-yellow-500"
              : "bg-green-500"
          }`}
        >
          {task.priority}
        </span>

      </div>

      <p className="text-gray-600 mb-4">
        {task.description}
      </p>

      <div className="flex items-center justify-between">

        <span
          className={`font-medium ${
            task.status === "Completed"
              ? "text-green-600"
              : "text-yellow-600"
          }`}
        >
          {task.status}
        </span>

        <span className="text-gray-500 text-sm">
          Due: {task.due_date}
        </span>

      </div>

    </div>
  );
};

export default TaskCard;