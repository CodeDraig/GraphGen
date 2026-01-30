import apiClient from "../utils/apiClient";
export const listConfigs = async () => {
    const response = await apiClient.get("/configs");
    return response.data;
};
export const getConfig = async (configId) => {
    const response = await apiClient.get(`/configs/${configId}`);
    return response.data;
};
export const listInputSamples = async () => {
    const response = await apiClient.get("/resources/inputs");
    return response.data;
};
