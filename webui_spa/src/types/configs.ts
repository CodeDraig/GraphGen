export type ConfigDescriptor = {
  id: string;
  name: string;
  path: string;
  mode?: string | null;
  description?: string | null;
};

export type ConfigListResponse = {
  configs: ConfigDescriptor[];
  default?: string | null;
};

export type ConfigDetailResponse = {
  id: string;
  name: string;
  path: string;
  mode?: string | null;
  config: Record<string, unknown>;
};

export type InputSample = {
  name: string;
  path: string;
  size_bytes?: number | null;
};

export type InputSampleList = {
  inputs: InputSample[];
};
