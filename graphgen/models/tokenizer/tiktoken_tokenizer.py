from dataclasses import dataclass
from typing import List

from graphgen.bases import BaseTokenizer


@dataclass
class TiktokenTokenizer(BaseTokenizer):
    def __post_init__(self):
        try:
            import tiktoken
        except ModuleNotFoundError as exc:
            raise ModuleNotFoundError(
                "tiktoken is required for the default tokenizer. Install via `pip install -r requirements.txt`."
            ) from exc
        self.enc = tiktoken.get_encoding(self.model_name)

    def encode(self, text: str) -> List[int]:
        return self.enc.encode(text)

    def decode(self, token_ids: List[int]) -> str:
        return self.enc.decode(token_ids)
