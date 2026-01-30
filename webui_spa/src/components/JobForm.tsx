import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { createJob } from "../services/jobs";
import { getConfig, listConfigs, listInputSamples } from "../services/configs";
import { getLLMDefaults } from "../services/settings";
import type { ConfigDetailResponse, ConfigDescriptor } from "../types/configs";
import type { JobCreatePayload, LLMSettings } from "../types/jobs";

const SEARCH_TYPES = ["google", "bing", "uniprot", "wikipedia"];
const PARTITION_METHODS = ["dfs", "bfs", "ece", "leiden"];
const GENERATE_MODES = ["atomic", "aggregated", "multi_hop", "cot", "vqa"];
const DATA_FORMATS = ["Alpaca", "Sharegpt", "ChatML"];

const JobForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const configsQuery = useQuery({
    queryKey: ["configs"],
    queryFn: listConfigs
  });

  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>(
    undefined
  );
  const [outputDir, setOutputDir] = useState<string>("");
  const [configState, setConfigState] = useState<Record<string, unknown>>({});
  const [advancedDraft, setAdvancedDraft] = useState<string>("{}");
  const [useAdvancedEditor, setUseAdvancedEditor] = useState<boolean>(false);
  const [useCustomLLM, setUseCustomLLM] = useState<boolean>(false);
  const [llmSettings, setLLMSettings] = useState<LLMSettings>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configsQuery.data) return;
    if (selectedConfigId) return;
    const fallback =
      configsQuery.data.default ??
      (configsQuery.data.configs.length > 0
        ? configsQuery.data.configs[0].id
        : undefined);
    setSelectedConfigId(fallback);
  }, [configsQuery.data, selectedConfigId]);

  const configDetailQuery = useQuery({
    queryKey: ["config", selectedConfigId],
    queryFn: () => getConfig(selectedConfigId ?? ""),
    enabled: Boolean(selectedConfigId)
  });

  useEffect(() => {
    if (!configDetailQuery.data) return;
    const next = deepClone(configDetailQuery.data.config ?? {});
    setConfigState(next);
    setAdvancedDraft(JSON.stringify(next, null, 2));
  }, [configDetailQuery.data?.id]);

  useEffect(() => {
    if (useAdvancedEditor) return;
    setAdvancedDraft(JSON.stringify(configState, null, 2));
  }, [configState, useAdvancedEditor]);

  const inputSamplesQuery = useQuery({
    queryKey: ["input-samples"],
    queryFn: listInputSamples
  });

  const llmDefaultsQuery = useQuery({
    queryKey: ["llm-settings"],
    queryFn: getLLMDefaults
  });

  const currentConfig: ConfigDetailResponse | undefined = configDetailQuery.data;
  const currentPreset: ConfigDescriptor | undefined = useMemo(() => {
    if (!configsQuery.data || !selectedConfigId) return undefined;
    return configsQuery.data.configs.find((c) => c.id === selectedConfigId);
  }, [configsQuery.data, selectedConfigId]);

  useEffect(() => {
    if (!llmDefaultsQuery.data) return;
    if (Object.keys(llmSettings).length > 0) return;
    setLLMSettings({ ...llmDefaultsQuery.data.defaults });
  }, [llmDefaultsQuery.data, llmSettings]);

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      navigate(`/jobs/${job.job_id}`);
    },
    onError: (err: unknown) => {
      setError((err as Error).message);
    }
  });

  const submit = () => {
    if (!currentConfig) {
      setError("Select a configuration before launching a job.");
      return;
    }
    setError(null);

    try {
      const overrides = useAdvancedEditor
        ? JSON.parse(advancedDraft || "{}")
        : configState;

      const llmPayload = useCustomLLM
        ? sanitizeLLMSettings(llmSettings)
        : undefined;

      const payload: JobCreatePayload = {
        config_path: currentConfig.path,
        output_dir: outputDir || undefined,
        overrides,
        llm_settings: llmPayload
      };

      mutation.mutate(payload);
    } catch (err) {
      setError(`Configuration must be valid JSON: ${(err as Error).message}`);
    }
  };

  const updateConfigValue = (path: string[], value: unknown) => {
    setConfigState((prev) => {
      const next = deepClone(prev);
      let cursor: Record<string, unknown> = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        const key = path[i];
        const existing = cursor[key];
        if (typeof existing !== "object" || existing === null) {
          cursor[key] = {};
        }
        cursor = cursor[key] as Record<string, unknown>;
      }
      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const partitionMethod = useMemo(() => {
    const partition = configState.partition as Record<string, unknown> | undefined;
    return typeof partition?.method === "string" ? partition.method : "";
  }, [configState]);

  const methodParams = useMemo(() => {
    const partition = configState.partition as Record<string, unknown> | undefined;
    if (!partition) return {};
    const params = partition.method_params as Record<string, unknown> | undefined;
    return params ?? {};
  }, [configState]);

  const baseMethodParams = useMemo(() => {
    const partition = currentConfig?.config?.partition as
      | Record<string, unknown>
      | undefined;
    if (!partition) return {};
    const params = partition.method_params as Record<string, unknown> | undefined;
    return params ?? {};
  }, [currentConfig]);

  const allMethodParamKeys = useMemo(() => {
    return Array.from(
      new Set([
        ...Object.keys(baseMethodParams),
        ...Object.keys(methodParams as Record<string, unknown>)
      ])
    );
  }, [baseMethodParams, methodParams]);

  const selectedSearchTypes = useMemo(() => {
    const searchConfig = configState.search as Record<string, unknown> | undefined;
    if (!searchConfig) return [];
    const types = searchConfig.search_types;
    return Array.isArray(types)
      ? (types.filter((t) => typeof t === "string") as string[])
      : [];
  }, [configState]);

  const isSearchEnabled = useMemo(() => {
    const searchConfig = configState.search as Record<string, unknown> | undefined;
    return Boolean(searchConfig?.enabled);
  }, [configState]);

  const quizConfig = configState.quiz_and_judge as
    | Record<string, unknown>
    | undefined;

  const currentInputFile =
    ((configState.read as Record<string, unknown> | undefined)?.input_file as
      | string
      | undefined) ?? "";

  const selectedSampleValue =
    inputSamplesQuery.data?.inputs.some((sample) => sample.path === currentInputFile)
      ? currentInputFile
      : "";

  if (configsQuery.isLoading && !configsQuery.data) {
    return <div className="card">Loading presets…</div>;
  }

  if (configsQuery.isError) {
    return (
      <div className="card">
        <p>Unable to load configuration presets.</p>
      </div>
    );
  }

  if (selectedConfigId && configDetailQuery.isLoading && !currentConfig) {
    return <div className="card">Loading configuration…</div>;
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h2>Launch GraphGen Job</h2>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
            Choose a preset, adjust the pipeline, and start a generation run.
          </p>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => setUseAdvancedEditor((prev) => !prev)}
        >
          {useAdvancedEditor ? "Use Guided Form" : "Edit Raw JSON"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gap: "1.25rem",
          marginTop: "1.5rem"
        }}
      >
        <section>
          <label style={{ display: "block", marginBottom: "1rem" }}>
            <span style={{ display: "block", fontWeight: 600 }}>Preset</span>
            <select
              value={selectedConfigId ?? ""}
              onChange={(event) => setSelectedConfigId(event.target.value)}
              style={{
                marginTop: "0.4rem",
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "white"
              }}
            >
              {!selectedConfigId && <option value="">Select a configuration</option>}
              {configsQuery.data?.configs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                  {config.mode ? ` (${config.mode})` : ""}
                </option>
              ))}
            </select>
          </label>

          {currentPreset && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#475569"
              }}
            >
              <strong>{currentPreset.name}</strong>
              <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                {currentPreset.description ??
                  "Preset configuration bundled with GraphGen."}
              </div>
              <div style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                Path: <code>{currentPreset.path}</code>
              </div>
            </div>
          )}
        </section>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          <span style={{ display: "block", fontWeight: 600 }}>
            Output directory (optional)
          </span>
          <input
            value={outputDir}
            onChange={(event) => setOutputDir(event.target.value)}
            placeholder="cache/runs"
            style={{
              marginTop: "0.4rem",
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #d1d5db"
            }}
          />
        </label>

        {useAdvancedEditor ? (
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontWeight: 600 }}>
              Configuration JSON
            </span>
            <textarea
              value={advancedDraft}
              onChange={(event) => setAdvancedDraft(event.target.value)}
              rows={16}
              style={{
                marginTop: "0.75rem",
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontFamily: "monospace"
              }}
            />
          </label>
        ) : (
          <>
            <fieldset className="form-section">
              <legend>Read</legend>
              <div className="form-grid">
                <label>
                  <span>Input file</span>
                  <input
                    value={currentInputFile}
                    onChange={(event) =>
                      updateConfigValue(["read", "input_file"], event.target.value)
                    }
                    placeholder="resources/input_examples/json_demo.json"
                  />
                </label>
                {inputSamplesQuery.data && inputSamplesQuery.data.inputs.length > 0 && (
                  <label>
                    <span>Pick from examples</span>
                    <select
                      value={selectedSampleValue}
                      onChange={(event) =>
                        updateConfigValue(["read", "input_file"], event.target.value)
                      }
                    >
                      <option value="">
                        Select sample…
                      </option>
                      {inputSamplesQuery.data.inputs.map((sample) => (
                        <option key={sample.path} value={sample.path}>
                          {sample.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Split</legend>
              <div className="form-grid">
                <label>
                  <span>Chunk size</span>
                  <input
                    type="number"
                    min={1}
                    value={
                      ((configState.split as Record<string, unknown> | undefined)
                        ?.chunk_size as number | undefined) ?? ""
                    }
                    onChange={(event) =>
                      updateConfigValue(
                        ["split", "chunk_size"],
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value)
                      )
                    }
                  />
                </label>
                <label>
                  <span>Chunk overlap</span>
                  <input
                    type="number"
                    min={0}
                    value={
                      ((configState.split as Record<string, unknown> | undefined)
                        ?.chunk_overlap as number | undefined) ?? ""
                    }
                    onChange={(event) =>
                      updateConfigValue(
                        ["split", "chunk_overlap"],
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value)
                      )
                    }
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Search</legend>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={isSearchEnabled}
                  onChange={(event) =>
                    updateConfigValue(["search", "enabled"], event.target.checked)
                  }
                />
                <span>Enable external search</span>
              </label>

              {isSearchEnabled && (
                <div className="chips">
                  {SEARCH_TYPES.map((searchType) => {
                    const isChecked = selectedSearchTypes.includes(searchType);
                    return (
                      <label key={searchType} className="chip">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...selectedSearchTypes, searchType]
                              : selectedSearchTypes.filter((stype) => stype !== searchType);
                            updateConfigValue(["search", "search_types"], next);
                          }}
                        />
                        <span>{searchType}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <fieldset className="form-section">
              <legend>Quiz &amp; Judge</legend>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(quizConfig?.enabled)}
                  onChange={(event) =>
                    updateConfigValue(
                      ["quiz_and_judge", "enabled"],
                      event.target.checked
                    )
                  }
                />
                <span>Enable quiz generation</span>
              </label>

              <div className="form-grid">
                <label>
                  <span>Quiz samples</span>
                  <input
                    type="number"
                    min={0}
                    disabled={!quizConfig?.enabled}
                    value={(quizConfig?.quiz_samples as number | undefined) ?? ""}
                    onChange={(event) =>
                      updateConfigValue(
                        ["quiz_and_judge", "quiz_samples"],
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value)
                      )
                    }
                  />
                </label>
                <label className="checkbox-row" style={{ alignSelf: "flex-end" }}>
                  <input
                    type="checkbox"
                    disabled={!quizConfig?.enabled}
                    checked={Boolean(quizConfig?.re_judge)}
                    onChange={(event) =>
                      updateConfigValue(
                        ["quiz_and_judge", "re_judge"],
                        event.target.checked
                      )
                    }
                  />
                  <span>Re-judge existing samples</span>
                </label>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>LLM Settings</legend>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={useCustomLLM}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setUseCustomLLM(next);
                    if (next && llmDefaultsQuery.data) {
                      setLLMSettings({ ...llmDefaultsQuery.data.defaults });
                    }
                  }}
                />
                <span>Override server defaults</span>
              </label>

              {useCustomLLM && (
                <div className="form-grid">
                  {llmDefaultsQuery.isLoading && (
                    <p style={{ gridColumn: "1 / -1", color: "#64748b" }}>
                      Loading defaults…
                    </p>
                  )}
                  {llmDefaultsQuery.isError && (
                    <p style={{ gridColumn: "1 / -1", color: "#dc2626" }}>
                      Unable to load server defaults; provide values manually.
                    </p>
                  )}
                  <label>
                    <span>Synthesizer model</span>
                    <input
                      value={llmSettings.synthesizer_model ?? ""}
                      onChange={(event) =>
                        setLLMSettings((prev) => ({
                          ...prev,
                          synthesizer_model: event.target.value
                        }))
                      }
                      placeholder="gpt-4o-mini"
                    />
                  </label>
                  <label>
                    <span>Synthesizer API endpoint</span>
                    <input
                      value={llmSettings.synthesizer_base_url ?? ""}
                      onChange={(event) =>
                        setLLMSettings((prev) => ({
                          ...prev,
                          synthesizer_base_url: event.target.value
                        }))
                      }
                      placeholder="https://api.openai.com/v1"
                    />
                  </label>
                  <label>
                    <span>Trainee model</span>
                    <input
                      value={llmSettings.trainee_model ?? ""}
                      onChange={(event) =>
                        setLLMSettings((prev) => ({
                          ...prev,
                          trainee_model: event.target.value
                        }))
                      }
                      placeholder="gpt-4o-mini"
                    />
                  </label>
                  <label>
                    <span>Trainee API endpoint</span>
                    <input
                      value={llmSettings.trainee_base_url ?? ""}
                      onChange={(event) =>
                        setLLMSettings((prev) => ({
                          ...prev,
                          trainee_base_url: event.target.value
                        }))
                      }
                      placeholder="https://api.openai.com/v1"
                    />
                  </label>
                  <label>
                    <span>Tokenizer model</span>
                    <input
                      value={llmSettings.tokenizer_model ?? ""}
                      onChange={(event) =>
                        setLLMSettings((prev) => ({
                          ...prev,
                          tokenizer_model: event.target.value
                        }))
                      }
                      placeholder="cl100k_base"
                    />
                  </label>
                  <label>
                    <span>Synthesizer API key</span>
                    <input
                      value={llmSettings.synthesizer_api_key ?? ""}
                      onChange={(event) =>
                        setLLMSettings((prev) => ({
                          ...prev,
                          synthesizer_api_key: event.target.value
                        }))
                      }
                      placeholder="sk-..."
                    />
                  </label>
                  <label>
                    <span>Trainee API key</span>
                    <input
                      value={llmSettings.trainee_api_key ?? ""}
                      onChange={(event) =>
                        setLLMSettings((prev) => ({
                          ...prev,
                          trainee_api_key: event.target.value
                        }))
                      }
                      placeholder="sk-..."
                    />
                  </label>
                </div>
              )}
            </fieldset>

            <fieldset className="form-section">
              <legend>Partition</legend>
              <div className="form-grid">
                <label>
                  <span>Method</span>
                  <select
                    value={partitionMethod}
                    onChange={(event) =>
                      updateConfigValue(["partition", "method"], event.target.value)
                    }
                  >
                    <option value="">Select method</option>
                    {PARTITION_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {allMethodParamKeys.length > 0 && (
                <div className="form-grid">
                  {allMethodParamKeys.map((key) => {
                    const original = baseMethodParams[key];
                    const current = methodParams[key];
                    const value =
                      typeof current !== "undefined"
                        ? current
                        : typeof original !== "undefined"
                        ? original
                        : "";
                    const typeOfOriginal = typeof original;

                    if (typeOfOriginal === "boolean") {
                      return (
                        <label key={key} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(event) =>
                              updateConfigValue(
                                ["partition", "method_params", key],
                                event.target.checked
                              )
                            }
                          />
                          <span>{key}</span>
                        </label>
                      );
                    }

                    const inputType = typeOfOriginal === "number" ? "number" : "text";
                    return (
                      <label key={key}>
                        <span>{key}</span>
                        <input
                          type={inputType}
                          value={
                            typeof value === "number" || typeof value === "string"
                              ? value
                              : ""
                          }
                          onChange={(event) => {
                            const rawValue = event.target.value;
                            let nextValue: unknown = rawValue;
                            if (inputType === "number") {
                              nextValue =
                                rawValue === "" ? undefined : Number(event.target.value);
                            }
                            updateConfigValue(
                              ["partition", "method_params", key],
                              nextValue
                            );
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <fieldset className="form-section">
              <legend>Generation</legend>
              <div className="form-grid">
                <label>
                  <span>Mode</span>
                  <select
                    value={
                      ((configState.generate as Record<string, unknown> | undefined)
                        ?.mode as string | undefined) ?? ""
                    }
                    onChange={(event) =>
                      updateConfigValue(["generate", "mode"], event.target.value)
                    }
                  >
                    <option value="">Select mode</option>
                    {GENERATE_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Data format</span>
                  <select
                    value={
                      ((configState.generate as Record<string, unknown> | undefined)
                        ?.data_format as string | undefined) ?? ""
                    }
                    onChange={(event) =>
                      updateConfigValue(["generate", "data_format"], event.target.value)
                    }
                  >
                    <option value="">Select format</option>
                    {DATA_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#dc2626",
            marginBottom: "1rem"
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "1.5rem"
        }}
      >
        {currentConfig && !useAdvancedEditor && (
          <details>
            <summary>Preview JSON overrides</summary>
            <pre
              style={{
                marginTop: "0.75rem",
                background: "#0f172a",
                color: "#e2e8f0",
                padding: "0.75rem",
                borderRadius: "8px",
                maxHeight: "240px",
                overflow: "auto",
                fontSize: "0.85rem"
              }}
            >
              {JSON.stringify(configState, null, 2)}
            </pre>
          </details>
        )}

        <button
          className="button-primary"
          type="button"
          onClick={submit}
          disabled={mutation.isPending}
          style={{ marginLeft: "auto" }}
        >
          {mutation.isPending ? "Submitting…" : "Launch Job"}
        </button>
      </div>

      <button
        className="button-secondary"
        type="button"
        onClick={() => {
          if (!currentConfig) return;
          const next = deepClone(currentConfig.config ?? {});
          setConfigState(next);
          setAdvancedDraft(JSON.stringify(next, null, 2));
          setError(null);
          setUseCustomLLM(false);
          if (llmDefaultsQuery.data) {
            setLLMSettings({ ...llmDefaultsQuery.data.defaults });
          }
        }}
        style={{ marginTop: "0.75rem" }}
      >
        Reset to preset values
      </button>
    </div>
  );
};

export default JobForm;

function deepClone(value: Record<string, unknown> | undefined): Record<string, unknown> {
  return value ? JSON.parse(JSON.stringify(value)) : {};
}

function sanitizeLLMSettings(settings: LLMSettings): LLMSettings | undefined {
  const cleaned: LLMSettings = {};
  (Object.entries(settings) as [keyof LLMSettings, string | null | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        cleaned[key] = value;
      }
    }
  );
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
