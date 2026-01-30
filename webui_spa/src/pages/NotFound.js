import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
const NotFound = () => (_jsxs("div", { className: "card", style: { textAlign: "center" }, children: [_jsx("h1", { children: "404" }), _jsx("p", { children: "We could not find the page you were looking for." }), _jsx(Link, { to: "/", className: "button-secondary", children: "Back to dashboard" })] }));
export default NotFound;
