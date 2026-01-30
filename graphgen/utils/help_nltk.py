import os
from typing import Dict, List, Optional

try:
    import nltk
except ModuleNotFoundError:
    nltk = None  # type: ignore

try:
    import jieba
except ModuleNotFoundError:
    jieba = None  # type: ignore

resource_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "resources")


class NLTKHelper:
    _stopwords: Dict[str, Optional[List[str]]] = {
        "english": None,
        "chinese": None,
    }

    def __init__(self):
        missing_deps = []
        if nltk is None:
            missing_deps.append("nltk")
        if jieba is None:
            missing_deps.append("jieba")
        if missing_deps:
            deps = ", ".join(missing_deps)
            raise ModuleNotFoundError(
                f"Optional text preprocessing dependencies missing: {deps}. "
                "Install them via `pip install -r requirements.txt` to enable NLTKHelper."
            )
        jieba.initialize()

    def get_stopwords(self, lang: str) -> List[str]:
        if nltk is None:
            raise ModuleNotFoundError(
                "nltk is required for stopword lookup. Install via `pip install -r requirements.txt`."
            )
        nltk.data.path.append(os.path.join(resource_path, "nltk_data"))
        if self._stopwords[lang] is None:
            try:
                nltk.data.find("corpora/stopwords")
            except LookupError:
                nltk.download("stopwords", download_dir=os.path.join(resource_path, "nltk_data"))

            self._stopwords[lang] = nltk.corpus.stopwords.words(lang)
        return self._stopwords[lang]

    @staticmethod
    def word_tokenize(text: str, lang: str) -> List[str]:
        if lang == "zh":
            if jieba is None:
                raise ModuleNotFoundError(
                    "jieba is required for Chinese tokenization. Install via `pip install -r requirements.txt`."
                )
            return jieba.lcut(text)
        if nltk is None:
            raise ModuleNotFoundError(
                "nltk is required for tokenization. Install via `pip install -r requirements.txt`."
            )
        nltk.data.path.append(os.path.join(resource_path, "nltk_data"))
        try:
            nltk.data.find("tokenizers/punkt_tab")
        except LookupError:
            nltk.download("punkt_tab", download_dir=os.path.join(resource_path, "nltk_data"))

        return nltk.word_tokenize(text)
