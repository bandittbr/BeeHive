"""
Transcrição de áudio via faster-whisper.

O faster-whisper usa o PyAV para decodificar o áudio do vídeo, mas o PyAV
empacota seu próprio ffmpeg e quebra com o ffmpeg do nix (Railway) —
`av.container.streams` levanta IndexError. Para contornar, extraímos o
áudio para WAV 16kHz mono com o ffmpeg do sistema (que funciona) e passamos
um numpy array diretamente ao modelo (sem passar pelo PyAV).
"""
import os
import json
import wave
import subprocess
import numpy as np
from .config import (
    LOCAL_WHISPER_MODEL,
    LOCAL_WHISPER_DEVICE,
    LOCAL_WHISPER_COMPUTE_TYPE,
    LOCAL_WHISPER_VAD_FILTER,
)


def _extract_wav(video_path: str) -> str:
    """Converte o áudio do vídeo para WAV 16kHz mono usando o ffmpeg do sistema."""
    wav_path = video_path.rsplit(".", 1)[0] + ".wav"
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", wav_path,
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=300, check=True)
    return wav_path


def _read_wav_as_float32(wav_path: str) -> np.ndarray:
    """Lê um WAV PCM em um numpy float32 normalizado (esperado pelo faster-whisper)."""
    with wave.open(wav_path, "rb") as wf:
        n_frames = wf.getnframes()
        raw = wf.readframes(n_frames)
        dtype = np.int16 if wf.getsampwidth() == 2 else np.uint8
        audio = np.frombuffer(raw, dtype=dtype).astype(np.float32)
        if dtype == np.uint8:
            audio = (audio - 128.0) / 128.0
        else:
            audio = audio / 32768.0
    return audio


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

    wav_path = _extract_wav(video_path)
    try:
        audio = _read_wav_as_float32(wav_path)
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)

    segments_iter, info = model.transcribe(
        audio,
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
