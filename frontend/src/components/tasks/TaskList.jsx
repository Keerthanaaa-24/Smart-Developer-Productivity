import TaskCard from "./TaskCard";

const TaskList = ({
  tasks,
}) => {

  return (

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {tasks.length > 0 ? (

        tasks.map((task) => (

          <TaskCard
            key={task.id}
            task={task}
          />

        ))

      ) : (

        <div className="bg-white p-6 rounded-xl shadow-md">

          <p className="text-gray-500">
            No Tasks Available
          </p>

        </div>

      )}

    </div>
  );
};

export default TaskList;