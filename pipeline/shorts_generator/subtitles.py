"""
Geração de legendas (.srt) a partir dos segmentos de transcrição.
"""
import os


def generate_srt(segments: list, output_path: str) -> str:
    """
    Gera arquivo .srt a partir dos segmentos de transcrição.

    Args:
        segments: [{"start": float, "end": float, "text": str}]
        output_path: caminho do arquivo .srt

    Returns:
        caminho do arquivo gerado
    """
    os.makedirs(os.path.dirname(output_path) if output_path else ".", exist_ok=True)

    lines = []
    for i, seg in enumerate(segments, 1):
        start = _format_srt_time(seg["start"])
        end = _format_srt_time(seg["end"])
        text = seg["text"].strip()

        if not text:
            continue

        lines.append(str(i))
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return output_path


def generate_word_srt(segments: list, output_path: str, words_per_line: int = 6) -> str:
    """
    Gera .srt com legendas palavra-a-palavra (para karaoke/word highlight).
    Se os segmentos não tiverem word-level timestamps, usa segment-level.
    """
    os.makedirs(os.path.dirname(output_path) if output_path else ".", exist_ok=True)

    lines = []
    counter = 1

    for seg in segments:
        words = seg["text"].split()
        if not words:
            continue

        seg_duration = seg["end"] - seg["start"]
        word_duration = seg_duration / max(len(words), 1)

        for i in range(0, len(words), words_per_line):
            chunk = words[i:i + words_per_line]
            w_start = seg["start"] + (i * word_duration)
            w_end = seg["start"] + ((i + len(chunk)) * word_duration)

            lines.append(str(counter))
            lines.append(f"{_format_srt_time(w_start)} --> {_format_srt_time(w_end)}")
            lines.append(" ".join(chunk))
            lines.append("")
            counter += 1

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return output_path


def clip_segments(segments: list, start_time: float, end_time: float) -> list:
    """Recorta segmentos para o intervalo [start_time, end_time]."""
    clipped = []
    for seg in segments:
        if seg["end"] <= start_time or seg["start"] >= end_time:
            continue

        new_start = max(seg["start"], start_time)
        new_end = min(seg["end"], end_time)

        clipped.append({
            "start": new_start,
            "end": new_end,
            "text": seg["text"],
        })

    return clipped


def _format_srt_time(seconds: float) -> str:
    """Converte segundos para formato SRT (HH:MM:SS,mmm)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
