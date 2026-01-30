import os

import pytest
from openai import OpenAI
import gradio as gr


@pytest.mark.skipif(
    not (
        os.getenv("GRAPHGEN_TEST_API_BASE")
        and os.getenv("GRAPHGEN_TEST_API_KEY")
        and os.getenv("GRAPHGEN_TEST_API_MODEL")
    ),
    reason="Set GRAPHGEN_TEST_API_BASE/KEY/MODEL to run API connectivity test.",
)
def test_api_connection():
    client = OpenAI(
        api_key=os.environ["GRAPHGEN_TEST_API_KEY"],
        base_url=os.environ["GRAPHGEN_TEST_API_BASE"],
    )
    model_name = os.environ["GRAPHGEN_TEST_API_MODEL"]
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": "test"}],
            max_tokens=1,
        )
        if not response.choices or not response.choices[0].message:
            raise gr.Error(f"{model_name}: Invalid response from API")
        gr.Success(f"{model_name}: API connection successful")
    except Exception as exc:
        raise gr.Error(f"{model_name}: API connection failed: {exc}") from exc
