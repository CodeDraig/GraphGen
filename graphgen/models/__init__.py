"""
Convenience exports for commonly used model-layer utilities.

To keep optional dependencies truly optional, each group of imports is guarded
so the package can still be imported when extras (e.g. gradio, igraph, nltk)
are not installed. Attempting to use the guarded symbols without installing
their requirements will surface a ModuleNotFoundError at access time.
"""

from importlib import import_module

from .llm.openai_client import OpenAIClient
from .llm.topk_token_model import TopkTokenModel
from .storage import JsonKVStorage, JsonListStorage, NetworkXStorage
from .tokenizer import Tokenizer


def _safe_import(module: str, names: list[str]) -> None:
    try:
        imported = import_module(module, package=__name__)
    except ModuleNotFoundError as exc:
        for name in names:
            globals()[name] = _lazy_missing(name, exc)
        return

    for name in names:
        globals()[name] = getattr(imported, name)


def _lazy_missing(name: str, exc: ModuleNotFoundError):
    class MissingDependency:
        def __init__(self, *args, **kwargs):
            raise ModuleNotFoundError(
                f"{name} is unavailable because of a missing dependency: {exc}"
            ) from exc

    MissingDependency.__name__ = name
    return MissingDependency


_safe_import(
    ".generator",
    ["AggregatedGenerator", "AtomicGenerator", "CoTGenerator", "MultiHopGenerator", "VQAGenerator"],
)
_safe_import(".kg_builder", ["LightRAGKGBuilder"])
_safe_import(".evaluator", ["LengthEvaluator", "MTLDEvaluator", "RewardEvaluator", "UniEvaluator"])
_safe_import(
    ".partitioner",
    ["BFSPartitioner", "DFSPartitioner", "ECEPartitioner", "LeidenPartitioner"],
)
_safe_import(".reader", ["CSVReader", "JSONLReader", "JSONReader", "PDFReader", "TXTReader"])
_safe_import(".search.db.uniprot_search", ["UniProtSearch"])
_safe_import(".search.kg.wiki_search", ["WikiSearch"])
_safe_import(".search.web.bing_search", ["BingSearch"])
_safe_import(".search.web.google_search", ["GoogleSearch"])
_safe_import(
    ".splitter",
    ["ChineseRecursiveTextSplitter", "RecursiveCharacterSplitter"],
)
