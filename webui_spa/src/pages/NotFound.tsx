import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="card" style={{ textAlign: "center" }}>
    <h1>404</h1>
    <p>We could not find the page you were looking for.</p>
    <Link to="/" className="button-secondary">
      Back to dashboard
    </Link>
  </div>
);

export default NotFound;
