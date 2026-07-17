import { useState } from "react";

import MainLayout from "../layouts/MainLayout";

import TaskForm from "../components/tasks/TaskForm";

import TaskList from "../components/tasks/TaskList";

const Tasks = () => {

  const [tasks, setTasks] =
    useState([]);

  const addTask = (task) => {

    setTasks([
      ...tasks,
      {
        id: Date.now(),
        ...task,
      },
    ]);
  };

  return (

    <MainLayout>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div>

          <TaskForm
            onAddTask={addTask}
          />

        </div>

        <div className="lg:col-span-2">

          <TaskList tasks={tasks} />

        </div>

      </div>

    </MainLayout>
  );
};

export default Tasks;