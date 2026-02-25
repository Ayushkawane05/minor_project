import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import socket from "../socket";
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Shield,
  Award,
  User,
  Star,
  Send,
  Briefcase,
  Cpu,
  DollarSign,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  RefreshCw,
  Plus
} from "lucide-react";

const STATUS_CONFIG = {
  Open: { color: "text-blue-500", icon: AlertCircle, badge: "badge-open" },
  "In Progress": { color: "text-yellow-500", icon: Clock, badge: "badge-progress" },
  Solved: { color: "text-green-500", icon: CheckCircle, badge: "badge-solved" },
  Reviewed: { color: "text-purple-500", icon: Award, badge: "badge-reviewed" },
  Closed: { color: "text-gray-500", icon: X, badge: "badge-closed" },
};

const PRIORITY_CONFIG = {
  Low: { color: "text-green-500", icon: Award, badge: "badge-low" },
  Medium: { color: "text-yellow-500", icon: AlertCircle, badge: "badge-medium" },
  High: { color: "text-red-500", icon: AlertCircle, badge: "badge-high" },
  hard: { color: "text-red-700", icon: Shield, badge: "badge-high" },
};

const CATEGORY_ICONS = {
  Technical: Cpu,
  HR: User,
  Finance: DollarSign,
  Operations: Settings,
  Other: HelpCircle,
};

