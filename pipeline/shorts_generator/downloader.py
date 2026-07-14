"""
Download de vídeos do YouTube via yt-dlp.
"""
import os
import re
import sys
import subprocess
import json
import hashlib
from .config import LOCAL_OUTPUT_DIR, YOUTUBE_CACHE_DIR, YOUTUBE_FORMAT


def extract_video_id(url: str) -> str:
    """Extrai o ID do vídeo de uma URL do YouTube."""
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'(?:embed/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$',
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return url


def download_video(url: str, output_dir: str = None) -> dict:
    """
    Baixa vídeo do YouTube via yt-dlp.

    Returns:
        {"path": str, "video_id": str, "title": str, "duration": float}
    """
    out_dir = output_dir or LOCAL_OUTPUT_DIR
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(YOUTUBE_CACHE_DIR, exist_ok=True)

    video_id = extract_video_id(url)
    cache_path = os.path.join(YOUTUBE_CACHE_DIR, f"source_{video_id}.mp4")
    # URLs genéricas (não-YouTube) retornam a URL inteira em video_id,
    # gerando nome de arquivo inválido. Usa hash curto e seguro.
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', video_id):
        safe = hashlib.md5(url.encode('utf-8')).hexdigest()
        cache_path = os.path.join(YOUTUBE_CACHE_DIR, f"source_{safe}.mp4")

    if os.path.exists(cache_path):
        info = _probe(cache_path)
        return {
            "path": cache_path,
            "video_id": video_id,
            "title": info.get("title", video_id),
            "duration": info.get("duration", 0),
        }

    cmd = [
        sys.executable, "-m", "yt_dlp",
        "-f", YOUTUBE_FORMAT,
        "--merge-output-format", "mp4",
        "-o", cache_path,
        "--no-playlist",
        "--print-json",
        url,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp error: {result.stderr}")

    try:
        info = json.loads(result.stdout.strip().split('\n')[-1])
    except (json.JSONDecodeError, IndexError):
        info = {"title": video_id}

    duration = info.get("duration") or _probe(cache_path).get("duration", 0)

    return {
        "path": cache_path,
        "video_id": video_id,
        "title": info.get("title", video_id),
        "duration": duration,
    }


def _probe(path: str) -> dict:
    """Obtém info do vídeo via ffprobe."""
    try:
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)
        fmt = data.get("format", {})
        return {
            "duration": float(fmt.get("duration", 0)),
            "title": fmt.get("tags", {}).get("title", os.path.basename(path)),
        }
    except Exception:
        return {"duration": 0, "title": os.path.basename(path)}
