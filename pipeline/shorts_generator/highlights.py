"""
Identificação de highlights via LLM — pluggable backend.
Adaptado do AI-Youtube-Shorts-Generator (MIT License).
"""
import json
import re
import requests
from typing import Callable, Optional
from .config import BEEHIVE_API_URL, DEFAULT_PROVIDER_ID


VIRALITY_CRITERIA = [
    "1. Hook moments — opens that demand attention",
    "2. Emotional peaks — laughter, shock, anger, inspiration",
    "3. Opinion bombs — controversial or bold takes",
    "4. Revelation moments — surprising facts or data",
    "5. Conflict/tension — disagreements or debates",
    "6. Quotable one-liners — memorable short phrases",
    "7. Story peaks — climax of a narrative",
    "8. Practical value — actionable tips or how-tos",
]

HIGHLIGHT_SYSTEM_PROMPT = f"""You are an elite short-form video editor for TikTok, YouTube Shorts, and Instagram Reels.

Your job: identify the most viral-worthy moments from a long-form video transcript.

Virality Framework (ranked by importance):
{chr(10).join(VIRALITY_CRITERIA)}

Rules:
- Each clip should be 15-60 seconds long
- Prioritize moments with strong emotional hooks in the first 3 seconds
- A clip MUST have a clear beginning and end (no cutting mid-sentence)
- Score each clip 0-100 based on viral potential
- Return a JSON array of objects

Return ONLY valid JSON (no markdown fences, no explanation):
[
  {{
    "title": "Short descriptive title",
    "start_time": 120.5,
    "end_time": 175.3,
    "score": 87,
    "hook_sentence": "The exact words that open the clip",
    "virality_reason": "Why this moment is viral-worthy"
  }}
]"""


CONTENT_TYPE_PROMPT = """Analyze this video transcript excerpt and classify it.
Return ONLY valid JSON:
{
  "content_type": "podcast|interview|tutorial|lecture|commentary|debate|vlog|other",
  "information_density": "low|medium|high",
  "language": "pt|en|es|other"
}"""


def detect_content_type(transcript_segments: list, model: str = "") -> dict:
    """Detecta tipo de conteúdo e densidade de informação."""
    text = " ".join(s["text"] for s in transcript_segments[:25])
    prompt = f"{CONTENT_TYPE_PROMPT}\n\nTranscript excerpt:\n{text[:3000]}"

    try:
        result = call_beehive_llm(prompt, model=model)
        return _parse_json_loose(result)
    except Exception:
        return {"content_type": "other", "information_density": "medium", "language": "pt"}


def identify_highlights(
    transcript: dict,
    num_clips: int = 3,
    provider_id: str = "",
    model: str = "",
    llm_fn: Optional[Callable] = None,
) -> list:
    """
    Identifica os melhores cortes do vídeo.

    Args:
        transcript: {"duration": float, "segments": [...]}
        num_clips: número de clipes pra retornar
        provider_id: provider LLM pra usar
        llm_fn: callback customizado (override do BeeHive)

    Returns:
        Lista de highlights ranqueados por score.
    """
    segments = transcript.get("segments", [])
    duration = transcript.get("duration", 0)

    if not segments:
        return []

    content_info = detect_content_type(segments, model=model)
    content_type = content_info.get("content_type", "other")
    density = content_info.get("information_density", "medium")

    chunk_size = 20 * 60
    overlap = 60
    chunks = _split_into_chunks(segments, duration, chunk_size, overlap)

    all_highlights = []
    call_llm = llm_fn or (lambda p: call_beehive_llm(p, provider_id=provider_id, model=model))

    for chunk in chunks:
        highlights = _process_chunk(chunk, content_type, density, call_llm)
        all_highlights.extend(highlights)

    deduped = _dedupe_highlights(all_highlights)
    deduped.sort(key=lambda h: h.get("score", 0), reverse=True)

    return deduped[:num_clips]


def _split_into_chunks(segments: list, duration: float, chunk_size: int, overlap: int) -> list:
    """Divide segmentos em chunks sobrepostos para vídeos longos."""
    if duration <= chunk_size:
        return [segments]

    chunks = []
    chunk_start = 0

    while chunk_start < duration:
        chunk_end = chunk_start + chunk_size
        chunk_segs = [
            s for s in segments
            if s["start"] >= chunk_start and s["start"] < chunk_end
        ]
        if chunk_segs:
            chunks.append({"segments": chunk_segs, "offset": chunk_start})
        chunk_start += chunk_size - overlap

    return chunks


def _process_chunk(chunk: dict, content_type: str, density: str, call_llm: Callable) -> list:
    """Processa um chunk de transcrição e retorna highlights."""
    segments = chunk["segments"]
    offset = chunk["offset"]

    transcript_text = "\n".join(
        f"[{s['start']:.1f}s - {s['end']:.1f}s] {s['text']}"
        for s in segments
    )

    prompt = f"""{HIGHLIGHT_SYSTEM_PROMPT}

Content type: {content_type}
Information density: {density}

Transcript (with timestamps):
{transcript_text[:8000]}

Find the top viral moments. Return ONLY the JSON array."""

    for attempt in range(3):
        try:
            result = call_llm(prompt)
            highlights = _parse_json_loose(result)

            if not isinstance(highlights, list):
                raise ValueError("Not a list")

            for h in highlights:
                h["start_time"] = h.get("start_time", 0) + offset
                h["end_time"] = h.get("end_time", 0) + offset
                h["score"] = max(0, min(100, int(h.get("score", 50))))

            return highlights

        except Exception:
            if attempt < 2:
                prompt += "\n\nIMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation."

    return []


def _dedupe_highlights(highlights: list) -> list:
    """Remove highlights que se sobrepõem mais de 50%."""
    if not highlights:
        return []

    sorted_h = sorted(highlights, key=lambda h: h.get("score", 0), reverse=True)
    result = []

    for h in sorted_h:
        overlaps = False
        for existing in result:
            overlap = _calc_overlap(h, existing)
            shorter = min(h["end_time"] - h["start_time"], existing["end_time"] - existing["start_time"])
            if shorter > 0 and overlap / shorter > 0.5:
                overlaps = True
                break
        if not overlaps:
            result.append(h)

    return result


def _calc_overlap(a: dict, b: dict) -> float:
    """Calcula sobreposição temporal entre dois highlights."""
    start = max(a["start_time"], b["start_time"])
    end = min(a["end_time"], b["end_time"])
    return max(0, end - start)


def _parse_json_loose(text: str) -> any:
    """Parse JSON tolerante — remove markdown fences e text extra."""
    text = text.strip()

    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    arr_start = text.find("[")
    arr_end = text.rfind("]")
    if arr_start != -1 and arr_end > arr_start:
        try:
            return json.loads(text[arr_start:arr_end + 1])
        except json.JSONDecodeError:
            pass

    obj_start = text.find("{")
    obj_end = text.rfind("}")
    if obj_start != -1 and obj_end > obj_start:
        try:
            return json.loads(text[obj_start:obj_end + 1])
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


def call_beehive_llm(prompt: str, provider_id: str = "", model: str = "") -> str:
    """Chama o provider LLM configurado no BeeHive via API REST."""
    payload = {"prompt": prompt}
    if provider_id:
        payload["providerId"] = provider_id
    if model:
        payload["model"] = model

    resp = requests.post(
        f"{BEEHIVE_API_URL}/api/shorts/pipeline/llm",
        json=payload,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json().get("content", "")
