export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export type LLMSettings = {
  synthesizer_model?: string | null;
  synthesizer_base_url?: string | null;
  synthesizer_api_key?: string | null;
  trainee_model?: string | null;
  trainee_base_url?: string | null;
  trainee_api_key?: string | null;
  tokenizer_model?: string | null;
};

export type LLMSettingsResponse = {
  defaults: LLMSettings;
};

export type JobDetail = {
  job_id: string;
  status: JobStatus;
  config_path: string;
  output_dir: string;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  log_file?: string | null;
  run_path?: string | null;
  error?: string | null;
  llm_settings?: LLMSettings | null;
};

export type JobList = {
  jobs: JobDetail[];
};

export type JobLogResponse = {
  job_id: string;
  log_file?: string | null;
  content: string;
};

export type ArtifactDescriptor = {
  path: string;
  size_bytes: number;
  modified_at: string;
};

export type JobArtifactsResponse = {
  job_id: string;
  artifacts: ArtifactDescriptor[];
};

export type JobCreatePayload = {
  config_path: string;
  output_dir?: string | null;
  overrides: Record<string, unknown>;
  llm_settings?: LLMSettings | null;
};
