import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import JobDetail from "./pages/JobDetail";
import NewJob from "./pages/NewJob";
import NotFound from "./pages/NotFound";

const App = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/jobs/new" element={<NewJob />} />
      <Route path="/jobs/:jobId" element={<JobDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Layout>
);

export default App;
