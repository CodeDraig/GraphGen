import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import JobTable from "../components/JobTable";
const Dashboard = () => {
    return (_jsxs("section", { style: { display: "grid", gap: "1.5rem" }, children: [_jsx("div", { className: "card", children: _jsxs("div", { style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }, children: [_jsxs("div", { children: [_jsx("h1", { style: { margin: "0 0 0.5rem 0" }, children: "Welcome to GraphGen Studio" }), _jsx("p", { style: { margin: 0, color: "#64748b" }, children: "Launch synthetic data generation runs, monitor progress, and download artifacts\u2014all in one place." })] }), _jsx(Link, { to: "/jobs/new", className: "button-primary", children: "New Job" })] }) }), _jsx(JobTable, {})] }));
};
export default Dashboard;
