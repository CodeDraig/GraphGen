from dataclasses import dataclass, field
from typing import List

from graphgen.bases import BaseTokenizer

try:
    from transformers import AutoTokenizer

    _HF_AVAILABLE = True
except ImportError:
    _HF_AVAILABLE = False


def get_tokenizer_impl(tokenizer_name: str = "cl100k_base") -> BaseTokenizer:
    try:
        import tiktoken
    except ModuleNotFoundError:
        if _HF_AVAILABLE:
            from .hf_tokenizer import HFTokenizer

            return HFTokenizer(model_name=tokenizer_name)
        raise ModuleNotFoundError(
            "tiktoken is not installed and HuggingFace tokenizers are unavailable. "
            "Install dependencies via `pip install -r requirements.txt`."
        ) from None

    if tokenizer_name in tiktoken.list_encoding_names():
        from .tiktoken_tokenizer import TiktokenTokenizer

        return TiktokenTokenizer(model_name=tokenizer_name)

    # 2. HuggingFace
    if _HF_AVAILABLE:
        from .hf_tokenizer import HFTokenizer

        return HFTokenizer(model_name=tokenizer_name)

    raise ValueError(
        f"Unknown tokenizer {tokenizer_name} and HuggingFace not available."
    )


@dataclass
class Tokenizer(BaseTokenizer):
    """
    Encapsulates different tokenization implementations based on the specified model name.
    """

    model_name: str = "cl100k_base"
    _impl: BaseTokenizer = field(init=False, repr=False)

    def __post_init__(self):
        if not self.model_name:
            raise ValueError("TOKENIZER_MODEL must be specified in the ENV variables.")
        self._impl = get_tokenizer_impl(self.model_name)

    def encode(self, text: str) -> List[int]:
        return self._impl.encode(text)

    def decode(self, token_ids: List[int]) -> str:
        return self._impl.decode(token_ids)

    def count_tokens(self, text: str) -> int:
        return self._impl.count_tokens(text)
