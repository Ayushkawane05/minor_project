import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import socket from "../socket";
import {
    Target, LogOut, FileText, CircleDot, Clock, CheckCircle, Lock,
    FileCheck, RotateCcw, Award, Star, User, Search, Send, MessageSquare, Trophy
} from "lucide-react";

// Status Icons Mapping
const StatusIcon = ({ status, size = 16 }) => {
    switch (status) {
        case "Open": return <CircleDot size={size} />;
        case "In Progress": return <Clock size={size} />;
        case "Solved": return <CheckCircle size={size} />;
        case "Reviewed": return <FileCheck size={size} />;
        case "Closed": return <Lock size={size} />;
        default: return <CircleDot size={size} />;
    }
};

const STATUS_BADGE = {
    Open: "badge badge-open",
    "In Progress": "badge badge-progress",
    Solved: "badge badge-solved",
    Reviewed: "badge badge-reviewed",
    Closed: "badge badge-closed",
};

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
                        cursor: "pointer",
                        transition: "transform 0.15s",
                        transform: star <= (hovered || value) ? "scale(1.2)" : "scale(1)",
                        display: "inline-block",
                    }}
                >
                    <Star
                        size={28}
                        fill={star <= (hovered || value) ? "#f59e0b" : "none"}
                        color={star <= (hovered || value) ? "#f59e0b" : "#334466"}
                    />
                </span>
            ))}
            {value > 0 && (
                <span style={{ fontSize: 13, color: "var(--text-muted)", alignSelf: "center", marginLeft: 4 }}>
                    {["", "Poor", "Fair", "Good", "Great", "Excellent"][value]}
                </span>
            )}
        </div>
    );
}

