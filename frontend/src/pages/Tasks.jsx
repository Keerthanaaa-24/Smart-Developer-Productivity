import { useEffect, useMemo, useState } from "react";
import {
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUndo,
  FaExclamationTriangle,
  FaCalendarAlt,
} from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../api/taskApi";

// =========================================================
// TASK DATA NORMALIZER
// =========================================================
const extractTask = (data) => {
  if (!data) return null;
  const t = data.task || data;
  if (!t || typeof t !== "object") return null;
  return {
    id: t.id,
    title: t.title || "",
    description: t.description || "",
    status: t.status || "Pending",
    priority: t.priority || "Medium",
    due_date: t.due_date ? String(t.due_date).substring(0, 10) : "",
    user_id: t.user_id,
  };
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

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
      const data = await getTasks();
      const rawList = Array.isArray(data) ? data : (data?.tasks || []);
      const normalized = rawList
        .map(extractTask)
        .filter((t) => t && t.id !== undefined && t.id !== null);
      setTasks(normalized);
    } catch (error) {
      console.error("Failed to load tasks:", error);
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
  const completedTasks = tasks.filter((task) => task.status === "Completed").length;
  const pendingTasks = tasks.filter((task) => task.status !== "Completed").length;
  const highPriorityTasks = tasks.filter((task) => task.priority === "High").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // =====================================================
  // FILTER TASKS
  // =====================================================
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (activeFilter === "completed") {
      result = result.filter((task) => task.status === "Completed");
    } else if (activeFilter === "pending") {
      result = result.filter((task) => task.status !== "Completed");
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (task) =>
          task.title?.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tasks, activeFilter, search]);

  // =====================================================
  // FORM HANDLERS
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
    };

    try {
      if (editingTask && editingTask.id) {
        const resData = await updateTask(editingTask.id, payload);
        const updated = extractTask(resData);
        if (updated && updated.id) {
          setTasks((prev) =>
            prev.map((item) => (item.id === editingTask.id ? updated : item))
          );
        } else {
          await fetchTasks();
        }
      } else {
        const resData = await createTask(payload);
        const created = extractTask(resData);
        if (created && created.id) {
          setTasks((prev) => [created, ...prev]);
        } else {
          await fetchTasks();
        }
      }

      window.dispatchEvent(new Event("tasksUpdated"));
      resetForm();
    } catch (error) {
      console.error("Failed to save task:", error);
      alert(error.response?.data?.detail || error.message || "Unable to save task.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (task) => {
    const t = extractTask(task);
    if (!t || !t.id) return;

    setEditingTask(t);
    setForm({
      title: t.title || "",
      description: t.description || "",
      status: t.status || "Pending",
      priority: t.priority || "Medium",
      due_date: t.due_date || "",
    });

    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleStatus = async (task) => {
    const t = extractTask(task);
    if (!t || !t.id) return;

    const newStatus = t.status === "Completed" ? "Pending" : "Completed";

    try {
      const resData = await updateTask(t.id, {
        title: t.title,
        description: t.description,
        status: newStatus,
        priority: t.priority,
        due_date: t.due_date || null,
      });

      const updated = extractTask(resData);
      if (updated && updated.id) {
        setTasks((prev) =>
          prev.map((item) => (item.id === t.id ? updated : item))
        );
      } else {
        await fetchTasks();
      }

      window.dispatchEvent(new Event("tasksUpdated"));
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleDelete = async (task) => {
    const t = extractTask(task);
    if (!t || !t.id) return;

    if (!window.confirm(`Delete "${t.title}"?`)) return;

    try {
      await deleteTask(t.id);
      setTasks((prev) => prev.filter((item) => item.id !== t.id));
      window.dispatchEvent(new Event("tasksUpdated"));
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert(error.response?.data?.detail || error.message || "Unable to delete task.");
    }
  };

  const formatDate = (date) => {
    if (!date) return "No due date";
    return new Date(date).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isOverdue = (task) => {
    if (!task.due_date || task.status === "Completed") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const priorityStyle = {
    High: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60",
    Medium: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    Low: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              <FaCheckCircle />
              <span>Productivity Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
              My Tasks
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Plan your work, stay focused and finish what matters.
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
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <FaPlus />
            <span>New Task</span>
          </button>
        </div>

        {/* STATISTICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs transition-colors duration-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Tasks</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{totalTasks}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200/60 dark:border-emerald-900/50 p-5 shadow-xs transition-colors duration-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completed</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{completedTasks}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-200/60 dark:border-amber-900/50 p-5 shadow-xs transition-colors duration-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Remaining</p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">{pendingTasks}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200/60 dark:border-rose-900/50 p-5 shadow-xs transition-colors duration-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">High Priority</p>
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">{highPriorityTasks}</p>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Task Productivity</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {completedTasks} of {totalTasks} tasks completed
              </p>
            </div>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{completionRate}%</span>
          </div>

          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* FORM */}
        {showForm && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 animate-fadeIn text-slate-900 dark:text-white transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingTask ? "Edit Task" : "Create New Task"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {editingTask ? "Update your task details or status." : "Add a task to your productivity list."}
                </p>
              </div>

              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xl p-1 rounded-lg transition cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  name="title"
                  required
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Complete GitHub OAuth integration"
                  className="w-full mt-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Describe what needs to be completed..."
                  className="w-full mt-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full mt-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Priority</label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="w-full mt-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleChange}
                  className="w-full mt-2 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition cursor-pointer"
                >
                  {saving ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TASK HISTORY */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-200">
          {/* Toolbar */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Task History</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage pending and completed work.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full lg:w-80">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mt-5">
              {[
                ["all", "All Tasks"],
                ["pending", "Pending"],
                ["completed", "Completed"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setActiveFilter(value)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeFilter === value
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks List */}
          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="py-16 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Loading your tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl">
                  <FaCheckCircle />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white mt-4">No tasks found</h3>
                <p className="text-xs text-slate-400 mt-1">Create a task and start making progress.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredTasks.map((task) => {
                  const completed = task.status === "Completed";
                  const overdue = isOverdue(task);

                  return (
                    <div
                      key={task.id}
                      className={`group rounded-2xl border p-5 transition ${
                        completed
                          ? "border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20"
                          : overdue
                          ? "border-rose-200/60 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/20"
                          : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Status Checkbox */}
                        <button
                          onClick={() => toggleStatus(task)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer ${
                            completed
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-blue-100 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400"
                          }`}
                          title={completed ? "Mark as pending" : "Mark as completed"}
                        >
                          {completed ? <FaCheck /> : <FaClock />}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <h3
                                className={`font-bold text-base ${
                                  completed
                                    ? "text-slate-400 dark:text-slate-500 line-through"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {task.title}
                              </h3>

                              {task.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleEdit(task)}
                                className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900 transition cursor-pointer"
                                title="Edit task"
                              >
                                <FaEdit className="text-xs" />
                              </button>
                              <button
                                onClick={() => handleDelete(task)}
                                className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900 transition cursor-pointer"
                                title="Delete task"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-2 mt-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                                priorityStyle[task.priority] || priorityStyle.Medium
                              }`}
                            >
                              {task.priority || "Medium"} Priority
                            </span>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                completed
                                  ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                                  : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                              }`}
                            >
                              {completed ? "Completed" : "Pending"}
                            </span>

                            {task.due_date && (
                              <span
                                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  overdue
                                    ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {overdue ? <FaExclamationTriangle /> : <FaCalendarAlt />}
                                {overdue ? "Overdue · " : ""}
                                {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Completed Footer */}
                      {completed && (
                        <div className="mt-3.5 pt-3.5 border-t border-emerald-100 dark:border-emerald-950/50 flex items-center justify-between">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ Task completed
                          </p>
                          <button
                            onClick={() => toggleStatus(task)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                          >
                            <FaUndo className="text-[10px]" />
                            <span>Reopen task</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Tasks;