export default function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [newProblem, setNewProblem] = useState({
    title: "",
    description: "",
    category: "Other",
    priority: "Medium",
  });

  // Solution Modal State
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);
  const [solutionContent, setSolutionContent] = useState("");
  const [solutionProblemId, setSolutionProblemId] = useState(null);
  const [submittingSolution, setSubmittingSolution] = useState(false);

  const navigate = useNavigate();

  // Get user from localStorage
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }, [navigate]);

  const fetchProblems = useCallback(async () => {
    try {
      const { data } = await API.get("/problems");
      setProblems(data);
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setError("Failed to load problems. Please refresh.");
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    // Initial fetch
    fetchProblems();

    // Socket listeners
    const handleNewProblem = (problem) => {
      setProblems((prev) => {
        if (prev.find((p) => p._id === problem._id)) return prev;
        return [problem, ...prev];
      });
    };

    const handleProblemUpdated = (updatedProblem) => {
      setProblems((prev) =>
        prev.map((p) => (p._id === updatedProblem._id ? updatedProblem : p))
      );
    };

    const handleSolutionSubmitted = (solution) => {
      // Refresh to ensure we get the full updated problem structure (populated fields)
      fetchProblems();
    };

    socket.on("newProblem", handleNewProblem);
    socket.on("problemUpdated", handleProblemUpdated);
    socket.on("solutionSubmitted", handleSolutionSubmitted);

    return () => {
      socket.off("newProblem", handleNewProblem);
      socket.off("problemUpdated", handleProblemUpdated);
      socket.off("solutionSubmitted", handleSolutionSubmitted);
    };
  }, [fetchProblems, navigate]);

  const handleChange = (e) =>
    setNewProblem({ ...newProblem, [e.target.name]: e.target.value });

  const createProblem = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!newProblem.title.trim() || !newProblem.description.trim()) {
      setFormError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      await API.post("/problems", newProblem);
      setFormSuccess("Problem raised successfully!");
      setNewProblem({ title: "", description: "", category: "Other", priority: "Medium" });
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to raise problem.");
    } finally {
      setSubmitting(false);
    }
  };

  const acceptProblem = async (id) => {
    setAcceptingId(id);
    try {
      await API.put(`/problems/${id}/accept`);
      // UI update handled by socket
    } catch (err) {
      alert(err.response?.data?.message || "Could not accept problem.");
    } finally {
      setAcceptingId(null);
    }
  };

  const openSolutionModal = (problemId) => {
    setSolutionProblemId(problemId);
    setSolutionContent("");
    setSolutionModalOpen(true);
  };

  const submitSolution = async () => {
    if (!solutionContent.trim()) return;
    setSubmittingSolution(true);
    try {
      await API.post(`/solutions/${solutionProblemId}`, { content: solutionContent });
      setSolutionModalOpen(false);
      setSolutionProblemId(null);
      // Socket & fetchProblems will handle update
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit solution");
    } finally {
      setSubmittingSolution(false);
    }
  };

  const filteredProblems = problems.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "mine") return p.raisedBy?._id === user._id;
    if (activeTab === "open") return p.status === "Open";
    if (activeTab === "inprogress") return p.status === "In Progress";
    return true;
  });

  const stats = {
    total: problems.length,
    open: problems.filter((p) => p.status === "Open").length,
    inProgress: problems.filter((p) => p.status === "In Progress").length,
    solved: problems.filter((p) => p.status === "Solved").length,
  };

  const getInitials = (name = "") =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const StatusDisplay = ({ status }) => {
    const Config = STATUS_CONFIG[status] || STATUS_CONFIG["Open"];
    const Icon = Config.icon;
    return (
      <span className={`badge ${Config.badge || ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Icon size={14} />
        {status}
      </span>
    );
  };

  const PriorityDisplay = ({ priority }) => {
    const Config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG["Medium"];
    const Icon = Config.icon;
    return (
      <span className={`badge ${Config.badge || ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Icon size={14} />
        {priority}
      </span>
    );
  };

  const CategoryIcon = ({ category }) => {
    const Icon = CATEGORY_ICONS[category] || HelpCircle;
    return <Icon size={14} className="text-gray-500" />;
  };

  return (
    <div className="dashboard-layout">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <Briefcase size={24} color="#6366f1" />
          </div>
          <span className="navbar-title">ProblemTrack</span>
        </div>
        <div className="navbar-right">
          <div className="navbar-user">
            <div className="navbar-avatar">{getInitials(user.name)}</div>
            <div className="navbar-user-info">
              <div className="navbar-user-name">{user.name || "User"}</div>
              <div className="navbar-user-role">{user.role || "Employee"}</div>
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon purple">
              <FileText size={24} />
            </div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Problems</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              <AlertCircle size={24} />
            </div>
            <div>
              <div className="stat-value">{stats.open}</div>
              <div className="stat-label">Open</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-value">{stats.inProgress}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="stat-value">{stats.solved}</div>
              <div className="stat-label">Solved</div>
            </div>
          </div>
        </div>

        {/* Raise Problem Form */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={20} />
              Raise a Problem
            </h2>
          </div>
          <div className="section-body">
            {formError && (
              <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} /> {formError}
              </div>
            )}
            {formSuccess && (
              <div className="alert alert-success" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={16} /> {formSuccess}
              </div>
            )}
            <form className="problem-form" onSubmit={createProblem}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Problem Title</label>
                <input
                  className="form-input"
                  name="title"
                  placeholder="Brief summary..."
                  value={newProblem.title}
                  onChange={handleChange}
                />
              </div>

              <div className="problem-form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    name="category"
                    value={newProblem.category}
                    onChange={handleChange}
                  >
                    <option value="Technical">Technical</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    name="priority"
                    value={newProblem.priority}
                    onChange={handleChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="hard">Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  name="description"
                  placeholder="Describe the problem..."
                  value={newProblem.description}
                  onChange={handleChange}
                />
              </div>

              <div>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                  style={{ width: "auto", padding: "12px 32px", display: "flex", alignItems: "center", gap: 8 }}
                >
                  {submitting ? <span className="spinner" /> : <Send size={16} />}
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Problems List */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={20} />
              All Problems
            </h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchProblems}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div className="section-body">
            {/* Tabs */}
            <div className="tabs">
              {[
                { key: "all", label: "All" },
                { key: "open", label: "Open" },
                { key: "inprogress", label: "In Progress" },
                { key: "mine", label: "My Problems" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="alert alert-error" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {loading ? (
              <div className="empty-state">
                <div style={{ fontSize: 32, marginBottom: 12 }}>
                  <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                </div>
                <p className="empty-state-text">Loading problems...</p>
              </div>
            ) : filteredProblems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FileText size={48} className="text-gray-300" />
                </div>
                <p className="empty-state-text">No problems found.</p>
              </div>
            ) : (
              <div className="problem-list">
                {filteredProblems.map((p) => {
                  // Check if current user is the one who accepted the problem
                  const isAcceptedByMe = p.acceptedBy?._id === user._id;

                  // Allow writing solution if In Progress AND Accepted by me
                  const canWriteSolution = p.status === "In Progress" && isAcceptedByMe;

                  // Allow accepting if status is Open (Assuming user is logged in)
                  const canAccept = p.status === "Open";

                  return (
                    <div className="problem-card" key={p._id}>
                      <div className="problem-card-header">
                        <h3 className="problem-title">{p.title}</h3>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                          <PriorityDisplay priority={p.priority} />
                          <StatusDisplay status={p.status} />
                        </div>
                      </div>

                      <p className="problem-desc">{p.description}</p>

                      <div className="problem-meta-container" style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                        marginTop: 12
                      }}>
                        <div className="problem-meta">
                          <span className="problem-meta-item">
                            <User size={14} /> {p.raisedBy?.name || "Unknown"}
                          </span>
                          {p.acceptedBy && (
                            <span className="problem-meta-item">
                              <Briefcase size={14} /> {p.acceptedBy?.name || "Employee"}
                            </span>
                          )}
                          <span className="problem-meta-item">
                            <CategoryIcon category={p.category} /> {p.category || "Other"}
                          </span>
                          <span className="problem-meta-item">
                            <Clock size={14} /> {formatDate(p.createdAt)}
                          </span>
                        </div>

                        <div className="problem-actions" style={{ display: "flex", gap: 8 }}>
                          {canAccept && (
                            <button
                              className="btn btn-success"
                              onClick={() => acceptProblem(p._id)}
                              disabled={acceptingId === p._id}
                              style={{ display: "flex", alignItems: "center", gap: 6 }}
                            >
                              {acceptingId === p._id ? (
                                <span className="spinner" />
                              ) : (
                                <CheckCircle size={16} />
                              )}
                              {acceptingId === p._id ? "Accepting..." : "Accept"}
                            </button>
                          )}

                          {canWriteSolution && (
                            <button
                              className="btn btn-primary"
                              onClick={() => openSolutionModal(p._id)}
                              style={{ display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <FileText size={16} /> Write Solution
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Solution & Feedback Section */}
                      {(p.solution || p.status === "Solved" || p.status === "Reviewed" || p.status === "Closed") && (
                        <div style={{ marginTop: 16, borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                          {p.solution && (
                            <div className="solution-box" style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 8 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", marginBottom: 6 }}>
                                <CheckCircle size={14} className="text-green-500" style={{ marginRight: 6 }} /> Solution
                              </h4>
                              <p style={{ fontSize: 13, color: "var(--text-primary)" }}>{p.solution.content}</p>
                            </div>
                          )}

                          {/* Show Feedback if available */}
                          {p.rating && (
                            <div className="feedback-box" style={{ marginTop: 12, padding: 12, border: "1px solid var(--border-color)", borderRadius: 8 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", marginBottom: 6 }}>
                                <MessageSquare size={14} className="text-blue-500" style={{ marginRight: 6 }} /> Feedback
                              </h4>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <div style={{ display: "flex" }}>
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} className={i < p.rating ? "text-yellow-400 fill-current" : "text-gray-300"} />
                                  ))}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{p.rating}/5</span>
                              </div>
                              <p style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
                                "{p.feedbackComment}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Write Solution Modal */}
      {solutionModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "var(--bg-card)",
            width: "90%",
            maxWidth: "500px",
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh"
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Submit Solution</h3>
              <button
                onClick={() => setSolutionModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 20, overflowY: "auto" }}>
              <textarea
                className="form-textarea"
                style={{ minHeight: 150, resize: "vertical" }}
                placeholder="Describe your solution in detail..."
                value={solutionContent}
                onChange={(e) => setSolutionContent(e.target.value)}
              />
            </div>
            <div style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 12
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSolutionModalOpen(false)}
                disabled={submittingSolution}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submitSolution}
                disabled={submittingSolution || !solutionContent.trim()}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                {submittingSolution ? "Submitting..." : "Submit Solution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
