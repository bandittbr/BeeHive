"""
Autocrop de vídeo para 9:16 com face tracking via OpenCV + ffmpeg.
"""
import os
import subprocess
import json
from .config import LOCAL_OUTPUT_DIR


def crop_clip(video_path: str, start_time: float, end_time: float,
              output_path: str = None, aspect_ratio: str = "9:16") -> str:
    """
    Recorta e redimensiona o vídeo para o aspect ratio desejado.

    Pipeline:
    1. ffmpeg: extrai o subclip [start_time, end_time]
    2. OpenCV: detecta rosto e calcula crop window
    3. ffmpeg: aplica crop + reencoda

    Returns:
        caminho do arquivo gerado
    """
    os.makedirs(os.path.dirname(output_path) if output_path else LOCAL_OUTPUT_DIR, exist_ok=True)

    if not output_path:
        output_path = os.path.join(LOCAL_OUTPUT_DIR, f"short_{int(start_time)}_{int(end_time)}.mp4")

    probe = _probe_video(video_path)
    src_w = probe.get("width", 1920)
    src_h = probe.get("height", 1080)

    target_w, target_h = _parse_aspect(aspect_ratio)
    crop_params = _calculate_crop(src_w, src_h, target_w, target_h, video_path, start_time, end_time)

    duration = end_time - start_time

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", video_path,
        "-t", str(duration),
        "-vf", f"crop={crop_params['w']}:{crop_params['h']}:{crop_params['x']}:{crop_params['y']},scale={target_w}:{target_h},format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-threads", "2",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg crop error: {result.stderr[-1500:]}")

    return output_path


def add_subtitles(video_path: str, srt_path: str, output_path: str) -> str:
    """Embebe legendas .srt no vídeo."""
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"subtitles={srt_path}:force_style='FontSize=20,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "copy",
        "-movflags", "+faststart",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg subtitle error: {result.stderr[:500]}")

    return output_path


def generate_thumbnail(video_path: str, timestamp: float, output_path: str) -> str:
    """Gera thumbnail do vídeo no timestamp especificado."""
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(timestamp),
        "-i", video_path,
        "-vframes", "1",
        "-vf", "scale=720:-1",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg thumbnail error: {result.stderr[:300]}")

    return output_path


def _probe_video(path: str) -> dict:
    """Obtém dimensões e info do vídeo."""
    try:
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        data = json.loads(result.stdout)
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                return {
                    "width": stream.get("width", 1920),
                    "height": stream.get("height", 1080),
                }
    except Exception:
        pass
    return {"width": 1920, "height": 1080}


def _parse_aspect(ratio: str) -> tuple:
    """Converte '9:16' para (1080, 1920)."""
    parts = ratio.split(":")
    if len(parts) == 2:
        w, h = int(parts[0]), int(parts[1])
        scale = max(1080 / w, 1920 / h)
        return int(w * scale), int(h * scale)
    return 1080, 1920


def _calculate_crop(src_w: int, src_h: int, target_w: int, target_h: int,
                    video_path: str, start_time: float, end_time: float) -> dict:
    """
    Calcula parâmetros de crop com face detection.
    Tenta detectar rosto; se falhar, usa crop centralizado.
    """
    try:
        import cv2

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        mid_frame = int((start_time + (end_time - start_time) / 2) * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, mid_frame)

        ret, frame = cap.read()
        cap.release()

        if ret:
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(50, 50))

            if len(faces) > 0:
                fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
                face_cx = fx + fw // 2

                crop_w = int(src_h * target_w / target_h)
                crop_x = max(0, min(face_cx - crop_w // 2, src_w - crop_w))

                return {"w": crop_w, "h": src_h, "x": crop_x, "y": 0}

    except ImportError:
        pass
    except Exception:
        pass

    crop_w = int(src_h * target_w / target_h)
    crop_x = max(0, (src_w - crop_w) // 2)
    return {"w": crop_w, "h": src_h, "x": crop_x, "y": 0}
