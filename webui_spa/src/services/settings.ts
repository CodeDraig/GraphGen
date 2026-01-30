import apiClient from "../utils/apiClient";
import { LLMSettingsResponse } from "../types/jobs";

export const getLLMDefaults = async (): Promise<LLMSettingsResponse> => {
  const response = await apiClient.get<LLMSettingsResponse>("/settings/llm");
  return response.data;
};
