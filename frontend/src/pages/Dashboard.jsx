import { useEffect, useState } from "react";
import API from "../api/api";

export default function Dashboard() {
  const [problems, setProblems] = useState([]);
  const [newProblem, setNewProblem] = useState({
    title: "",
    description: "",
  });

  const fetchProblems = async () => {
    const { data } = await API.get("/problems");
    setProblems(data);
  };
  
  useEffect(() => {
    fetchProblems();
  }, []);


  const createProblem = async () => {
    await API.post("/problems", newProblem);
    fetchProblems();
  };

  const acceptProblem = async (id) => {
    await API.put(`/problems/${id}/accept`);
    fetchProblems();
  };

  return (
    <div>
      <h2>Dashboard</h2>

      <h3>Create Problem</h3>
      <input
        placeholder="Title"
        onChange={(e) =>
          setNewProblem({ ...newProblem, title: e.target.value })
        }
      />
      <input
        placeholder="Description"
        onChange={(e) =>
          setNewProblem({ ...newProblem, description: e.target.value })
        }
      />
      <button onClick={createProblem}>Post</button>

      <h3>All Problems</h3>
      {problems.map((p) => (
        <div key={p._id}>
          <h4>{p.title}</h4>
          <p>{p.description}</p>
          <p>Status: {p.status}</p>
          {p.status === "Open" && (
            <button onClick={() => acceptProblem(p._id)}>
              Accept
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
