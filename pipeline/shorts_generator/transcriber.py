"""
Transcrição de áudio via faster-whisper.
"""
import os
import json
from .config import (
    LOCAL_WHISPER_MODEL,
    LOCAL_WHISPER_DEVICE,
    LOCAL_WHISPER_COMPUTE_TYPE,
    LOCAL_WHISPER_VAD_FILTER,
)


def transcribe_video(video_path: str, language: str = "pt") -> dict:
    """
    Transcreve o vídeo usando faster-whisper.

    Returns:
        {"duration": float, "segments": [{"start": float, "end": float, "text": str}]}
    """
    cache_path = video_path.rsplit(".", 1)[0] + ".srt"

    if os.path.exists(cache_path) and os.path.getmtime(cache_path) > os.path.getmtime(video_path):
        return _load_srt_cache(cache_path)

    from faster_whisper import WhisperModel

    device = LOCAL_WHISPER_DEVICE
    compute_type = LOCAL_WHISPER_COMPUTE_TYPE
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"
        compute_type = "float16" if device == "cuda" else "int8"

    model = WhisperModel(LOCAL_WHISPER_MODEL, device=device, compute_type=compute_type)

    segments_iter, info = model.transcribe(
        video_path,
        language=language,
        vad_filter=LOCAL_WHISPER_VAD_FILTER,
        beam_size=5,
    )

    segments = []
    for seg in segments_iter:
        segments.append({
            "start": seg.start,
            "end": seg.end,
            "text": seg.text.strip(),
        })

    result = {
        "duration": info.duration if info else (segments[-1]["end"] if segments else 0),
        "segments": segments,
    }

    _save_srt_cache(cache_path, result)

    return result


def _load_srt_cache(path: str) -> dict:
    """Carrega cache de transcrição (.srt JSON)."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"duration": 0, "segments": []}


def _save_srt_cache(path: str, data: dict) -> None:
    """Salva cache de transcrição."""
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
