import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { listJobs } from "../services/jobs";
import JobStatusBadge from "./JobStatusBadge";

const JobTable = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["jobs"],
    queryFn: listJobs,
    refetchInterval: 10_000
  });

  if (isLoading) {
    return <div className="card">Loading job history…</div>;
  }

  if (error) {
    return (
      <div className="card">
        <p>Unable to load jobs: {(error as Error).message}</p>
        <button className="button-secondary" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const jobs = data?.jobs ?? [];

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem"
        }}
      >
        <h2 style={{ margin: 0 }}>Recent Jobs</h2>
        <button className="button-secondary" onClick={() => refetch()}>
          Refresh
        </button>
      </div>
      {jobs.length === 0 ? (
        <p>No jobs submitted yet.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.95rem"
          }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                borderBottom: "1px solid #e5e7eb",
                color: "#64748b"
              }}
            >
              <th style={{ padding: "0.75rem 0" }}>Job</th>
              <th>Status</th>
              <th>Started</th>
              <th>Completed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.job_id}
                style={{ borderBottom: "1px solid #f1f5f9", color: "#1f2937" }}
              >
                <td style={{ padding: "0.75rem 0" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <strong>{job.job_id}</strong>
                    <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                      {job.config_path}
                    </span>
                  </div>
                </td>
                <td>
                  <JobStatusBadge status={job.status} />
                </td>
                <td>{job.started_at ? new Date(job.started_at).toLocaleString() : "—"}</td>
                <td>
                  {job.completed_at ? new Date(job.completed_at).toLocaleString() : "—"}
                </td>
                <td>
                  <Link to={`/jobs/${job.job_id}`} className="button-secondary">
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default JobTable;
