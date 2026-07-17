import { useState } from "react";

const TaskForm = ({
  onAddTask,
}) => {

  const [taskData, setTaskData] =
    useState({
      title: "",
      description: "",
      status: "Pending",
      priority: "Medium",
      due_date: "",
    });

  const handleChange = (e) => {

    setTaskData({
      ...taskData,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit = (e) => {

    e.preventDefault();

    onAddTask(taskData);

    setTaskData({
      title: "",
      description: "",
      status: "Pending",
      priority: "Medium",
      due_date: "",
    });
  };

  return (

    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-xl shadow-md"
    >

      <h2 className="text-2xl font-bold mb-6">
        Add New Task
      </h2>

      <div className="space-y-4">

        <input
          type="text"
          name="title"
          placeholder="Task Title"
          value={taskData.title}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
          required
        />

        <textarea
          name="description"
          placeholder="Task Description"
          value={taskData.description}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
          rows="4"
          required
        />

        <select
          name="status"
          value={taskData.status}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
        >

          <option value="Pending">
            Pending
          </option>

          <option value="Completed">
            Completed
          </option>

        </select>

        <select
          name="priority"
          value={taskData.priority}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
        >

          <option value="Low">
            Low
          </option>

          <option value="Medium">
            Medium
          </option>

          <option value="High">
            High
          </option>

        </select>

        <input
          type="date"
          name="due_date"
          value={taskData.due_date}
          onChange={handleChange}
          className="w-full border p-3 rounded-lg"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg"
        >
          Add Task
        </button>

      </div>

    </form>
  );
};

export default TaskForm;