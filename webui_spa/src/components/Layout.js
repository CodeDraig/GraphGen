import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from "react-router-dom";
const Layout = ({ children }) => {
    const location = useLocation();
    const isJobsView = location.pathname.startsWith("/jobs");
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "app-header", children: [_jsx(Link, { to: "/", children: _jsx("strong", { children: "GraphGen Studio" }) }), _jsxs("nav", { style: { display: "flex", gap: "1rem", alignItems: "center" }, children: [_jsx(Link, { to: "/", className: isJobsView ? "" : "active", children: "Dashboard" }), _jsx(Link, { to: "/jobs/new", children: "New Job" }), _jsx("a", { href: "https://github.com/open-sciencelab/GraphGen", target: "_blank", rel: "noreferrer", children: "Docs" })] })] }), _jsx("main", { className: "app-content", children: children })] }));
};
export default Layout;
