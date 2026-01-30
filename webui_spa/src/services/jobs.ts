import apiClient from "../utils/apiClient";
import {
  JobArtifactsResponse,
  JobCreatePayload,
  JobDetail,
  JobList,
  JobLogResponse
} from "../types/jobs";

export const listJobs = async (): Promise<JobList> => {
  const response = await apiClient.get<JobList>("/jobs");
  return response.data;
};

export const createJob = async (payload: JobCreatePayload): Promise<JobDetail> => {
  const response = await apiClient.post<JobDetail>("/jobs", payload);
  return response.data;
};

export const getJob = async (jobId: string): Promise<JobDetail> => {
  const response = await apiClient.get<JobDetail>(`/jobs/${jobId}`);
  return response.data;
};

export const getJobLogs = async (jobId: string): Promise<JobLogResponse> => {
  const response = await apiClient.get<JobLogResponse>(`/jobs/${jobId}/logs`);
  return response.data;
};

export const getJobArtifacts = async (
  jobId: string
): Promise<JobArtifactsResponse> => {
  const response = await apiClient.get<JobArtifactsResponse>(
    `/jobs/${jobId}/artifacts`
  );
  return response.data;
};
