import { useEffect, useState, useMemo } from "react";
import {
  FaFolder,
  FaPlus,
  FaGithub,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaClock,
  FaExternalLinkAlt,
  FaTimes,
  FaTasks,
  FaExclamationTriangle,
} from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../api/projectApi";

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tech_stack: "",
    status: "In Progress",
    github_repo_url: "",
  });

  const showToast = (msg, type = "success") => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects(true);
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load projects:", err);
      showToast("Failed to load projects. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();

    const handleBackendWarmed = () => {
      loadProjects();
    };

    window.addEventListener("backend-warmed", handleBackendWarmed);
    return () => {
      window.removeEventListener("backend-warmed", handleBackendWarmed);
    };
  }, []);

  const projectStats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === "In Progress").length;
    const completed = projects.filter((p) => p.status === "Completed").length;
    const planned = projects.filter((p) => p.status === "Planned").length;
    return { total, inProgress, completed, planned };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (statusFilter === "all") return projects;
    return projects.filter(
      (p) => p.status?.toLowerCase() === statusFilter.toLowerCase()
    );
  }, [projects, statusFilter]);

  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormError("");
    setFormData({
      name: "",
      description: "",
      tech_stack: "",
      status: "In Progress",
      github_repo_url: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project) => {
    setEditingProject(project);
    setFormError("");
    setFormData({
      name: project.name || "",
      description: project.description || "",
      tech_stack: project.tech_stack || "",
      status: project.status || "In Progress",
      github_repo_url: project.github_repo_url || "",
    });
    setIsModalOpen(true);
  };

  const validateUrl = (url) => {
    if (!url || !url.trim()) return true;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Project name is required.");
      return;
    }

    if (formData.github_repo_url && !validateUrl(formData.github_repo_url)) {
      setFormError("Please enter a valid GitHub repository URL (e.g. https://github.com/user/repo).");
      return;
    }

    setSaving(true);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
        showToast("Project updated successfully!");
      } else {
        await createProject(formData);
        showToast("Project created successfully!");
      }
      setIsModalOpen(false);
      await loadProjects();
    } catch (err) {
      console.error("Failed to save project:", err);
      setFormError(err.response?.data?.detail || "Failed to save project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (projectId) => {
    try {
      await deleteProject(projectId);
      showToast("Project deleted successfully.");
      setDeleteConfirmId(null);
      await loadProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
      showToast("Failed to delete project.", "error");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "In Progress":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "Planned":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    }
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border animate-fadeIn text-sm font-semibold ${
              toastMessage.type === "error"
                ? "bg-rose-900/90 text-rose-200 border-rose-700"
                : "bg-slate-900/95 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {toastMessage.type === "error" ? <FaExclamationTriangle /> : <FaCheckCircle />}
            <span>{toastMessage.msg}</span>
          </div>
        )}

        {/* Header Hero */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm dark:shadow-2xl transition-colors duration-200">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                <FaFolder />
                <span>Developer Portfolio</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                My Projects
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Your development portfolio, all in one place.
              </p>
            </div>

            {/* Summary Stat Badges & Add Button */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-4 py-2 text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{projectStats.total}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-4 py-2 text-center">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">In Progress</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-300">{projectStats.inProgress}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-4 py-2 text-center">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Completed</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-300">{projectStats.completed}</div>
              </div>

              <button
                onClick={handleOpenCreate}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer"
              >
                <FaPlus />
                <span>Add Project</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {["all", "In Progress", "Planned", "Completed"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {st === "all" ? "All Projects" : st}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
            Showing {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
          </span>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-56 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-3xl p-6 flex flex-col justify-between shadow-xs dark:shadow-xl transition-all duration-200 group relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full border ${getStatusBadge(
                        p.status
                      )}`}
                    >
                      {p.status}
                    </span>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Edit Project"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Delete Project"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {p.description || "No description provided."}
                  </p>

                  {/* Tech Stack Pills */}
                  {p.tech_stack && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {p.tech_stack.split(",").map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80"
                        >
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      <span className="flex items-center gap-1.5">
                        <FaTasks className="text-slate-400 dark:text-slate-500 text-[10px]" />
                        <span>Tasks Progress</span>
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {p.completed_tasks || 0}/{p.total_tasks || 0} ({p.progress || 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer Stats & Links */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <FaClock className="text-blue-600 dark:text-blue-400 text-[11px]" />
                      <span>{formatDuration(p.coding_seconds)}</span>
                    </span>

                    {p.github_repo_url ? (
                      <a
                        href={p.github_repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition"
                      >
                        <FaGithub />
                        <span>Repository</span>
                        <FaExternalLinkAlt className="text-[10px]" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">No repo linked</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm dark:shadow-2xl">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 border border-blue-500/20">
              <FaFolder />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No projects yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              No projects yet. Add your first project and start building your developer portfolio.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <FaPlus />
              <span>Add Project</span>
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingProject ? "Edit Project" : "Add New Project"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {editingProject ? "Update project details and repository links." : "Fill in details to add a project to your portfolio."}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              {formError && (
                <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                  <FaExclamationTriangle className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Project Name <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Smart Developer Productivity"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of the project goals..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tech Stack (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tech_stack}
                      onChange={(e) =>
                        setFormData({ ...formData, tech_stack: e.target.value })
                      }
                      placeholder="React, FastAPI, MySQL"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Planned">Planned</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    GitHub Repository URL
                  </label>
                  <input
                    type="url"
                    value={formData.github_repo_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        github_repo_url: e.target.value,
                      })
                    }
                    placeholder="https://github.com/username/repository"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Saving..." : editingProject ? "Save Changes" : "Add Project"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 text-slate-900 dark:text-white">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center text-xl mx-auto">
                <FaTrash />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Delete Project?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to delete this project? This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Projects;
