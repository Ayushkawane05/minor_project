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
const STATUS_ICON = { Open: "🔵", "In Progress": "🟡", Solved: "🟢", Reviewed: "🟣", Closed: "⚫" };
const PRIORITY_BADGE = { Low: "badge badge-low", Medium: "badge badge-medium", High: "badge badge-high", hard: "badge badge-high" };

function StarRating({ value, onChange }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    style={{
                        fontSize: 28,
                        cursor: "pointer",
                        color: star <= (hovered || value) ? "#f59e0b" : "#334466",
                        transition: "color 0.15s, transform 0.15s",
                        transform: star <= (hovered || value) ? "scale(1.2)" : "scale(1)",
                        display: "inline-block",
                    }}
                >★</span>
            ))}
            {value > 0 && (
                <span style={{ fontSize: 13, color: "var(--text-muted)", alignSelf: "center", marginLeft: 4 }}>
                    {["", "Poor", "Fair", "Good", "Great", "Excellent"][value]}
                </span>
            )}
        </div>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 16, backdropFilter: "blur(4px)"
        }}>
            <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)", padding: 32, width: "100%",
                maxWidth: 480, boxShadow: "var(--shadow-lg)", animation: "slideUp 0.25s ease"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
                    <button onClick={onClose} style={{
                        background: "none", border: "none", color: "var(--text-muted)",
                        fontSize: 22, cursor: "pointer", lineHeight: 1
                    }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function EmployeeDashboard() {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");

    // Raise problem form
    const [newProblem, setNewProblem] = useState({ title: "", description: "", category: "Other", priority: "Medium" });
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Solution modal
    const [solutionModal, setSolutionModal] = useState(null); // problem object
    const [solutionText, setSolutionText] = useState("");
    const [solutionError, setSolutionError] = useState("");
    const [solutionLoading, setSolutionLoading] = useState(false);

    // Feedback modal
    const [feedbackModal, setFeedbackModal] = useState(null); // problem object (with solution)
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackComment, setFeedbackComment] = useState("");
    const [feedbackError, setFeedbackError] = useState("");
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackSuccess, setFeedbackSuccess] = useState("");

    const navigate = useNavigate();
    const user = (() => { try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; } })();

    const handleLogout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    }, [navigate]);

    const fetchProblems = useCallback(async () => {
        try {
            const { data } = await API.get("/problems");
            setProblems(data);
        } catch (err) {
            if (err.response?.status === 401) handleLogout();
        } finally {
            setLoading(false);
        }
    }, [handleLogout]);

    useEffect(() => {
        if (!localStorage.getItem("token")) { navigate("/"); return; }
        fetchProblems();
    }, [fetchProblems, navigate]);



    const createProblem = async (e) => {
        e.preventDefault();
        setFormError(""); setFormSuccess("");
        if (!newProblem.title.trim() || !newProblem.description.trim()) {
            setFormError("Title and description are required."); return;
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

    const submitSolution = async () => {
        setSolutionError("");
        if (!solutionText.trim()) { setSolutionError("Please write your solution."); return; }
        setSolutionLoading(true);
        try {
            await API.post(`/solutions/${solutionModal._id}`, { solutionText });
            setSolutionModal(null);
            setSolutionText("");
            fetchProblems();
        } catch (err) {
            setSolutionError(err.response?.data?.message || "Failed to submit solution.");
        } finally {
            setSolutionLoading(false);
        }
    };

    const submitFeedback = async () => {
        setFeedbackError(""); setFeedbackSuccess("");
        if (feedbackRating === 0) { setFeedbackError("Please select a star rating."); return; }
        if (!feedbackComment.trim()) { setFeedbackError("Please write a feedback comment."); return; }
        setFeedbackLoading(true);
        try {
            // Get solution id for this problem
            const solutionId = feedbackModal.solution?._id || feedbackModal.solution;
            await API.post(`/feedback/${solutionId}`, { rating: feedbackRating, comment: feedbackComment });
            setFeedbackSuccess("Feedback submitted! Thank you. ✅");
            setTimeout(() => { setFeedbackModal(null); setFeedbackRating(0); setFeedbackComment(""); setFeedbackSuccess(""); fetchProblems(); }, 1500);
        } catch (err) {
            setFeedbackError(err.response?.data?.message || "Failed to submit feedback.");
        } finally {
            setFeedbackLoading(false);
        }
    };

    const getInitials = (name = "") => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

    const myProblems = problems.filter((p) => p.raisedBy?._id === user._id);
    const myAccepted = problems.filter((p) => p.acceptedBy?._id === user._id && p.status === "In Progress");

    const filteredProblems = (() => {
        if (activeTab === "mine") return myProblems;
        if (activeTab === "accepted") return myAccepted;
        if (activeTab === "open") return problems.filter((p) => p.status === "Open");
        return problems;
    })();

    const stats = {
        raised: myProblems.length,
        open: problems.filter((p) => p.status === "Open").length,
        solving: myAccepted.length,
        solved: problems.filter((p) => p.status === "Solved").length,
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
                            <div className="navbar-user-name">{user.name || "Employee"}</div>
                            <div className="navbar-user-role">👤 {user.role || "Employee"}</div>
                            {user.totalPoints !== undefined && (
                                <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, marginTop: 2 }}>
                                    ✨ {Math.round(user.totalPoints)} Points
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={handleLogout}>🚪 Logout</button>
                </div>
            </nav>

            <main className="dashboard-main">
                {/* Stats */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon purple">📋</div>
                        <div><div className="stat-value">{stats.raised}</div><div className="stat-label">My Problems</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon blue">🔵</div>
                        <div><div className="stat-value">{stats.open}</div><div className="stat-label">Open</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow">⚡</div>
                        <div><div className="stat-value">{stats.solving}</div><div className="stat-label">I'm Solving</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green">✅</div>
                        <div><div className="stat-value">{stats.solved}</div><div className="stat-label">Solved</div></div>
                    </div>
                </div>

                {/* Raise Problem */}
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">🚨 Raise a Problem</h2>
                    </div>
                    <div className="section-body">
                        {formError && <div className="alert alert-error"><span>⚠️</span> {formError}</div>}
                        {formSuccess && <div className="alert alert-success"><span>✅</span> {formSuccess}</div>}
                        <form className="problem-form" onSubmit={createProblem}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Problem Title</label>
                                <input className="form-input" name="title" placeholder="Brief summary of the issue..."
                                    value={newProblem.title} onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })} />
                            </div>
                            <div className="problem-form-row">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Category</label>
                                    <select className="form-select" name="category" value={newProblem.category}
                                        onChange={(e) => setNewProblem({ ...newProblem, category: e.target.value })}>
                                        <option value="Technical">Technical</option>
                                        <option value="HR">HR</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Operations">Operations</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" name="priority" value={newProblem.priority}
                                        onChange={(e) => setNewProblem({ ...newProblem, priority: e.target.value })}>
                                        <option value="Low">🟢 Low</option>
                                        <option value="Medium">🟡 Medium</option>
                                        <option value="High">🔴 High</option>
                                        <option value="hard">🔥 Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" name="description" placeholder="Describe the problem in detail..."
                                    value={newProblem.description} onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })} />
                            </div>
                            <div>
                                <button className="btn btn-primary" type="submit" disabled={submitting}
                                    style={{ width: "auto", padding: "12px 32px" }}>
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
                        <h2 className="section-title">📋 Problems</h2>
                        <button className="btn btn-secondary btn-sm" onClick={fetchProblems}>🔄 Refresh</button>
                    </div>
                    <div className="section-body">
                        <div className="tabs">
                            {[
                                { key: "all", label: "All Problems" },
                                { key: "open", label: "Open" },
                                { key: "mine", label: "My Raised" },
                                { key: "accepted", label: "I'm Solving" },
                            ].map((tab) => (
                                <button key={tab.key} className={`tab ${activeTab === tab.key ? "active" : ""}`}
                                    onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="empty-state">
                                <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                                <p className="empty-state-text" style={{ marginTop: 12 }}>Loading...</p>
                            </div>
                        ) : filteredProblems.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📭</div>
                                <p className="empty-state-text">No problems here.</p>
                            </div>
                        ) : (
                            <div className="problem-list">
                                {filteredProblems.map((p) => {
                                    const isSolver = p.acceptedBy?._id === user._id;
                                    const isRaiser = p.raisedBy?._id === user._id;
                                    return (
                                        <div className="problem-card" key={p._id}>
                                            <div className="problem-card-header">
                                                <h3 className="problem-title">{p.title}</h3>
                                                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                                    <span className={PRIORITY_BADGE[p.priority] || "badge badge-medium"}>{p.priority || "Medium"}</span>
                                                    <span className={STATUS_BADGE[p.status] || "badge badge-open"}>{STATUS_ICON[p.status]} {p.status}</span>
                                                </div>
                                            </div>
                                            <p className="problem-desc">{p.description}</p>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                                                <div className="problem-meta">
                                                    <span className="problem-meta-item">👤 {p.raisedBy?.name || "Unknown"}</span>
                                                    <span className="problem-meta-item">📁 {p.category || "Other"}</span>
                                                    {p.status === "Solved" && p.acceptedBy?._id === user.id && (
                                                        <span className="problem-meta-item" style={{ color: "#a78bfa", fontWeight: 700 }}>
                                                            ✨ Achievement: +{Math.round(p.rating * (p.solution?.sentimentScore || 0.8) * 20)} Pts
                                                        </span>
                                                    )}
                                                    {p.acceptedBy && (
                                                        <span className="problem-meta-item" style={{
                                                            color: p.status === "Solved" ? "#10b981" : "var(--text-secondary)",
                                                            fontWeight: p.status === "Solved" ? 600 : 400,
                                                            background: p.status === "Solved" ? "rgba(16,185,129,0.1)" : "transparent",
                                                            padding: p.status === "Solved" ? "2px 8px" : "0",
                                                            borderRadius: "4px"
                                                        }}>
                                                            {p.status === "Solved" ? "✅ Solved by: " : "🛠️ Assigned to: "} {p.acceptedBy?.name}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Solution Content Display */}
                                                {(p.status === "Solved" || p.status === "Reviewed" || p.status === "Closed") && p.solution && (
                                                    <div style={{
                                                        marginTop: 14,
                                                        padding: "12px 16px",
                                                        background: "rgba(16,185,129,0.05)",
                                                        borderRadius: 8,
                                                        borderLeft: "4px solid #10b981",
                                                        width: "100%"
                                                    }}>
                                                        <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase", marginBottom: 6 }}>
                                                            💡 Solution Provided
                                                        </div>
                                                        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>
                                                            {p.solution.content || p.solution}
                                                        </p>
                                                    </div>
                                                )}

                                                <div style={{ display: "flex", gap: 8, marginTop: 12, width: "100%", justifyContent: "flex-end" }}>
                                                    {/* Submit solution: only the person who accepted it, when In Progress */}
                                                    {isSolver && p.status === "In Progress" && (
                                                        <button className="btn btn-success" onClick={() => { setSolutionModal(p); setSolutionText(""); setSolutionError(""); }}>
                                                            📝 Submit Solution
                                                        </button>
                                                    )}
                                                    {/* Give feedback: only the raiser, when Solved, and if not already rated */}
                                                    {isRaiser && p.status === "Solved" && !p.rating && (
                                                        <button className="btn btn-success" style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8", borderColor: "rgba(99,102,241,0.2)" }}
                                                            onClick={() => { setFeedbackModal({ ...p, solutionId: p.solution?._id || p.solution }); setFeedbackRating(0); setFeedbackComment(""); setFeedbackError(""); }}>
                                                            ⭐ Give Feedback
                                                        </button>
                                                    )}
                                                    {p.status === "Solved" && p.rating && (
                                                        <span style={{
                                                            color: "var(--text-muted)",
                                                            fontSize: 13,
                                                            alignSelf: "center",
                                                            background: "rgba(255,255,255,0.03)",
                                                            padding: "4px 10px",
                                                            borderRadius: "6px",
                                                            border: "1px solid rgba(255,255,255,0.05)"
                                                        }}>
                                                            ⭐ Rated: {p.rating}/5
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Solution Modal */}
            {solutionModal && (
                <Modal title="📝 Submit Your Solution" onClose={() => setSolutionModal(null)}>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
                        Problem: <strong style={{ color: "var(--text-primary)" }}>{solutionModal.title}</strong>
                    </p>
                    {solutionError && <div className="alert alert-error"><span>⚠️</span> {solutionError}</div>}
                    <div className="form-group">
                        <label className="form-label">Your Solution</label>
                        <textarea className="form-textarea" style={{ minHeight: 140 }}
                            placeholder="Describe how you resolved this problem..."
                            value={solutionText} onChange={(e) => setSolutionText(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button className="btn btn-primary" onClick={submitSolution} disabled={solutionLoading}>
                            {solutionLoading ? <span className="spinner" /> : "✅"}&nbsp;
                            {solutionLoading ? "Submitting..." : "Submit Solution"}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setSolutionModal(null)}>Cancel</button>
                    </div>
                </Modal>
            )}

            {/* Feedback Modal */}
            {feedbackModal && (
                <Modal title="⭐ Rate & Give Feedback" onClose={() => setFeedbackModal(null)}>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
                        Problem: <strong style={{ color: "var(--text-primary)" }}>{feedbackModal.title}</strong>
                    </p>
                    {feedbackError && <div className="alert alert-error"><span>⚠️</span> {feedbackError}</div>}
                    {feedbackSuccess && <div className="alert alert-success"><span>✅</span> {feedbackSuccess}</div>}
                    <div className="form-group">
                        <label className="form-label">Rating</label>
                        <StarRating value={feedbackRating} onChange={setFeedbackRating} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Feedback Comment</label>
                        <textarea className="form-textarea" style={{ minHeight: 100 }}
                            placeholder="How well was the problem resolved? Share your thoughts..."
                            value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} />
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button className="btn btn-primary" onClick={submitFeedback} disabled={feedbackLoading}>
                            {feedbackLoading ? <span className="spinner" /> : "⭐"}&nbsp;
                            {feedbackLoading ? "Submitting..." : "Submit Feedback"}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setFeedbackModal(null)}>Cancel</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
