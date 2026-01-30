import { Link } from "react-router-dom";

import JobTable from "../components/JobTable";

const Dashboard = () => {
  return (
    <section style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 0.5rem 0" }}>Welcome to GraphGen Studio</h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Launch synthetic data generation runs, monitor progress, and download
              artifacts—all in one place.
            </p>
          </div>
          <Link to="/jobs/new" className="button-primary">
            New Job
          </Link>
        </div>
      </div>

      <JobTable />
    </section>
  );
};

export default Dashboard;
