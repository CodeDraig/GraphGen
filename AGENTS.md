# Repository Guidelines

## Project Structure & Module Organization
Core logic lives in `graphgen/` with subpackages for `models/`, `operators/`, and `utils/`. Configuration YAMLs sit under `graphgen/configs/`; templates and prompt assets are in `graphgen/templates/`. Tests are split between `tests/integration_tests/` (API-level checks) and `tests/e2e_tests/` (full pipeline runs). The `resources/` folder stores sample inputs and media, while `webui/` contains the Gradio interface. Shell helpers in `scripts/` mirror common generation presets, and `baselines/` gathers comparison references.

## Build, Test, and Development Commands
- `uv venv --python 3.13` (3.10–3.13 supported) then `uv pip install -r requirements.txt` to bootstrap the environment. Add `requirements-dev.txt` for local testing utilities.
- `python -m graphgen.generate --config_file graphgen/configs/atomic_config.yaml --output_dir ./runs/demo` executes a single data-generation cycle. The scripts under `scripts/generate/` wrap the same command with curated presets.
- `python -m webui.app` launches the packaged demo; use `PYTHONPATH=. gradio webui/app.py` for hot-reload during UI work.
- `uvicorn graphgen.api.app:app --reload` starts the FastAPI backend for the new SPA. Pair it with `npm install && npm run dev` inside `webui_spa/` to iterate on the React client.

## Coding Style & Naming Conventions
Follow Black with an 88-character line length and four-space indentation. Run `black .` and `isort .` before submitting; both tools are configured in `pyproject.toml`. Module and package names stay lowercase with underscores, while classes use PascalCase. Prefer explicit type hints for new public APIs and keep logging via `graphgen.utils.logger`.

## Testing Guidelines
Pytest is the canonical harness. Run `pytest` for the fast suite and `pytest tests/e2e_tests -m "not slow"` (or target specific files) when validating generation flows. E2E cases spawn subprocesses and touch the filesystem, so point `--basetemp` to a scratch directory when needed and avoid running them in parallel. Keep tests deterministic by seeding random components and capturing golden artifacts in `tests/data/` when practical.

## Commit & Pull Request Guidelines
Adopt conventional-commit prefixes (`fix:`, `feat:`, `docs:`, etc.), mirroring the existing history. Each commit should scope to one logical change and include updated configs or assets when they affect behaviour. Pull requests must describe intent, list any required environment variables or external services, and paste the relevant `pytest` output. Link tracking issues, attach UI screenshots or sample JSON where UX or data formats change, and note any follow-up work.

## Configuration & Secrets
Copy `.env.example` to `.env` and fill in synthesizer/trainee credentials before running generation commands. Never commit real API keys or datasets; reference them via environment variables and document any new knobs in the README or configuration YAMLs.