function Modal({ title, onClose, children, maxWidth = 480 }) {
    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 16, backdropFilter: "blur(4px)"
        }}>
            <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-xl)", padding: 32, width: "100%",
                maxWidth: maxWidth, boxShadow: "var(--shadow-lg)", animation: "slideUp 0.25s ease"
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

    // Leaderboard State
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(true);
    const [leaderboardView, setLeaderboardView] = useState("grid");
    const [leaderboardSort, setLeaderboardSort] = useState("points");

    // User History state
    const [selectedUserHistory, setSelectedUserHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

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

    // Accept problem state
    const [acceptingId, setAcceptingId] = useState(null);

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

    const fetchLeaderboard = useCallback(async () => {
        setLeaderboardLoading(true);
        try {
            const { data } = await API.get("/admin/leaderboard");
            setLeaderboardData(data);
        } catch (err) {
            console.error("Failed to load leaderboard", err);
        } finally {
            setLeaderboardLoading(false);
        }
    }, []);

    const fetchUserHistory = async (userId) => {
        setHistoryLoading(true);
        try {
            const { data } = await API.get(`/admin/leaderboard/${userId}/history`);
            setSelectedUserHistory(data);
        } catch (err) {
            alert("Failed to load user history");
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (!localStorage.getItem("token")) { navigate("/"); return; }
        fetchProblems();
        if (activeTab === "leaderboard") fetchLeaderboard();

        // Socket listeners
        socket.on("newProblem", (problem) => {
            setProblems((prev) => prev.find((p) => p.problemId === problem.problemId) ? prev : [problem, ...prev]);
        });
        socket.on("problemUpdated", (upd) => setProblems((prev) => prev.map((p) => p.problemId === upd.problemId ? upd : p)));
        socket.on("solutionSubmitted", (sol) => {
            setProblems((prev) => prev.map((p) => {
                if (p.problemId === (sol.problemDetails?.problemId || sol.problem)) return { ...p, status: "Solved", solution: sol };
                return p;
            }));
        });

        return () => {
            socket.off("newProblem");
            socket.off("problemUpdated");
            socket.off("solutionSubmitted");
        };
    }, [fetchProblems, fetchLeaderboard, activeTab, navigate]);

    const createProblem = async (e) => {
        e.preventDefault();
        setFormError(""); setFormSuccess("");
        if (!newProblem.title.trim() || !newProblem.description.trim()) { setFormError("All fields required"); return; }
        setSubmitting(true);
        try {
            await API.post("/problems", newProblem);
            setFormSuccess("Problem raised!");
            setNewProblem({ title: "", description: "", category: "Other", priority: "Medium" });
            fetchProblems();
            setTimeout(() => setFormSuccess(""), 3000);
        } catch (err) { setFormError("Failed to raise"); }
        finally { setSubmitting(false); }
    };

    const acceptProblem = async (id) => {
        setAcceptingId(id);
        try { await API.put(`/problems/${id}/accept`); }
        catch (err) { alert(err.response?.data?.message || "Could not accept"); }
        finally { setAcceptingId(null); }
    };

    const deleteProblem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this problem?")) return;
        try {
            await API.delete(`/problems/${id}`);
            fetchProblems();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    const submitSolution = async () => {
        if (!solutionText.trim()) { setSolutionError("Required"); return; }
        setSolutionLoading(true);
        try {
            await API.post(`/solutions/${solutionModal._id}`, { solutionText });
            setSolutionModal(null); setSolutionText(""); fetchProblems();
        } catch (err) { setSolutionError("Failed"); }
        finally { setSolutionLoading(false); }
    };

    const submitFeedback = async () => {
        if (feedbackRating === 0 || !feedbackComment.trim()) { setFeedbackError("Required"); return; }
        setFeedbackLoading(true);
        try {
            const sid = feedbackModal.solution?._id || feedbackModal.solution;
            await API.post(`/feedback/${sid}`, { rating: feedbackRating, comment: feedbackComment, role: user.role });
            setFeedbackSuccess("Submitted!");
            setTimeout(() => { setFeedbackModal(null); fetchProblems(); }, 1500);
        } catch (err) { setFeedbackError("Failed"); }
        finally { setFeedbackLoading(false); }
    };

    const sortedUsers = (() => [...leaderboardData].sort((a, b) => {
        if (leaderboardSort === "points") return (b.totalPoints || 0) - (a.totalPoints || 0);
        if (leaderboardSort === "rating") return (b.averageRating || 0) - (a.averageRating || 0);
        if (leaderboardSort === "solved") return (b.problemsSolved?.length || 0) - (a.problemsSolved?.length || 0);
        return 0;
    }))();

    const getInitials = (n = "") => n.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2);
    const myProblems = problems.filter((p) => p.raisedBy === user.userId);
    const myAccepted = problems.filter((p) => p.acceptedBy === user.userId && p.status === "In Progress");

    const filteredProblems = (() => {
        if (activeTab === "mine") return myProblems;
        if (activeTab === "accepted") return myAccepted;
        if (activeTab === "open") return problems.filter((p) => p.status === "Open");
        return problems;
    })();

    const stats = { raised: myProblems.length, open: problems.filter((p) => p.status === "Open").length, solving: myAccepted.length, solved: problems.filter((p) => p.status === "Solved").length };

    return (
        <div className="dashboard-layout">
            <nav className="navbar">
                <div className="navbar-brand">
                    <div className="navbar-logo"><Target size={20} color="white" /></div>
                    <span className="navbar-title">ProblemTrack</span>
                </div>
                <div className="navbar-right">
                    <div className="navbar-user">
                        <div className="navbar-avatar">{getInitials(user.name)}</div>
                        <div className="navbar-user-info">
                            <div className="navbar-user-name">{user.name}</div>
                            <div className="navbar-user-role">{user.role}</div>
                            {user.totalPoints !== undefined && <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><Award size={12} /> {Math.round(user.totalPoints)} Pts</div>}
                        </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={handleLogout}><LogOut size={16} /> Logout</button>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-icon purple"><FileText size={24} color="#6366f1" /></div>
                        <div><div className="stat-value">{stats.raised}</div><div className="stat-label">Raised</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon blue"><CircleDot size={24} color="#3b82f6" /></div>
                        <div><div className="stat-value">{stats.open}</div><div className="stat-label">Open</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow"><Clock size={24} color="#f59e0b" /></div>
                        <div><div className="stat-value">{stats.solving}</div><div className="stat-label">Solving</div></div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green"><CheckCircle size={24} color="#10b981" /></div>
                        <div><div className="stat-value">{stats.solved}</div><div className="stat-label">Solved</div></div>
                    </div>
                </div>

                <div className="section" style={{ display: activeTab === "leaderboard" ? "none" : "block" }}>
                    <div className="section-header"><h2 className="section-title"><Target size={20} /> Raise Problem</h2></div>
                    <div className="section-body">
                        {formError && <div className="alert alert-error">{formError}</div>}
                        {formSuccess && <div className="alert alert-success">{formSuccess}</div>}
                        <form className="problem-form" onSubmit={createProblem}>
                            <input className="form-input" placeholder="Title..." value={newProblem.title} onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })} />
                            <div className="problem-form-row">
                                <select className="form-select" value={newProblem.category} onChange={(e) => setNewProblem({ ...newProblem, category: e.target.value })}>
                                    <option value="Technical">Technical</option><option value="HR">HR</option><option value="Finance">Finance</option><option value="Operations">Operations</option><option value="Other">Other</option>
                                </select>
                                <select className="form-select" value={newProblem.priority} onChange={(e) => setNewProblem({ ...newProblem, priority: e.target.value })}>
                                    <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="hard">Critical</option>
                                </select>
                            </div>
                            <textarea className="form-textarea" placeholder="Description..." value={newProblem.description} onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })} />
                            <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? "..." : "Submit"}</button>
                        </form>
                    </div>
                </div>

                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">{activeTab === "leaderboard" ? <><Trophy size={20} /> Leaderboard</> : <><FileText size={20} /> Problems</>}</h2>
                        <button className="btn btn-secondary btn-sm" onClick={() => { fetchProblems(); if (activeTab === "leaderboard") fetchLeaderboard(); }}><RotateCcw size={16} /> Refresh</button>
                    </div>
                    <div className="section-body">
                        <div className="tabs">
                            {[
                                { key: "all", label: "All" },
                                { key: "open", label: "Open" },
                                { key: "mine", label: "My Raised" },
                                { key: "accepted", label: "Solving" },
                                { key: "leaderboard", label: "Leaderboard" }
                            ].map((t) => (
                                <button key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
                            ))}
                        </div>

                        {activeTab === "leaderboard" ? (
                            <div className="leaderboard-view">
                                <div className="leaderboard-controls" style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, padding: 12, background: "rgba(0,0,0,0.02)", borderRadius: 12 }}>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button className={`btn btn-${leaderboardView === "grid" ? "primary" : "secondary"} btn-sm`} onClick={() => setLeaderboardView("grid")}>Grid</button>
                                        <button className={`btn btn-${leaderboardView === "table" ? "primary" : "secondary"} btn-sm`} onClick={() => setLeaderboardView("table")}>Table</button>
                                    </div>
                                    <select className="form-select" style={{ width: "auto" }} value={leaderboardSort} onChange={(e) => setLeaderboardSort(e.target.value)}>
                                        <option value="points">Points</option><option value="rating">Rating</option><option value="solved">Solved</option>
                                    </select>
                                </div>
                                {leaderboardLoading ? <div>Loading...</div> : leaderboardView === "grid" ? (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                                        {sortedUsers.map((e, i) => (
                                            <div key={e.userId} className="stat-card" style={{ flexDirection: "column", gap: 12, padding: 24, position: "relative" }}>
                                                {i < 3 && <div style={{ position: "absolute", top: -10, right: -10, background: "var(--bg-card)", fontSize: 24, padding: 4, borderRadius: "50%", border: "1px solid var(--border)" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>}
                                                <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => fetchUserHistory(e.userId)}>
                                                    <div className="navbar-avatar" style={{ margin: 0 }}>{getInitials(e.name)}</div>
                                                    <div><div style={{ fontWeight: 700 }}>{e.name} {e.userId === user.userId && "(You)"}</div><div style={{ fontSize: 10, color: "var(--text-muted)" }}>{e.role} • {e.userId}</div></div>
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, width: "100%" }}>
                                                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 10 }}>Pts</div><div style={{ fontWeight: 800 }}>{Math.round(e.totalPoints)}</div></div>
                                                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 10 }}>Star</div><div style={{ fontWeight: 800 }}>{e.averageRating?.toFixed(1) || "—"}</div></div>
                                                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 10 }}>Slvd</div><div style={{ fontWeight: 800 }}>{e.problemsSolved?.length || 0}</div></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead><tr style={{ textAlign: "left", fontSize: 12, color: "var(--text-muted)" }}><th style={{ padding: 12 }}>Rank</th><th style={{ padding: 12 }}>User</th><th style={{ padding: 12 }}>ID</th><th style={{ padding: 12 }}>Pts</th><th style={{ padding: 12 }}>Slvd</th></tr></thead>
                                        <tbody>{sortedUsers.map((e, i) => (
                                            <tr key={e.userId} style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }} onClick={() => fetchUserHistory(e.userId)}>
                                                <td style={{ padding: 12 }}>{i + 1}</td>
                                                <td style={{ padding: 12 }}>{e.name}</td>
                                                <td style={{ padding: 12, fontSize: 11, color: "var(--text-muted)" }}>{e.userId}</td>
                                                <td style={{ padding: 12 }}>{Math.round(e.totalPoints)}</td>
                                                <td style={{ padding: 12 }}>{e.problemsSolved?.length || 0}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                )}
                            </div>
                        ) : loading ? <div>Loading...</div> : filteredProblems.length === 0 ? (
                            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                                <FileText size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                                <div>No problems found in this category</div>
                            </div>
                        ) : (
                            <div className="problem-list">
                                {filteredProblems.map((p) => {
                                    const isS = p.acceptedBy === user.userId, isR = p.raisedBy === user.userId;
                                    return (
                                        <div className="problem-card" key={p.problemId}>
                                            <div className="problem-card-header">
                                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>{p.problemId}</span>
                                                    <h3 className="problem-title">{p.title}</h3>
                                                </div>
                                                <span className={STATUS_BADGE[p.status]}>{p.status}</span>
                                            </div>
                                            <p className="problem-desc">{p.description}</p>
                                            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                                {isR && p.status === "Open" && <button className="btn btn-danger btn-sm" onClick={() => deleteProblem(p._id)}>Delete</button>}
                                                {p.status === "Open" && !isR && <button className="btn btn-success btn-sm" onClick={() => acceptProblem(p._id)}>Accept</button>}
                                                {isS && p.status === "In Progress" && <button className="btn btn-primary btn-sm" onClick={() => setSolutionModal(p)}>Submit Solution</button>}
                                                {isR && p.status === "Solved" && !p.rating && <button className="btn btn-success btn-sm" onClick={() => setFeedbackModal(p)}>Rate Solution</button>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {solutionModal && <Modal title="Solve" onClose={() => setSolutionModal(null)}><textarea className="form-textarea" value={solutionText} onChange={(e) => setSolutionText(e.target.value)} /><button className="btn btn-primary" onClick={submitSolution} style={{ marginTop: 12 }}>Submit</button></Modal>}
            {feedbackModal && <Modal title="Rate" onClose={() => setFeedbackModal(null)}><StarRating value={feedbackRating} onChange={setFeedbackRating} /><textarea className="form-textarea" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} /><button className="btn btn-primary" onClick={submitFeedback} style={{ marginTop: 12 }}>Rate</button></Modal>}
            {selectedUserHistory && (
                <Modal title={`${selectedUserHistory.name}'s History`} onClose={() => setSelectedUserHistory(null)} maxWidth={540}>
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        <div style={{ marginBottom: 16, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                            <span>User ID: <strong>{selectedUserHistory.userId}</strong></span>
                            <span>Total Points: <strong>{Math.round(selectedUserHistory.totalPoints)}</strong></span>
                        </div>
                        {selectedUserHistory.solvedProblems?.length === 0 ? <div>No solutions yet</div> : selectedUserHistory.solvedProblems.map((p) => (
                            <div key={p.problemId} style={{ padding: 12, background: "rgba(0,0,0,0.02)", marginBottom: 8, borderRadius: 8, border: "1px solid var(--border)" }}>
                                <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700 }}>{p.problemId}</div>
                                <div style={{ fontWeight: 600 }}>{p.title}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(p.solvedAt || p.updatedAt).toLocaleDateString()} • {p.status} {p.rating && `• Star: ${p.rating}`}</div>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-secondary" style={{ width: "100%", marginTop: 16 }} onClick={() => setSelectedUserHistory(null)}>Close</button>
                </Modal>
            )}
            {historyLoading && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}><span className="spinner" /></div>}
        </div>
    );
}
