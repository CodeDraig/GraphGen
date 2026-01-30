import apiClient from "../utils/apiClient";
export const listJobs = async () => {
    const response = await apiClient.get("/jobs");
    return response.data;
};
export const createJob = async (payload) => {
    const response = await apiClient.post("/jobs", payload);
    return response.data;
};
export const getJob = async (jobId) => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
};
export const getJobLogs = async (jobId) => {
    const response = await apiClient.get(`/jobs/${jobId}/logs`);
    return response.data;
};
export const getJobArtifacts = async (jobId) => {
    const response = await apiClient.get(`/jobs/${jobId}/artifacts`);
    return response.data;
};
