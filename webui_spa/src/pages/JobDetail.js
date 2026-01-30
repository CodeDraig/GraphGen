import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import JobStatusBadge from "../components/JobStatusBadge";
import { getJob, getJobArtifacts, getJobLogs } from "../services/jobs";
const LLM_FIELD_DEFINITIONS = [
    { key: "synthesizer_model", label: "Synthesizer Model" },
    { key: "synthesizer_base_url", label: "Synthesizer Endpoint" },
    { key: "synthesizer_api_key", label: "Synthesizer API Key" },
    { key: "trainee_model", label: "Trainee Model" },
    { key: "trainee_base_url", label: "Trainee Endpoint" },
    { key: "trainee_api_key", label: "Trainee API Key" },
    { key: "tokenizer_model", label: "Tokenizer Model" }
];
const useJobDetail = (jobId) => {
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
    const apiBase = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/$/, "");
    const job = jobQuery.data;
    const llmSettings = job?.llm_settings ?? null;
    const llmItems = useMemo(() => {
        if (!llmSettings)
            return [];
        return LLM_FIELD_DEFINITIONS
            .map(({ key, label }) => {
            const value = llmSettings[key];
            return value !== undefined && value !== null && value !== ""
                ? { label, value }
                : null;
        })
            .filter((entry) => Boolean(entry));
    }, [llmSettings]);
    const hasCustomLLMSettings = llmItems.length > 0;
    const statusColor = useMemo(() => {
        if (!job)
            return "#1f2937";
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
        return _jsx("div", { className: "card", children: "Loading job\u2026" });
    }
    if (jobQuery.error || !job) {
        return (_jsxs("div", { className: "card", children: [_jsx("p", { children: "Unable to load job details." }), _jsx(Link, { to: "/", className: "button-secondary", children: "Back to dashboard" })] }));
    }
    return (_jsxs("section", { style: { display: "grid", gap: "1.5rem" }, children: [_jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsxs("div", { children: [_jsxs("h1", { style: { margin: "0 0 0.5rem 0" }, children: ["Job ", job.job_id] }), _jsx("p", { style: { margin: 0, color: "#475569" }, children: job.config_path })] }), _jsx(JobStatusBadge, { status: job.status })] }), _jsxs("dl", { style: {
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                            gap: "1rem",
                            marginTop: "1.5rem",
                            color: "#475569"
                        }, children: [_jsxs("div", { children: [_jsx("dt", { style: { fontWeight: 600 }, children: "Output directory" }), _jsx("dd", { children: job.output_dir })] }), _jsxs("div", { children: [_jsx("dt", { style: { fontWeight: 600 }, children: "Config path" }), _jsx("dd", { children: job.config_path })] }), _jsxs("div", { children: [_jsx("dt", { style: { fontWeight: 600 }, children: "Started" }), _jsx("dd", { children: job.started_at ? new Date(job.started_at).toLocaleString() : "—" })] }), _jsxs("div", { children: [_jsx("dt", { style: { fontWeight: 600 }, children: "Completed" }), _jsx("dd", { children: job.completed_at ? new Date(job.completed_at).toLocaleString() : "—" })] }), _jsxs("div", { children: [_jsx("dt", { style: { fontWeight: 600 }, children: "Log file" }), _jsx("dd", { children: job.log_file ?? "Pending" })] }), job.run_path && (_jsxs("div", { children: [_jsx("dt", { style: { fontWeight: 600 }, children: "Run path" }), _jsx("dd", { children: job.run_path })] }))] }), job.error && (_jsx("div", { style: {
                            marginTop: "1.5rem",
                            padding: "1rem",
                            borderRadius: "8px",
                            background: "#fef2f2",
                            color: "#dc2626"
                        }, children: job.error }))] }), _jsxs("div", { className: "card", children: [_jsx("h2", { style: { marginTop: 0 }, children: "LLM Settings" }), hasCustomLLMSettings ? (_jsx("dl", { style: {
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                            gap: "1rem",
                            marginTop: "1rem",
                            color: "#475569"
                        }, children: llmItems.map((item) => (_jsxs("div", { children: [_jsx("dt", { style: { fontWeight: 600 }, children: item.label }), _jsx("dd", { style: { wordBreak: "break-all" }, children: item.value })] }, item.label))) })) : (_jsx("p", { style: { color: "#475569" }, children: "Using server default endpoints and models." }))] }), _jsxs("div", { className: "card", children: [_jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }, children: [_jsx("h2", { style: { margin: 0 }, children: "Logs" }), _jsx("span", { style: { fontSize: "0.85rem", color: statusColor }, children: job.status === "running"
                                    ? "Updating every 5s"
                                    : "Final log snapshot" })] }), _jsx("pre", { style: {
                            marginTop: "1rem",
                            background: "#0f172a",
                            color: "#e2e8f0",
                            padding: "1rem",
                            borderRadius: "8px",
                            maxHeight: "320px",
                            overflow: "auto",
                            fontSize: "0.85rem"
                        }, children: logsQuery.data?.content ?? "No logs yet." })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { style: { marginTop: 0 }, children: "Artifacts" }), artifactsQuery.isLoading ? (_jsx("p", { children: "Discovering artifacts\u2026" })) : (artifactsQuery.data?.artifacts.length ?? 0) === 0 ? (_jsx("p", { children: "No artifacts available yet." })) : (_jsx("ul", { style: { listStyle: "none", padding: 0, margin: 0 }, children: artifactsQuery.data?.artifacts.map((artifact) => (_jsx("li", { style: {
                                padding: "0.75rem",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                marginBottom: "0.75rem",
                                background: "#f8fafc"
                            }, children: _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsxs("div", { children: [_jsx("strong", { children: artifact.path }), _jsxs("div", { style: { color: "#64748b", fontSize: "0.85rem" }, children: [new Date(artifact.modified_at).toLocaleString(), " \u2014", " ", (artifact.size_bytes / 1024).toFixed(1), " KB"] })] }), _jsx("a", { className: "button-secondary", href: `${apiBase}/jobs/${job.job_id}/artifacts/download?path=${encodeURIComponent(artifact.path)}`, children: "Download" })] }) }, artifact.path))) }))] }), _jsx(Link, { to: "/", className: "button-secondary", style: { width: "max-content" }, children: "\u2190 Back to dashboard" })] }));
};
export default JobDetail;
