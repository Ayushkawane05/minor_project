import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";

const STATUS_BADGE = {
  Open: "badge badge-open",
  "In Progress": "badge badge-progress",
  Solved: "badge badge-solved",
  Reviewed: "badge badge-reviewed",
  Closed: "badge badge-closed",
};

const STATUS_ICON = {
  Open: "🔵",
  "In Progress": "🟡",
  Solved: "🟢",
  Reviewed: "🟣",
  Closed: "⚫",
};

const PRIORITY_BADGE = {
  Low: "badge badge-low",
  Medium: "badge badge-medium",
  High: "badge badge-high",
  hard: "badge badge-high",
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
    fetchProblems();
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
      setFormSuccess("Problem raised successfully! ✅");
      setNewProblem({ title: "", description: "", category: "Other", priority: "Medium" });
      fetchProblems();
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
      fetchProblems();
    } catch (err) {
      alert(err.response?.data?.message || "Could not accept problem.");
    } finally {
      setAcceptingId(null);
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

  return (
    <div className="dashboard-layout">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">🎯</div>
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
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon purple">📋</div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Problems</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">🔵</div>
            <div>
              <div className="stat-value">{stats.open}</div>
              <div className="stat-label">Open</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">⚡</div>
            <div>
              <div className="stat-value">{stats.inProgress}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div>
              <div className="stat-value">{stats.solved}</div>
              <div className="stat-label">Solved</div>
            </div>
          </div>
        </div>

        {/* Raise Problem Form */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">🚨 Raise a Problem</h2>
          </div>
          <div className="section-body">
            {formError && (
              <div className="alert alert-error">
                <span>⚠️</span> {formError}
              </div>
            )}
            {formSuccess && (
              <div className="alert alert-success">
                <span>✅</span> {formSuccess}
              </div>
            )}
            <form className="problem-form" onSubmit={createProblem}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Problem Title</label>
                <input
                  className="form-input"
                  name="title"
                  placeholder="Brief summary of the issue..."
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
                    <option value="Technical">🔧 Technical</option>
                    <option value="HR">🧑‍💼 HR</option>
                    <option value="Finance">💰 Finance</option>
                    <option value="Operations">⚙️ Operations</option>
                    <option value="Other">📌 Other</option>
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
                    <option value="Low">🟢 Low</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="High">🔴 High</option>
                    <option value="hard">🔥 Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  name="description"
                  placeholder="Describe the problem in detail..."
                  value={newProblem.description}
                  onChange={handleChange}
                />
              </div>

              <div>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                  style={{ width: "auto", padding: "12px 32px" }}
                >
                  {submitting ? <span className="spinner" /> : "🚀"}&nbsp;
                  {submitting ? "Submitting..." : "Submit Problem"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Problems List */}
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">📋 All Problems</h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchProblems}
            >
              🔄 Refresh
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
              <div className="alert alert-error">
                <span>⚠️</span> {error}
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
                <div className="empty-state-icon">📭</div>
                <p className="empty-state-text">No problems found in this category.</p>
              </div>
            ) : (
              <div className="problem-list">
                {filteredProblems.map((p) => (
                  <div className="problem-card" key={p._id}>
                    <div className="problem-card-header">
                      <h3 className="problem-title">{p.title}</h3>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <span className={PRIORITY_BADGE[p.priority] || "badge badge-medium"}>
                          {p.priority || "Medium"}
                        </span>
                        <span className={STATUS_BADGE[p.status] || "badge badge-open"}>
                          {STATUS_ICON[p.status]} {p.status}
                        </span>
                      </div>
                    </div>

                    <p className="problem-desc">{p.description}</p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div className="problem-meta">
                        <span className="problem-meta-item">
                          👤 {p.raisedBy?.name || "Unknown"}
                        </span>
                        {p.acceptedBy && (
                          <span className="problem-meta-item">
                            🛠️ {p.acceptedBy?.name}
                          </span>
                        )}
                        <span className="problem-meta-item">
                          📁 {p.category || "Other"}
                        </span>
                        <span className="problem-meta-item">
                          🗓️ {formatDate(p.createdAt)}
                        </span>
                      </div>

                      {p.status === "Open" && (
                        <button
                          className="btn btn-success"
                          onClick={() => {
                            setAcceptingId(p._id);
                            // If this was meant to be feedback, the logic needs to be similar to EmployeeDashboard
                            // But Dashboard.jsx seems to have mixed logic. 
                            // Wait, Dashboard.jsx only has "Accept Problem" button for Open status.
                            // It doesn't seem to have the feedback button for Solved status in the viewer.
                            // Let's re-read the file content.
                            acceptProblem(p._id);
                          }}
                          disabled={acceptingId === p._id}
                        >
                          {acceptingId === p._id ? (
                            <span className="spinner" />
                          ) : (
                            "✋"
                          )}{" "}
                          {acceptingId === p._id ? "Accepting..." : "Accept Problem"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
