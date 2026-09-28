import { useEffect, useMemo, useState } from "react";
import {
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUndo,
  FaExclamationTriangle,
  FaCalendarAlt,
} from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import API from "../api/axios";

const Tasks = () => {
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeFilter, setActiveFilter] =
    useState("all");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "Pending",
    priority: "Medium",
    due_date: "",
  });

  // =====================================================
  // LOAD TASKS
  // =====================================================

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const response = await API.get("/tasks");

      setTasks(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load tasks:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) =>
      task.status === "Completed"
  ).length;

  const pendingTasks = tasks.filter(
    (task) =>
      task.status !== "Completed"
  ).length;

  const highPriorityTasks = tasks.filter(
    (task) =>
      task.priority === "High"
  ).length;

  const completionRate =
    totalTasks > 0
      ? Math.round(
          (completedTasks / totalTasks) *
            100
        )
      : 0;

  // =====================================================
  // FILTER TASKS
  // =====================================================

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Status filter
    if (activeFilter === "completed") {
      result = result.filter(
        (task) =>
          task.status === "Completed"
      );
    }

    if (activeFilter === "pending") {
      result = result.filter(
        (task) =>
          task.status !== "Completed"
      );
    }

    // Search
    if (search.trim()) {
      const query =
        search.toLowerCase();

      result = result.filter(
        (task) =>
          task.title
            ?.toLowerCase()
            .includes(query) ||
          task.description
            ?.toLowerCase()
            .includes(query)
      );
    }

    return result;
  }, [
    tasks,
    activeFilter,
    search,
  ]);

  // =====================================================
  // FORM
  // =====================================================

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      status: "Pending",
      priority: "Medium",
      due_date: "",
    });

    setEditingTask(null);
    setShowForm(false);
  };

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title,
        description:
          form.description,
        status: form.status,
        priority: form.priority,
        due_date:
          form.due_date || null,
      };

      if (editingTask) {
        const response =
          await API.put(
            `/tasks/${editingTask.id}`,
            payload
          );

        setTasks((previous) =>
          previous.map((task) =>
            task.id === editingTask.id
              ? response.data
              : task
          )
        );
      } else {
        const response =
          await API.post(
            "/tasks",
            payload
          );

        setTasks((previous) => [
          ...previous,
          response.data,
        ]);
      }

      window.dispatchEvent(
        new Event("tasksUpdated")
      );

      resetForm();

    } catch (error) {
      console.error(
        "Failed to save task:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to save task."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (task) => {
    setEditingTask(task);

    setForm({
      title: task.title || "",
      description:
        task.description || "",
      status:
        task.status || "Pending",
      priority:
        task.priority || "Medium",
      due_date:
        task.due_date
          ? String(
              task.due_date
            ).substring(0, 10)
          : "",
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // TOGGLE STATUS
  // =====================================================

  const toggleStatus = async (
    task
  ) => {
    const newStatus =
      task.status === "Completed"
        ? "Pending"
        : "Completed";

    try {
      const response =
        await API.put(
          `/tasks/${task.id}`,
          {
            title: task.title,
            description:
              task.description,
            status: newStatus,
            priority:
              task.priority,
            due_date:
              task.due_date || null,
          }
        );

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? response.data
            : item
        )
      );

      window.dispatchEvent(
        new Event("tasksUpdated")
      );

    } catch (error) {
      console.error(
        "Failed to update task:",
        error
      );
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (
    task
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${task.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await API.delete(
        `/tasks/${task.id}`
      );

      setTasks((previous) =>
        previous.filter(
          (item) =>
            item.id !== task.id
        )
      );

      window.dispatchEvent(
        new Event("tasksUpdated")
      );

    } catch (error) {
      console.error(
        "Failed to delete task:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to delete task."
      );
    }
  };

  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "No due date";
    }

    return new Date(
      date
    ).toLocaleDateString(
      undefined,
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const isOverdue = (
    task
  ) => {
    if (
      !task.due_date ||
      task.status === "Completed"
    ) {
      return false;
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const due =
      new Date(
        task.due_date
      );

    due.setHours(
      0,
      0,
      0,
      0
    );

    return due < today;
  };

  // =====================================================
  // PRIORITY
  // =====================================================

  const priorityStyle = {
    High:
      "bg-red-50 text-red-600 border-red-100",

    Medium:
      "bg-yellow-50 text-yellow-700 border-yellow-100",

    Low:
      "bg-green-50 text-green-600 border-green-100",
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <MainLayout>

      <div className="max-w-7xl mx-auto space-y-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">

          <div>

            <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold">
              <FaCheckCircle />
              Productivity
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2">
              My Tasks
            </h1>

            <p className="text-slate-500 mt-2">
              Plan your work, stay focused and
              finish what matters.
            </p>

          </div>

          <button
            onClick={() => {
              setEditingTask(null);

              setForm({
                title: "",
                description: "",
                status: "Pending",
                priority: "Medium",
                due_date: "",
              });

              setShowForm(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            <FaPlus />
            New Task
          </button>

        </div>


        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Tasks
            </p>

            <p className="text-3xl font-bold text-slate-900 mt-2">
              {totalTasks}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-green-100 p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Completed
            </p>

            <p className="text-3xl font-bold text-green-600 mt-2">
              {completedTasks}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-yellow-100 p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Remaining
            </p>

            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {pendingTasks}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              High Priority
            </p>

            <p className="text-3xl font-bold text-red-600 mt-2">
              {highPriorityTasks}
            </p>
          </div>

        </div>


        {/* =================================================
            PROGRESS
        ================================================= */}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">

          <div className="flex items-center justify-between mb-3">

            <div>
              <p className="font-semibold text-slate-900">
                Task Productivity
              </p>

              <p className="text-sm text-slate-500 mt-1">
                {completedTasks} of {totalTasks} tasks completed
              </p>
            </div>

            <span className="text-2xl font-bold text-blue-600">
              {completionRate}%
            </span>

          </div>

          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">

            <div
              className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full transition-all duration-500"
              style={{
                width: `${completionRate}%`,
              }}
            />

          </div>

        </div>


        {/* =================================================
            FORM
        ================================================= */}

        {showForm && (

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">

            <div className="flex items-center justify-between mb-6">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  {editingTask
                    ? "Edit Task"
                    : "Create New Task"}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {editingTask
                    ? "Update your task details or status."
                    : "Add a task to your productivity list."}
                </p>

              </div>

              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-700 text-xl"
              >
                ×
              </button>

            </div>


            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >

              <div className="lg:col-span-2">

                <label className="text-sm font-semibold text-slate-700">
                  Task title
                </label>

                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Complete GitHub integration"
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>


              <div className="lg:col-span-2">

                <label className="text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Describe what needs to be completed..."
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

              </div>


              <div>

                <label className="text-sm font-semibold text-slate-700">
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Completed">
                    Completed
                  </option>
                </select>

              </div>


              <div>

                <label className="text-sm font-semibold text-slate-700">
                  Priority
                </label>

                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="High">
                    High
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="Low">
                    Low
                  </option>
                </select>

              </div>


              <div>

                <label className="text-sm font-semibold text-slate-700">
                  Due date
                </label>

                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleChange}
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>


              <div className="flex items-end gap-3">

                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingTask
                    ? "Update Task"
                    : "Create Task"}
                </button>

              </div>

            </form>

          </div>
        )}


        {/* =================================================
            TASK HISTORY
        ================================================= */}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Toolbar */}

          <div className="p-5 sm:p-6 border-b border-slate-100">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Task History
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Manage pending and completed work.
                </p>

              </div>


              {/* Search */}

              <div className="relative w-full lg:w-80">

                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search tasks..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

            </div>


            {/* Filters */}

            <div className="flex flex-wrap gap-2 mt-5">

              {[
                ["all", "All Tasks"],
                ["pending", "Pending"],
                ["completed", "Completed"],
              ].map(
                ([value, label]) => (

                  <button
                    key={value}
                    onClick={() =>
                      setActiveFilter(value)
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      activeFilter === value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>

                )
              )}

            </div>

          </div>


          {/* Tasks */}

          <div className="p-5 sm:p-6">

            {loading ? (

              <div className="py-16 text-center">

                <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto" />

                <p className="text-sm text-slate-500 mt-4">
                  Loading your tasks...
                </p>

              </div>

            ) : filteredTasks.length === 0 ? (

              <div className="py-16 text-center">

                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
                  <FaCheckCircle />
                </div>

                <h3 className="font-bold text-slate-800 mt-4">
                  No tasks found
                </h3>

                <p className="text-sm text-slate-400 mt-1">
                  Create a task and start making progress.
                </p>

              </div>

            ) : (

              <div className="space-y-4">

                {filteredTasks.map(
                  (task) => {

                    const completed =
                      task.status ===
                      "Completed";

                    const overdue =
                      isOverdue(task);

                    return (

                      <div
                        key={task.id}
                        className={`group rounded-2xl border p-5 transition ${
                          completed
                            ? "border-green-100 bg-green-50/30"
                            : overdue
                            ? "border-red-100 bg-red-50/20"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md"
                        }`}
                      >

                        <div className="flex flex-col sm:flex-row gap-4">

                          {/* Status */}

                          <button
                            onClick={() =>
                              toggleStatus(
                                task
                              )
                            }
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
                              completed
                                ? "bg-green-500 text-white"
                                : "bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600"
                            }`}
                            title={
                              completed
                                ? "Mark as pending"
                                : "Mark as completed"
                            }
                          >
                            {completed ? (
                              <FaCheck />
                            ) : (
                              <FaClock />
                            )}
                          </button>


                          {/* Content */}

                          <div className="flex-1 min-w-0">

                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                              <div>

                                <h3
                                  className={`font-bold text-lg ${
                                    completed
                                      ? "text-slate-500 line-through"
                                      : "text-slate-900"
                                  }`}
                                >
                                  {task.title}
                                </h3>

                                {task.description && (
                                  <p className="text-sm text-slate-500 mt-2 leading-6">
                                    {
                                      task.description
                                    }
                                  </p>
                                )}

                              </div>


                              {/* Actions */}

                              <div className="flex items-center gap-2">

                                <button
                                  onClick={() =>
                                    handleEdit(
                                      task
                                    )
                                  }
                                  className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100"
                                  title="Edit task"
                                >
                                  <FaEdit />
                                </button>

                                <button
                                  onClick={() =>
                                    handleDelete(
                                      task
                                    )
                                  }
                                  className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"
                                  title="Delete task"
                                >
                                  <FaTrash />
                                </button>

                              </div>

                            </div>


                            {/* Metadata */}

                            <div className="flex flex-wrap items-center gap-2 mt-4">

                              <span
                                className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                                  priorityStyle[
                                    task.priority
                                  ] ||
                                  priorityStyle.Medium
                                }`}
                              >
                                {task.priority ||
                                  "Medium"}{" "}
                                Priority
                              </span>


                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  completed
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {completed
                                  ? "Completed"
                                  : "Pending"}
                              </span>


                              {task.due_date && (

                                <span
                                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                    overdue
                                      ? "bg-red-100 text-red-600"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >

                                  {overdue ? (
                                    <FaExclamationTriangle />
                                  ) : (
                                    <FaCalendarAlt />
                                  )}

                                  {overdue
                                    ? "Overdue · "
                                    : ""}

                                  {formatDate(
                                    task.due_date
                                  )}

                                </span>

                              )}

                            </div>

                          </div>

                        </div>


                        {/* Completed action */}

                        {completed && (

                          <div className="mt-4 pt-4 border-t border-green-100 flex items-center justify-between">

                            <p className="text-xs text-green-600 font-medium">
                              ✓ Task completed
                            </p>

                            <button
                              onClick={() =>
                                toggleStatus(
                                  task
                                )
                              }
                              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600"
                            >
                              <FaUndo />
                              Reopen task
                            </button>

                          </div>

                        )}

                      </div>

                    );
                  }
                )}

              </div>

            )}

          </div>

        </div>

      </div>

    </MainLayout>
  );
};

export default Tasks;