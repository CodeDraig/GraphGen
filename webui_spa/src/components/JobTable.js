import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        return _jsx("div", { className: "card", children: "Loading job history\u2026" });
    }
    if (error) {
        return (_jsxs("div", { className: "card", children: [_jsxs("p", { children: ["Unable to load jobs: ", error.message] }), _jsx("button", { className: "button-secondary", onClick: () => refetch(), children: "Retry" })] }));
    }
    const jobs = data?.jobs ?? [];
    return (_jsxs("div", { className: "card", children: [_jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem"
                }, children: [_jsx("h2", { style: { margin: 0 }, children: "Recent Jobs" }), _jsx("button", { className: "button-secondary", onClick: () => refetch(), children: "Refresh" })] }), jobs.length === 0 ? (_jsx("p", { children: "No jobs submitted yet." })) : (_jsxs("table", { style: {
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.95rem"
                }, children: [_jsx("thead", { children: _jsxs("tr", { style: {
                                textAlign: "left",
                                borderBottom: "1px solid #e5e7eb",
                                color: "#64748b"
                            }, children: [_jsx("th", { style: { padding: "0.75rem 0" }, children: "Job" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Started" }), _jsx("th", { children: "Completed" }), _jsx("th", {})] }) }), _jsx("tbody", { children: jobs.map((job) => (_jsxs("tr", { style: { borderBottom: "1px solid #f1f5f9", color: "#1f2937" }, children: [_jsx("td", { style: { padding: "0.75rem 0" }, children: _jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [_jsx("strong", { children: job.job_id }), _jsx("span", { style: { fontSize: "0.85rem", color: "#64748b" }, children: job.config_path })] }) }), _jsx("td", { children: _jsx(JobStatusBadge, { status: job.status }) }), _jsx("td", { children: job.started_at ? new Date(job.started_at).toLocaleString() : "—" }), _jsx("td", { children: job.completed_at ? new Date(job.completed_at).toLocaleString() : "—" }), _jsx("td", { children: _jsx(Link, { to: `/jobs/${job.job_id}`, className: "button-secondary", children: "Details" }) })] }, job.job_id))) })] }))] }));
};
export default JobTable;
