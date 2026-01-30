import { jsx as _jsx } from "react/jsx-runtime";
const JobStatusBadge = ({ status }) => {
    return _jsx("span", { className: `status-badge ${status}`, children: status });
};
export default JobStatusBadge;
