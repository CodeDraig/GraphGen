import apiClient from "../utils/apiClient";
import {
  ConfigDetailResponse,
  ConfigListResponse,
  InputSampleList
} from "../types/configs";

export const listConfigs = async (): Promise<ConfigListResponse> => {
  const response = await apiClient.get<ConfigListResponse>("/configs");
  return response.data;
};

export const getConfig = async (
  configId: string
): Promise<ConfigDetailResponse> => {
  const response = await apiClient.get<ConfigDetailResponse>(`/configs/${configId}`);
  return response.data;
};

export const listInputSamples = async (): Promise<InputSampleList> => {
  const response = await apiClient.get<InputSampleList>("/resources/inputs");
  return response.data;
};
