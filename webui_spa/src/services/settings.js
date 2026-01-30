import apiClient from "../utils/apiClient";
export const getLLMDefaults = async () => {
    const response = await apiClient.get("/settings/llm");
    return response.data;
};
