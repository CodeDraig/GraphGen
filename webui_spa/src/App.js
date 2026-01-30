import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import JobDetail from "./pages/JobDetail";
import NewJob from "./pages/NewJob";
import NotFound from "./pages/NotFound";
const App = () => (_jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/jobs/new", element: _jsx(NewJob, {}) }), _jsx(Route, { path: "/jobs/:jobId", element: _jsx(JobDetail, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }));
export default App;
