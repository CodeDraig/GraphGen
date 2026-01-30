import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import JobStatusBadge from "../components/JobStatusBadge";
import { getJob, getJobArtifacts, getJobLogs } from "../services/jobs";
import type { LLMSettings } from "../types/jobs";

const LLM_FIELD_DEFINITIONS: Array<{ key: keyof LLMSettings; label: string }> = [
  { key: "synthesizer_model", label: "Synthesizer Model" },
  { key: "synthesizer_base_url", label: "Synthesizer Endpoint" },
  { key: "synthesizer_api_key", label: "Synthesizer API Key" },
  { key: "trainee_model", label: "Trainee Model" },
  { key: "trainee_base_url", label: "Trainee Endpoint" },
  { key: "trainee_api_key", label: "Trainee API Key" },
  { key: "tokenizer_model", label: "Tokenizer Model" }
];

const useJobDetail = (jobId: string) => {
  const jobQuery = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "queued" ? 5000 : false;
    }
  });

  const logsQuery = useQuery({
    queryKey: ["job", jobId, "logs"],
    queryFn: () => getJobLogs(jobId),
    enabled: jobQuery.data !== undefined,
    refetchInterval: (query) => {
      const status = jobQuery.data?.status;
      if (!status || status === "succeeded" || status === "failed") {
        return false;
      }
      return 5000;
    }
  });

  const artifactsQuery = useQuery({
    queryKey: ["job", jobId, "artifacts"],
    queryFn: () => getJobArtifacts(jobId),
    enabled: jobQuery.data?.status === "succeeded",
    refetchOnWindowFocus: false
  });

  return { jobQuery, logsQuery, artifactsQuery };
};

const JobDetail = () => {
  const params = useParams();
  const jobId = params.jobId ?? "";
  const { jobQuery, logsQuery, artifactsQuery } = useJobDetail(jobId);
  const apiBase =
    ((import.meta.env.VITE_API_BASE as string | undefined) ?? "/api").replace(
      /\/$/,
      ""
    );

  const job = jobQuery.data;
  const llmSettings = job?.llm_settings ?? null;
  const llmItems = useMemo(() => {
    if (!llmSettings) return [];
    return LLM_FIELD_DEFINITIONS
      .map(({ key, label }) => {
        const value = llmSettings[key];
        return value !== undefined && value !== null && value !== ""
          ? { label, value }
          : null;
      })
      .filter((entry): entry is { label: string; value: string } => Boolean(entry));
  }, [llmSettings]);
  const hasCustomLLMSettings = llmItems.length > 0;
  const statusColor = useMemo(() => {
    if (!job) return "#1f2937";
    switch (job.status) {
      case "succeeded":
        return "#059669";
      case "failed":
        return "#dc2626";
      case "running":
        return "#f97316";
      default:
        return "#0369a1";
    }
  }, [job]);

  if (jobQuery.isLoading) {
    return <div className="card">Loading job…</div>;
  }

  if (jobQuery.error || !job) {
    return (
      <div className="card">
        <p>Unable to load job details.</p>
        <Link to="/" className="button-secondary">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <section style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: "0 0 0.5rem 0" }}>Job {job.job_id}</h1>
            <p style={{ margin: 0, color: "#475569" }}>{job.config_path}</p>
          </div>
          <JobStatusBadge status={job.status} />
        </div>

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: "1rem",
            marginTop: "1.5rem",
            color: "#475569"
          }}
        >
          <div>
            <dt style={{ fontWeight: 600 }}>Output directory</dt>
            <dd>{job.output_dir}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Config path</dt>
            <dd>{job.config_path}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Started</dt>
            <dd>{job.started_at ? new Date(job.started_at).toLocaleString() : "—"}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Completed</dt>
            <dd>
              {job.completed_at ? new Date(job.completed_at).toLocaleString() : "—"}
            </dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Log file</dt>
            <dd>{job.log_file ?? "Pending"}</dd>
          </div>
          {job.run_path && (
            <div>
              <dt style={{ fontWeight: 600 }}>Run path</dt>
              <dd>{job.run_path}</dd>
            </div>
          )}
        </dl>

        {job.error && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#dc2626"
            }}
          >
            {job.error}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>LLM Settings</h2>
        {hasCustomLLMSettings ? (
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: "1rem",
              marginTop: "1rem",
              color: "#475569"
            }}
          >
            {llmItems.map((item) => (
              <div key={item.label}>
                <dt style={{ fontWeight: 600 }}>{item.label}</dt>
                <dd style={{ wordBreak: "break-all" }}>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p style={{ color: "#475569" }}>Using server default endpoints and models.</p>
        )}
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h2 style={{ margin: 0 }}>Logs</h2>
          <span style={{ fontSize: "0.85rem", color: statusColor }}>
            {job.status === "running"
              ? "Updating every 5s"
              : "Final log snapshot"}
          </span>
        </div>
        <pre
          style={{
            marginTop: "1rem",
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "1rem",
            borderRadius: "8px",
            maxHeight: "320px",
            overflow: "auto",
            fontSize: "0.85rem"
          }}
        >
          {logsQuery.data?.content ?? "No logs yet."}
        </pre>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Artifacts</h2>
        {artifactsQuery.isLoading ? (
          <p>Discovering artifacts…</p>
        ) : (artifactsQuery.data?.artifacts.length ?? 0) === 0 ? (
          <p>No artifacts available yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {artifactsQuery.data?.artifacts.map((artifact) => (
              <li
                key={artifact.path}
                style={{
                  padding: "0.75rem",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  marginBottom: "0.75rem",
                  background: "#f8fafc"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{artifact.path}</strong>
                    <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                      {new Date(artifact.modified_at).toLocaleString()} —{" "}
                      {(artifact.size_bytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <a
                    className="button-secondary"
                    href={`${apiBase}/jobs/${job.job_id}/artifacts/download?path=${encodeURIComponent(
                      artifact.path
                    )}`}
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link to="/" className="button-secondary" style={{ width: "max-content" }}>
        ← Back to dashboard
      </Link>
    </section>
  );
};

export default JobDetail;
