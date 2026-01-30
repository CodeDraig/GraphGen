import { PropsWithChildren } from "react";
import { Link, useLocation } from "react-router-dom";

const Layout = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const isJobsView = location.pathname.startsWith("/jobs");

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/">
          <strong>GraphGen Studio</strong>
        </Link>

        <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link to="/" className={isJobsView ? "" : "active"}>
            Dashboard
          </Link>
          <Link to="/jobs/new">New Job</Link>
          <a
            href="https://github.com/open-sciencelab/GraphGen"
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
        </nav>
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
};

export default Layout;
