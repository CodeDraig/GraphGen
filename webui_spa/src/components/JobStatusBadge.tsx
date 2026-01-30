import { JobStatus } from "../types/jobs";

type Props = {
  status: JobStatus;
};

const JobStatusBadge = ({ status }: Props) => {
  return <span className={`status-badge ${status}`}>{status}</span>;
};

export default JobStatusBadge;
