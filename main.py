"""
PDF/Text → Gemini → ElevenLabs TTS pipeline.
Usage:
    python main.py --file document.pdf --pages 1-3,5 --output audio.mp3
    python main.py --file notes.txt
    python main.py --text "Hello world"
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import tempfile

import httpx
from dotenv import load_dotenv
from elevenlabs import ElevenLabs, VoiceSettings
from google import genai
from google.genai import types
from pypdf import PdfReader, PdfWriter

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")

DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2"


# ── PDF helpers ───────────────────────────────────────────────────────────────

def parse_page_ranges(page_str: str, total_pages: int) -> list[int]:
    """Parse '1-3,5,7-9' → sorted 0-based page indices."""
    pages: set[int] = set()
    for part in page_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            pages.update(range(int(start) - 1, int(end)))
        else:
            pages.add(int(part) - 1)
    return sorted(p for p in pages if 0 <= p < total_pages)


def extract_pdf_pages(pdf_path: str, page_indices: list[int]) -> str:
    """Write selected pages to a temp PDF and return its path."""
    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    for idx in page_indices:
        writer.add_page(reader.pages[idx])
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    with open(tmp.name, "wb") as f:
        writer.write(f)
    return tmp.name


def get_pdf_page_count(pdf_path: str) -> int:
    return len(PdfReader(pdf_path).pages)


# ── Gemini ────────────────────────────────────────────────────────────────────

def extract_text_from_gemini(
    input_path: str | None,
    inline_text: str | None,
    page_indices: list[int] | None = None,
    gemini_model: str = DEFAULT_GEMINI_MODEL,
    api_key: str | None = None,
) -> str:
    """Extract/process text via Gemini. Returns the model's text output."""
    client = genai.Client(api_key=api_key or GEMINI_API_KEY)

    if inline_text:
        response = client.models.generate_content(
            model=gemini_model,
            contents=(
                "Reformat the following text as clean Markdown. "
                "Use # for the main title, ## for section headings, "
                "**bold** for key terms, and preserve paragraph breaks. "
                "Output only the Markdown, no extra commentary:\n\n"
                + inline_text
            ),
        )
        return response.text

    path = pathlib.Path(input_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {input_path}")

    suffix = path.suffix.lower()

    if suffix == ".pdf":
        upload_path = str(path)
        tmp_path = None
        if page_indices is not None:
            tmp_path = extract_pdf_pages(str(path), page_indices)
            upload_path = tmp_path
        try:
            uploaded_file = client.files.upload(file=upload_path)
            response = client.models.generate_content(
                model=gemini_model,
                contents=[
                    types.Part.from_uri(
                        file_uri=uploaded_file.uri,
                        mime_type="application/pdf",
                    ),
                    "Extract all text from this PDF and format it as clean Markdown. "
                    "Use # for chapter/main titles, ## for section headings, "
                    "**bold** for key terms or emphasis, and preserve paragraph breaks. "
                    "Output only the Markdown, no extra commentary.",
                ],
            )
        finally:
            if tmp_path:
                os.unlink(tmp_path)
        return response.text

    elif suffix in (".txt", ".md"):
        text = path.read_text(encoding="utf-8")
        response = client.models.generate_content(
            model=gemini_model,
            contents=(
                "Reformat the following text as clean Markdown. "
                "Use # for the main title, ## for section headings, "
                "**bold** for key terms, and preserve paragraph breaks. "
                "Output only the Markdown, no extra commentary:\n\n" + text
            ),
        )
        return response.text

    else:
        raise ValueError(f"Unsupported file type: {suffix}. Use .pdf, .txt, or .md")


# ── Markdown → plain text (for TTS) ──────────────────────────────────────────

def strip_markdown(text: str) -> str:
    """Remove markdown syntax so ElevenLabs receives clean prose."""
    # Fenced code blocks
    text = re.sub(r"```[\s\S]*?```", "", text)
    # Inline code
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # ATX headers  →  keep text
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Bold / italic  (***x***, **x**, *x*, ___x___, __x__, _x_)
    text = re.sub(r"\*{1,3}([^*\n]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_\n]+)_{1,3}", r"\1", text)
    # Blockquotes
    text = re.sub(r"^>\s?", "", text, flags=re.MULTILINE)
    # Horizontal rules
    text = re.sub(r"^[-*_]{3,}\s*$", "", text, flags=re.MULTILINE)
    # Links  [text](url)  →  text
    text = re.sub(r"!\[([^\]]*)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    # Unordered list markers
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    # Ordered list markers
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    # Collapse 3+ blank lines → 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ── ElevenLabs ────────────────────────────────────────────────────────────────

def stream_to_elevenlabs(
    text: str,
    output_path: str,
    voice_settings: dict | None = None,
    elevenlabs_model: str = DEFAULT_ELEVENLABS_MODEL,
    voice_id: str | None = None,
    api_key: str | None = None,
    on_progress: callable | None = None,
) -> int:
    """Stream TTS audio from ElevenLabs SDK. Returns total bytes written."""
    resolved_key = api_key or ELEVENLABS_API_KEY
    vid = voice_id or ELEVENLABS_VOICE_ID
    vs = {**(voice_settings or {})}

    client = ElevenLabs(api_key=resolved_key)

    settings = VoiceSettings(
        stability=vs.get("stability", 0.5),
        similarity_boost=vs.get("similarity_boost", 0.75),
        style=vs.get("style", 0.0),
        use_speaker_boost=vs.get("use_speaker_boost", True),
        speed=vs.get("speed", 1.0),
    )

    audio_stream = client.text_to_speech.stream(
        voice_id=vid,
        text=strip_markdown(text),
        model_id=elevenlabs_model,
        voice_settings=settings,
        output_format="mp3_44100_128",
    )

    total_bytes = 0
    with open(output_path, "wb") as f:
        for chunk in audio_stream:
            if isinstance(chunk, bytes) and chunk:
                f.write(chunk)
                total_bytes += len(chunk)
                if on_progress:
                    on_progress(total_bytes)

    return total_bytes


# ── ElevenLabs with word timestamps ──────────────────────────────────────────

def _chars_to_words(
    characters: list[str],
    start_times: list[float],
    end_times: list[float],
) -> list[dict]:
    """
    Aggregate character-level ElevenLabs alignment into word-level dicts.
    Each dict: {"word": str, "start": float, "end": float}
    """
    words: list[dict] = []
    buf_chars: list[str] = []
    buf_start: float | None = None
    buf_end: float = 0.0

    for ch, t_start, t_end in zip(characters, start_times, end_times):
        if ch in (" ", "\n", "\t"):
            if buf_chars:
                words.append({"word": "".join(buf_chars), "start": buf_start, "end": buf_end})
                buf_chars = []
                buf_start = None
        else:
            if buf_start is None:
                buf_start = t_start
            buf_chars.append(ch)
            buf_end = t_end

    if buf_chars:
        words.append({"word": "".join(buf_chars), "start": buf_start, "end": buf_end})

    return words


def generate_with_timestamps(
    text: str,
    voice_settings: dict | None = None,
    elevenlabs_model: str = DEFAULT_ELEVENLABS_MODEL,
    voice_id: str | None = None,
    api_key: str | None = None,
) -> tuple[bytes, list[dict]]:
    """
    Call ElevenLabs convert_with_timestamps.
    Returns (audio_bytes, word_timings) where word_timings is a list of
    {"word": str, "start": float, "end": float}.
    """
    resolved_key = api_key or ELEVENLABS_API_KEY
    vid = voice_id or ELEVENLABS_VOICE_ID
    vs = voice_settings or {}

    client = ElevenLabs(api_key=resolved_key)
    settings = VoiceSettings(
        stability=vs.get("stability", 0.5),
        similarity_boost=vs.get("similarity_boost", 0.75),
        style=vs.get("style", 0.0),
        use_speaker_boost=vs.get("use_speaker_boost", True),
        speed=vs.get("speed", 1.0),
    )

    response = client.text_to_speech.convert_with_timestamps(
        voice_id=vid,
        text=strip_markdown(text),
        model_id=elevenlabs_model,
        voice_settings=settings,
        output_format="mp3_44100_128",
    )

    import base64
    audio_bytes = base64.b64decode(response.audio_base_64)

    alignment = response.alignment
    word_timings = _chars_to_words(
        alignment.characters,
        alignment.character_start_times_seconds,
        alignment.character_end_times_seconds,
    )
    return audio_bytes, word_timings


# ── Dictionary helpers ────────────────────────────────────────────────────────

def identify_key_terms(
    text: str,
    gemini_model: str = DEFAULT_GEMINI_MODEL,
    api_key: str | None = None,
    max_terms: int = 6,
) -> list[str]:
    """Ask Gemini to pick the most dictionary-worthy words from a paragraph."""
    client = genai.Client(api_key=api_key or GEMINI_API_KEY)
    prompt = (
        f"From the text below, choose up to {max_terms} individual words that are "
        "most worth looking up in a dictionary — prefer technical terms, uncommon words, "
        "or words central to understanding the passage. "
        "Return ONLY a valid JSON array of lowercase single words. Example: [\"concurrent\",\"lightweight\"]\n\n"
        f"Text:\n{text}"
    )
    response = client.models.generate_content(model=gemini_model, contents=prompt)
    raw = response.text.strip()
    # Strip optional markdown fences
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip().strip("`").strip()
    return json.loads(raw)


def fetch_word_definition(word: str) -> dict | None:
    """Fetch a word entry from the Free Dictionary API (no key required)."""
    try:
        with httpx.Client(timeout=8) as client:
            r = client.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{word.lower()}")
            if r.status_code == 200:
                return r.json()[0]
    except Exception:
        pass
    return None


# ── CLI entry point ───────────────────────────────────────────────────────────

def run(
    input_path: str | None,
    inline_text: str | None,
    output_path: str,
    pages: str | None = None,
    gemini_model: str = DEFAULT_GEMINI_MODEL,
    elevenlabs_model: str = DEFAULT_ELEVENLABS_MODEL,
) -> None:
    page_indices = None
    if pages and input_path and input_path.lower().endswith(".pdf"):
        total = get_pdf_page_count(input_path)
        page_indices = parse_page_ranges(pages, total)
        print(f"Processing pages: {[p + 1 for p in page_indices]}")

    print(f"Step 1: Extracting text with {gemini_model}...")
    text = extract_text_from_gemini(input_path, inline_text, page_indices, gemini_model)

    preview = text[:300].replace("\n", " ")
    print(f"\n--- Extracted ({len(text)} chars) ---\n{preview}{'...' if len(text) > 300 else ''}\n---\n")

    print(f"Step 2: Streaming to ElevenLabs [{elevenlabs_model}]...")
    total = stream_to_elevenlabs(
        text, output_path,
        elevenlabs_model=elevenlabs_model,
        on_progress=lambda b: print(f"\r{b:,} bytes", end=""),
    )
    print(f"\nSaved to {output_path} ({total:,} bytes)")


def main() -> None:
    import sys

    # Streamlit's file-watcher re-executes this file with its own argv
    # (e.g. ["streamlit", "run", "app.py", ...]); bail out silently.
    if any("streamlit" in a for a in sys.argv):
        return

    parser = argparse.ArgumentParser(description="PDF/Text → Gemini → ElevenLabs TTS")
    group = parser.add_mutually_exclusive_group()          # not required — show help instead
    group.add_argument("--file", "-f", help="Path to PDF, TXT, or MD file")
    group.add_argument("--text", "-t", help="Inline text to convert to speech")
    parser.add_argument("--pages", "-p", help="PDF pages to process, e.g. '1-3,5'")
    parser.add_argument("--output", "-o", default="output.mp3")
    parser.add_argument("--gemini-model", default=DEFAULT_GEMINI_MODEL)
    parser.add_argument("--elevenlabs-model", default=DEFAULT_ELEVENLABS_MODEL)
    args = parser.parse_args()

    if not args.file and not args.text:
        parser.print_help()
        sys.exit(0)

    run(args.file, args.text, args.output, args.pages, args.gemini_model, args.elevenlabs_model)


if __name__ == "__main__":
    import sys

    if any("streamlit" in a for a in sys.argv):
        # User ran `streamlit run main.py` — forward to the real UI entry point
        import runpy, pathlib
        runpy.run_path(
            str(pathlib.Path(__file__).parent / "app.py"),
            run_name="__main__",
        )
    else:
        main()
