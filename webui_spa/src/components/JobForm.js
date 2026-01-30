import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createJob } from "../services/jobs";
import { getConfig, listConfigs, listInputSamples } from "../services/configs";
import { getLLMDefaults } from "../services/settings";
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
    const [selectedConfigId, setSelectedConfigId] = useState(undefined);
    const [outputDir, setOutputDir] = useState("");
    const [configState, setConfigState] = useState({});
    const [advancedDraft, setAdvancedDraft] = useState("{}");
    const [useAdvancedEditor, setUseAdvancedEditor] = useState(false);
    const [useCustomLLM, setUseCustomLLM] = useState(false);
    const [llmSettings, setLLMSettings] = useState({});
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!configsQuery.data)
            return;
        if (selectedConfigId)
            return;
        const fallback = configsQuery.data.default ??
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
        if (!configDetailQuery.data)
            return;
        const next = deepClone(configDetailQuery.data.config ?? {});
        setConfigState(next);
        setAdvancedDraft(JSON.stringify(next, null, 2));
    }, [configDetailQuery.data?.id]);
    useEffect(() => {
        if (useAdvancedEditor)
            return;
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
    const currentConfig = configDetailQuery.data;
    const currentPreset = useMemo(() => {
        if (!configsQuery.data || !selectedConfigId)
            return undefined;
        return configsQuery.data.configs.find((c) => c.id === selectedConfigId);
    }, [configsQuery.data, selectedConfigId]);
    useEffect(() => {
        if (!llmDefaultsQuery.data)
            return;
        if (Object.keys(llmSettings).length > 0)
            return;
        setLLMSettings({ ...llmDefaultsQuery.data.defaults });
    }, [llmDefaultsQuery.data, llmSettings]);
    const mutation = useMutation({
        mutationFn: createJob,
        onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            navigate(`/jobs/${job.job_id}`);
        },
        onError: (err) => {
            setError(err.message);
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
            const payload = {
                config_path: currentConfig.path,
                output_dir: outputDir || undefined,
                overrides,
                llm_settings: llmPayload
            };
            mutation.mutate(payload);
        }
        catch (err) {
            setError(`Configuration must be valid JSON: ${err.message}`);
        }
    };
    const updateConfigValue = (path, value) => {
        setConfigState((prev) => {
            const next = deepClone(prev);
            let cursor = next;
            for (let i = 0; i < path.length - 1; i += 1) {
                const key = path[i];
                const existing = cursor[key];
                if (typeof existing !== "object" || existing === null) {
                    cursor[key] = {};
                }
                cursor = cursor[key];
            }
            cursor[path[path.length - 1]] = value;
            return next;
        });
    };
    const partitionMethod = useMemo(() => {
        const partition = configState.partition;
        return typeof partition?.method === "string" ? partition.method : "";
    }, [configState]);
    const methodParams = useMemo(() => {
        const partition = configState.partition;
        if (!partition)
            return {};
        const params = partition.method_params;
        return params ?? {};
    }, [configState]);
    const baseMethodParams = useMemo(() => {
        const partition = currentConfig?.config?.partition;
        if (!partition)
            return {};
        const params = partition.method_params;
        return params ?? {};
    }, [currentConfig]);
    const allMethodParamKeys = useMemo(() => {
        return Array.from(new Set([
            ...Object.keys(baseMethodParams),
            ...Object.keys(methodParams)
        ]));
    }, [baseMethodParams, methodParams]);
    const selectedSearchTypes = useMemo(() => {
        const searchConfig = configState.search;
        if (!searchConfig)
            return [];
        const types = searchConfig.search_types;
        return Array.isArray(types)
            ? types.filter((t) => typeof t === "string")
            : [];
    }, [configState]);
    const isSearchEnabled = useMemo(() => {
        const searchConfig = configState.search;
        return Boolean(searchConfig?.enabled);
    }, [configState]);
    const quizConfig = configState.quiz_and_judge;
    const currentInputFile = configState.read?.input_file ?? "";
    const selectedSampleValue = inputSamplesQuery.data?.inputs.some((sample) => sample.path === currentInputFile)
        ? currentInputFile
        : "";
    if (configsQuery.isLoading && !configsQuery.data) {
        return _jsx("div", { className: "card", children: "Loading presets\u2026" });
    }
    if (configsQuery.isError) {
        return (_jsx("div", { className: "card", children: _jsx("p", { children: "Unable to load configuration presets." }) }));
    }
    if (selectedConfigId && configDetailQuery.isLoading && !currentConfig) {
        return _jsx("div", { className: "card", children: "Loading configuration\u2026" });
    }
    return (_jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsxs("div", { children: [_jsx("h2", { children: "Launch GraphGen Job" }), _jsx("p", { style: { color: "#64748b", marginTop: "0.25rem" }, children: "Choose a preset, adjust the pipeline, and start a generation run." })] }), _jsx("button", { type: "button", className: "button-secondary", onClick: () => setUseAdvancedEditor((prev) => !prev), children: useAdvancedEditor ? "Use Guided Form" : "Edit Raw JSON" })] }), _jsxs("div", { style: {
                    display: "grid",
                    gap: "1.25rem",
                    marginTop: "1.5rem"
                }, children: [_jsxs("section", { children: [_jsxs("label", { style: { display: "block", marginBottom: "1rem" }, children: [_jsx("span", { style: { display: "block", fontWeight: 600 }, children: "Preset" }), _jsxs("select", { value: selectedConfigId ?? "", onChange: (event) => setSelectedConfigId(event.target.value), style: {
                                            marginTop: "0.4rem",
                                            width: "100%",
                                            padding: "0.75rem",
                                            borderRadius: "8px",
                                            border: "1px solid #d1d5db",
                                            background: "white"
                                        }, children: [!selectedConfigId && _jsx("option", { value: "", children: "Select a configuration" }), configsQuery.data?.configs.map((config) => (_jsxs("option", { value: config.id, children: [config.name, config.mode ? ` (${config.mode})` : ""] }, config.id)))] })] }), currentPreset && (_jsxs("div", { style: {
                                    padding: "0.75rem",
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
                                    background: "#f8fafc",
                                    color: "#475569"
                                }, children: [_jsx("strong", { children: currentPreset.name }), _jsx("div", { style: { fontSize: "0.85rem", marginTop: "0.25rem" }, children: currentPreset.description ??
                                            "Preset configuration bundled with GraphGen." }), _jsxs("div", { style: { fontSize: "0.8rem", marginTop: "0.25rem" }, children: ["Path: ", _jsx("code", { children: currentPreset.path })] })] }))] }), _jsxs("label", { style: { display: "block", marginBottom: "1rem" }, children: [_jsx("span", { style: { display: "block", fontWeight: 600 }, children: "Output directory (optional)" }), _jsx("input", { value: outputDir, onChange: (event) => setOutputDir(event.target.value), placeholder: "cache/runs", style: {
                                    marginTop: "0.4rem",
                                    width: "100%",
                                    padding: "0.75rem",
                                    borderRadius: "8px",
                                    border: "1px solid #d1d5db"
                                } })] }), useAdvancedEditor ? (_jsxs("label", { style: { display: "block" }, children: [_jsx("span", { style: { display: "block", fontWeight: 600 }, children: "Configuration JSON" }), _jsx("textarea", { value: advancedDraft, onChange: (event) => setAdvancedDraft(event.target.value), rows: 16, style: {
                                    marginTop: "0.75rem",
                                    width: "100%",
                                    padding: "0.75rem",
                                    borderRadius: "8px",
                                    border: "1px solid #d1d5db",
                                    fontFamily: "monospace"
                                } })] })) : (_jsxs(_Fragment, { children: [_jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Read" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: [_jsx("span", { children: "Input file" }), _jsx("input", { value: currentInputFile, onChange: (event) => updateConfigValue(["read", "input_file"], event.target.value), placeholder: "resources/input_examples/json_demo.json" })] }), inputSamplesQuery.data && inputSamplesQuery.data.inputs.length > 0 && (_jsxs("label", { children: [_jsx("span", { children: "Pick from examples" }), _jsxs("select", { value: selectedSampleValue, onChange: (event) => updateConfigValue(["read", "input_file"], event.target.value), children: [_jsx("option", { value: "", children: "Select sample\u2026" }), inputSamplesQuery.data.inputs.map((sample) => (_jsx("option", { value: sample.path, children: sample.name }, sample.path)))] })] }))] })] }), _jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Split" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: [_jsx("span", { children: "Chunk size" }), _jsx("input", { type: "number", min: 1, value: configState.split
                                                            ?.chunk_size ?? "", onChange: (event) => updateConfigValue(["split", "chunk_size"], event.target.value === ""
                                                            ? undefined
                                                            : Number(event.target.value)) })] }), _jsxs("label", { children: [_jsx("span", { children: "Chunk overlap" }), _jsx("input", { type: "number", min: 0, value: configState.split
                                                            ?.chunk_overlap ?? "", onChange: (event) => updateConfigValue(["split", "chunk_overlap"], event.target.value === ""
                                                            ? undefined
                                                            : Number(event.target.value)) })] })] })] }), _jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Search" }), _jsxs("label", { className: "checkbox-row", children: [_jsx("input", { type: "checkbox", checked: isSearchEnabled, onChange: (event) => updateConfigValue(["search", "enabled"], event.target.checked) }), _jsx("span", { children: "Enable external search" })] }), isSearchEnabled && (_jsx("div", { className: "chips", children: SEARCH_TYPES.map((searchType) => {
                                            const isChecked = selectedSearchTypes.includes(searchType);
                                            return (_jsxs("label", { className: "chip", children: [_jsx("input", { type: "checkbox", checked: isChecked, onChange: (event) => {
                                                            const next = event.target.checked
                                                                ? [...selectedSearchTypes, searchType]
                                                                : selectedSearchTypes.filter((stype) => stype !== searchType);
                                                            updateConfigValue(["search", "search_types"], next);
                                                        } }), _jsx("span", { children: searchType })] }, searchType));
                                        }) }))] }), _jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Quiz & Judge" }), _jsxs("label", { className: "checkbox-row", children: [_jsx("input", { type: "checkbox", checked: Boolean(quizConfig?.enabled), onChange: (event) => updateConfigValue(["quiz_and_judge", "enabled"], event.target.checked) }), _jsx("span", { children: "Enable quiz generation" })] }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: [_jsx("span", { children: "Quiz samples" }), _jsx("input", { type: "number", min: 0, disabled: !quizConfig?.enabled, value: quizConfig?.quiz_samples ?? "", onChange: (event) => updateConfigValue(["quiz_and_judge", "quiz_samples"], event.target.value === ""
                                                            ? undefined
                                                            : Number(event.target.value)) })] }), _jsxs("label", { className: "checkbox-row", style: { alignSelf: "flex-end" }, children: [_jsx("input", { type: "checkbox", disabled: !quizConfig?.enabled, checked: Boolean(quizConfig?.re_judge), onChange: (event) => updateConfigValue(["quiz_and_judge", "re_judge"], event.target.checked) }), _jsx("span", { children: "Re-judge existing samples" })] })] })] }), _jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "LLM Settings" }), _jsxs("label", { className: "checkbox-row", children: [_jsx("input", { type: "checkbox", checked: useCustomLLM, onChange: (event) => {
                                                    const next = event.target.checked;
                                                    setUseCustomLLM(next);
                                                    if (next && llmDefaultsQuery.data) {
                                                        setLLMSettings({ ...llmDefaultsQuery.data.defaults });
                                                    }
                                                } }), _jsx("span", { children: "Override server defaults" })] }), useCustomLLM && (_jsxs("div", { className: "form-grid", children: [llmDefaultsQuery.isLoading && (_jsx("p", { style: { gridColumn: "1 / -1", color: "#64748b" }, children: "Loading defaults\u2026" })), llmDefaultsQuery.isError && (_jsx("p", { style: { gridColumn: "1 / -1", color: "#dc2626" }, children: "Unable to load server defaults; provide values manually." })), _jsxs("label", { children: [_jsx("span", { children: "Synthesizer model" }), _jsx("input", { value: llmSettings.synthesizer_model ?? "", onChange: (event) => setLLMSettings((prev) => ({
                                                            ...prev,
                                                            synthesizer_model: event.target.value
                                                        })), placeholder: "gpt-4o-mini" })] }), _jsxs("label", { children: [_jsx("span", { children: "Synthesizer API endpoint" }), _jsx("input", { value: llmSettings.synthesizer_base_url ?? "", onChange: (event) => setLLMSettings((prev) => ({
                                                            ...prev,
                                                            synthesizer_base_url: event.target.value
                                                        })), placeholder: "https://api.openai.com/v1" })] }), _jsxs("label", { children: [_jsx("span", { children: "Trainee model" }), _jsx("input", { value: llmSettings.trainee_model ?? "", onChange: (event) => setLLMSettings((prev) => ({
                                                            ...prev,
                                                            trainee_model: event.target.value
                                                        })), placeholder: "gpt-4o-mini" })] }), _jsxs("label", { children: [_jsx("span", { children: "Trainee API endpoint" }), _jsx("input", { value: llmSettings.trainee_base_url ?? "", onChange: (event) => setLLMSettings((prev) => ({
                                                            ...prev,
                                                            trainee_base_url: event.target.value
                                                        })), placeholder: "https://api.openai.com/v1" })] }), _jsxs("label", { children: [_jsx("span", { children: "Tokenizer model" }), _jsx("input", { value: llmSettings.tokenizer_model ?? "", onChange: (event) => setLLMSettings((prev) => ({
                                                            ...prev,
                                                            tokenizer_model: event.target.value
                                                        })), placeholder: "cl100k_base" })] }), _jsxs("label", { children: [_jsx("span", { children: "Synthesizer API key" }), _jsx("input", { value: llmSettings.synthesizer_api_key ?? "", onChange: (event) => setLLMSettings((prev) => ({
                                                            ...prev,
                                                            synthesizer_api_key: event.target.value
                                                        })), placeholder: "sk-..." })] }), _jsxs("label", { children: [_jsx("span", { children: "Trainee API key" }), _jsx("input", { value: llmSettings.trainee_api_key ?? "", onChange: (event) => setLLMSettings((prev) => ({
                                                            ...prev,
                                                            trainee_api_key: event.target.value
                                                        })), placeholder: "sk-..." })] })] }))] }), _jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Partition" }), _jsx("div", { className: "form-grid", children: _jsxs("label", { children: [_jsx("span", { children: "Method" }), _jsxs("select", { value: partitionMethod, onChange: (event) => updateConfigValue(["partition", "method"], event.target.value), children: [_jsx("option", { value: "", children: "Select method" }), PARTITION_METHODS.map((method) => (_jsx("option", { value: method, children: method }, method)))] })] }) }), allMethodParamKeys.length > 0 && (_jsx("div", { className: "form-grid", children: allMethodParamKeys.map((key) => {
                                            const original = baseMethodParams[key];
                                            const current = methodParams[key];
                                            const value = typeof current !== "undefined"
                                                ? current
                                                : typeof original !== "undefined"
                                                    ? original
                                                    : "";
                                            const typeOfOriginal = typeof original;
                                            if (typeOfOriginal === "boolean") {
                                                return (_jsxs("label", { className: "checkbox-row", children: [_jsx("input", { type: "checkbox", checked: Boolean(value), onChange: (event) => updateConfigValue(["partition", "method_params", key], event.target.checked) }), _jsx("span", { children: key })] }, key));
                                            }
                                            const inputType = typeOfOriginal === "number" ? "number" : "text";
                                            return (_jsxs("label", { children: [_jsx("span", { children: key }), _jsx("input", { type: inputType, value: typeof value === "number" || typeof value === "string"
                                                            ? value
                                                            : "", onChange: (event) => {
                                                            const rawValue = event.target.value;
                                                            let nextValue = rawValue;
                                                            if (inputType === "number") {
                                                                nextValue =
                                                                    rawValue === "" ? undefined : Number(event.target.value);
                                                            }
                                                            updateConfigValue(["partition", "method_params", key], nextValue);
                                                        } })] }, key));
                                        }) }))] }), _jsxs("fieldset", { className: "form-section", children: [_jsx("legend", { children: "Generation" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: [_jsx("span", { children: "Mode" }), _jsxs("select", { value: configState.generate
                                                            ?.mode ?? "", onChange: (event) => updateConfigValue(["generate", "mode"], event.target.value), children: [_jsx("option", { value: "", children: "Select mode" }), GENERATE_MODES.map((mode) => (_jsx("option", { value: mode, children: mode }, mode)))] })] }), _jsxs("label", { children: [_jsx("span", { children: "Data format" }), _jsxs("select", { value: configState.generate
                                                            ?.data_format ?? "", onChange: (event) => updateConfigValue(["generate", "data_format"], event.target.value), children: [_jsx("option", { value: "", children: "Select format" }), DATA_FORMATS.map((format) => (_jsx("option", { value: format, children: format }, format)))] })] })] })] })] }))] }), error && (_jsx("div", { style: {
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    marginBottom: "1rem"
                }, children: error })), _jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1.5rem"
                }, children: [currentConfig && !useAdvancedEditor && (_jsxs("details", { children: [_jsx("summary", { children: "Preview JSON overrides" }), _jsx("pre", { style: {
                                    marginTop: "0.75rem",
                                    background: "#0f172a",
                                    color: "#e2e8f0",
                                    padding: "0.75rem",
                                    borderRadius: "8px",
                                    maxHeight: "240px",
                                    overflow: "auto",
                                    fontSize: "0.85rem"
                                }, children: JSON.stringify(configState, null, 2) })] })), _jsx("button", { className: "button-primary", type: "button", onClick: submit, disabled: mutation.isPending, style: { marginLeft: "auto" }, children: mutation.isPending ? "Submitting…" : "Launch Job" })] }), _jsx("button", { className: "button-secondary", type: "button", onClick: () => {
                    if (!currentConfig)
                        return;
                    const next = deepClone(currentConfig.config ?? {});
                    setConfigState(next);
                    setAdvancedDraft(JSON.stringify(next, null, 2));
                    setError(null);
                    setUseCustomLLM(false);
                    if (llmDefaultsQuery.data) {
                        setLLMSettings({ ...llmDefaultsQuery.data.defaults });
                    }
                }, style: { marginTop: "0.75rem" }, children: "Reset to preset values" })] }));
};
export default JobForm;
function deepClone(value) {
    return value ? JSON.parse(JSON.stringify(value)) : {};
}
function sanitizeLLMSettings(settings) {
    const cleaned = {};
    Object.entries(settings).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            cleaned[key] = value;
        }
    });
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
