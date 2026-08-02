"""Find the most viral-worthy highlights in a transcript."""

import json
import re
from typing import Callable, Dict, List, Optional

from . import muapi


LLMFn = Callable[[str], str]


CONTENT_TYPE_PROMPT = """Analyze this video transcript sample and classify the content type.

Choose one:
podcast, interview, tutorial, lecture, commentary, debate, vlog, other.

Also estimate content density:
low, medium, high.

Respond with JSON only:
{"content_type":"...", "density":"..."}
"""


VIRALITY_CRITERIA = """
Virality signals to prioritize:

1. HOOK MOMENTS
2. EMOTIONAL PEAKS
3. OPINION BOMBS
4. REVELATION MOMENTS
5. CONFLICT/TENSION
6. QUOTABLE ONE-LINERS
7. STORY PEAKS
8. PRACTICAL VALUE
"""


HIGHLIGHT_SYSTEM_PROMPT = """You are an elite short-form video editor.

Your task is to identify the most viral-worthy highlights from the transcript.

{virality_criteria}

Content type: {content_type}
Density: {density}

Rules:

- Find genuinely interesting moments from the transcript.
- Do NOT invent events.
- Do NOT invent quotes.
- Use the transcript timestamps.
- Never cut in the middle of a sentence when possible.
- Prefer complete stories, revelations, funny moments, emotional moments,
  controversial opinions and useful information.
- Ideal duration: 30 seconds (clips will be normalized to exactly 30 seconds).
- Do not return highlights longer than 90 seconds; they will be trimmed to 30 seconds.
- Focus the important moment near the center of the 30‑second window.
- Short clips are allowed when the moment is strong.
- Score each clip from 0-100 based on viral potential.
- hook_sentence must come from the transcript or closely reproduce the actual
  opening words of the selected segment.
- virality_reason must explain why the moment could perform well.
- Return at most {max_clips} highlights.

IMPORTANT:
If there are no good highlights, return an empty array.

Return ONLY valid JSON in exactly this structure:

{{"highlights":[{{"title":"string","start_time":0.0,"end_time":30.0,"score":90,"hook_sentence":"string","virality_reason":"string"}}]}}
"""


# IMPORTANT:
# Groq has a relatively small TPM limit on the current account.
# 300 seconds keeps each request comfortably smaller.
CHUNK_SIZE_SECONDS = 120

LONG_VIDEO_THRESHOLD = 1800

CHUNK_OVERLAP_SECONDS = 30

GPT_CALL_TIMEOUT_SECONDS = 300

MAX_HIGHLIGHT_API_ATTEMPTS = 3

# Minimum quality required for a clip to be generated.
# The model returns scores from 0-100.
# 9.3 means 93/100.
MIN_HIGHLIGHT_SCORE = 93


def call_muapi_llm(prompt: str) -> str:
    """Default MuAPI backend."""

    result = muapi.run(
        "gpt-5-mini",
        {"prompt": prompt},
        label="gpt-5-mini",
        timeout=GPT_CALL_TIMEOUT_SECONDS,
    )

    outputs = result.get("outputs")

    if (
        isinstance(outputs, list)
        and outputs
        and isinstance(outputs[0], str)
        and outputs[0].strip()
    ):
        return outputs[0]

    for key in ("output", "text", "response", "result", "content"):
        value = result.get(key)

        if isinstance(value, str) and value.strip():
            return value

        if isinstance(value, dict):
            inner = value.get("text") or value.get("content")

            if isinstance(inner, str) and inner.strip():
                return inner

        if isinstance(value, list):
            if value and isinstance(value[0], str):
                return value[0]

    raise RuntimeError(
        f"Could not extract LLM text from response: {result}"
    )


def _parse_json_loose(raw: str) -> Dict:
    """Parse normal JSON or JSON wrapped in markdown."""

    if not isinstance(raw, str):
        raise ValueError("LLM response is not a string")

    text = raw.strip()

    if not text:
        raise ValueError("LLM returned empty response")

    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")

        if start != -1 and end != -1 and end > start:
            return json.loads(text[start:end + 1])

        raise


def _coerce_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_int(value: object, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _sanitize_highlights(
    raw_highlights: object,
    duration: float,
) -> List[Dict]:
    """Normalize and validate model output."""

    if not isinstance(raw_highlights, list):
        return []

    max_end = duration if duration > 0 else float("inf")

    cleaned: List[Dict] = []

    for item in raw_highlights:

        if not isinstance(item, dict):
            continue

        start = _coerce_float(
            item.get("start_time"),
            default=-1.0,
        )

        end = _coerce_float(
            item.get("end_time"),
            default=-1.0,
        )

        if start < 0 or end <= start:
            continue

        if max_end != float("inf"):

            start = min(start, max_end)
            end = min(end, max_end)

            if end <= start:
                continue

        title = str(
            item.get("title")
            or "Untitled Highlight"
        ).strip()

        hook = str(
            item.get("hook_sentence")
            or ""
        ).strip()

        reason = str(
            item.get("virality_reason")
            or ""
        ).strip()

        score = _coerce_int(
            item.get("score"),
            default=0,
        )

        score = max(0, min(100, score))

        cleaned.append(
            {
                "title": title,
                "start_time": start,
                "end_time": end,
                "score": score,
                "hook_sentence": hook,
                "virality_reason": reason,
            }
        )

    return cleaned


def detect_content_type(
    transcript: Dict,
    llm_fn: LLMFn = call_muapi_llm,
) -> Dict[str, str]:

    segments = transcript.get("segments", [])

    sample = " ".join(
        str(s.get("text", ""))
        for s in segments[:25]
    )[:3000]

    prompt = (
        CONTENT_TYPE_PROMPT
        + "\n\nTranscript sample:\n"
        + sample
    )

    try:

        raw = llm_fn(prompt)

        result = _parse_json_loose(raw)

        return {
            "content_type": str(
                result.get("content_type", "other")
            ),
            "density": str(
                result.get("density", "medium")
            ),
        }

    except Exception:

        return {
            "content_type": "other",
            "density": "medium",
        }


def build_transcript_text(transcript: Dict) -> str:

    segments = transcript.get("segments", [])

    lines = []

    for s in segments:

        start = _coerce_float(
            s.get("start"),
            0.0,
        )

        text = str(
            s.get("text", "")
        ).strip()

        if text:
            lines.append(
                f"[{start:.1f}s] {text}"
            )

    return "\n".join(lines)


def chunk_transcript(
    transcript: Dict,
) -> List[Dict]:
    """Split transcript into chunks with relative timestamps."""

    segments = transcript.get("segments", [])

    if not segments:
        return []

    duration = _coerce_float(
        transcript.get("duration"),
        _coerce_float(
            segments[-1].get("end"),
            0.0,
        ),
    )

    chunks: List[Dict] = []

    start = 0.0

    while start < duration:

        end = min(
            start + CHUNK_SIZE_SECONDS,
            duration,
        )

        chunk_segments = []

        for segment in segments:

            seg_start = _coerce_float(
                segment.get("start"),
                0.0,
            )

            seg_end = _coerce_float(
                segment.get("end"),
                seg_start,
            )

            # Segment completely before chunk.
            if seg_end <= start:
                continue

            # Segment completely after chunk + overlap.
            if seg_start >= end + CHUNK_OVERLAP_SECONDS:
                continue

            relative_start = max(
                0.0,
                seg_start - start,
            )

            relative_end = min(
                end - start,
                seg_end - start,
            )

            if relative_end <= relative_start:
                continue

            new_segment = dict(segment)

            new_segment["start"] = relative_start
            new_segment["end"] = relative_end

            chunk_segments.append(new_segment)

        if chunk_segments:

            chunk = dict(transcript)

            chunk["segments"] = chunk_segments

            chunk["duration"] = end - start

            # Original video position.
            chunk["_offset"] = start

            chunks.append(chunk)

        if end >= duration:
            break

        start += (
            CHUNK_SIZE_SECONDS
            - CHUNK_OVERLAP_SECONDS
        )

    return chunks


def call_highlight_api(
    transcript_text: str,
    content_info: Dict,
    duration: float,
    num_clips: int,
    is_chunk: bool = False,
    llm_fn: LLMFn = call_muapi_llm,
) -> Dict:

    # For each 5-minute chunk, ask for a small number
    # of candidates. We will rank everything globally later.

    max_clips = 20

    system = HIGHLIGHT_SYSTEM_PROMPT.format(
        virality_criteria=VIRALITY_CRITERIA,
        content_type=content_info.get(
            "content_type",
            "other",
        ),
        density=content_info.get(
            "density",
            "medium",
        ),
        max_clips=max_clips,
    )

    base_prompt = (
        system
        + "\n\nTRANSCRIPT:\n"
        + transcript_text
    )

    prompt = base_prompt

    last_error = "unknown"

    for attempt in range(
        1,
        MAX_HIGHLIGHT_API_ATTEMPTS + 1,
    ):

        raw = llm_fn(prompt)

        try:

            parsed = _parse_json_loose(raw)

            highlights = _sanitize_highlights(
                parsed.get("highlights"),
                duration,
            )

            if highlights:
                return {
                    "highlights": highlights
                }

            # Empty result is valid JSON but not useful
            # for this pipeline. Retry with a stronger instruction.
            last_error = (
                "no valid highlights in response"
            )

        except Exception as error:

            last_error = str(error)

        if attempt < MAX_HIGHLIGHT_API_ATTEMPTS:

            print(
                f"[highlights] invalid model output "
                f"on attempt {attempt}/"
                f"{MAX_HIGHLIGHT_API_ATTEMPTS}; retrying",
                flush=True,
            )

            prompt = (
                base_prompt
                + "\n\n"
                + "IMPORTANT:\n"
                + "Return ONLY valid JSON.\n"
                + "The JSON MUST contain a top-level "
                + "'highlights' array.\n"
                + "Do not use markdown.\n"
                + "Do not explain anything.\n"
                + "Use timestamps that exist in the transcript."
            )

    raise RuntimeError(
        "Highlight generator produced invalid output "
        f"after {MAX_HIGHLIGHT_API_ATTEMPTS} attempts: "
        f"{last_error}"
    )


def dedupe_highlights(
    highlights: List[Dict],
) -> List[Dict]:
    """Remove heavily overlapping clips while keeping the best scores."""

    highlights = sorted(
        highlights,
        key=lambda item: float(
            item.get("score", 0)
        ),
        reverse=True,
    )

    kept: List[Dict] = []

    for highlight in highlights:

        try:
            start = float(
                highlight["start_time"]
            )

            end = float(
                highlight["end_time"]
            )

            score = float(
                highlight.get("score", 0)
            )

        except (TypeError, ValueError, KeyError):
            continue

        duration = end - start

        if duration <= 0:
            continue

        if score < MIN_HIGHLIGHT_SCORE:
            continue

        overlapping = False

        for existing in kept:

            existing_start = float(
                existing["start_time"]
            )

            existing_end = float(
                existing["end_time"]
            )

            latest_start = max(
                start,
                existing_start,
            )

            earliest_end = min(
                end,
                existing_end,
            )

            overlap = (
                earliest_end
                - latest_start
            )

            shorter_duration = min(
                duration,
                existing_end - existing_start,
            )

            if (
                overlap > 0
                and shorter_duration > 0
                and overlap / shorter_duration >= 0.50
            ):
                overlapping = True
                break

        if not overlapping:
            kept.append(highlight)

    return kept


def get_highlights(
    transcript: Dict,
    num_clips: int = 3,
    llm_fn: Optional[LLMFn] = None,
) -> Dict:

    llm_fn = llm_fn or call_muapi_llm

    duration = _coerce_float(
        transcript.get("duration"),
        0.0,
    )

    content_info = detect_content_type(
        transcript,
        llm_fn=llm_fn,
    )

    print(
        "[highlights] "
        f"content={content_info.get('content_type')} "
        f"density={content_info.get('density')} "
        f"duration={duration:.0f}s",
        flush=True,
    )

    # ---------------------------------------------------------
    # LONG VIDEO
    # ---------------------------------------------------------

    if duration >= LONG_VIDEO_THRESHOLD:

        chunks = chunk_transcript(
            transcript
        )

        print(
            "[highlights] long video — "
            f"splitting into {len(chunks)} chunks",
            flush=True,
        )

        all_highlights: List[Dict] = []

        for index, chunk in enumerate(chunks):

            offset = _coerce_float(
                chunk.get("_offset"),
                0.0,
            )

            text = build_transcript_text(
                chunk
            )

            print(
                "[highlights] "
                f"chunk {index + 1}/{len(chunks)} "
                f"(offset {offset:.0f}s)",
                flush=True,
            )

            try:

                result = call_highlight_api(
                    text,
                    content_info,
                    chunk["duration"],
                    num_clips=num_clips,
                    is_chunk=True,
                    llm_fn=llm_fn,
                )

            except RuntimeError as error:

                # IMPORTANT:
                # One bad chunk must NOT kill the entire video.
                print(
                    "[highlights] "
                    f"chunk {index + 1} skipped: "
                    f"{error}",
                    flush=True,
                )

                continue

            for highlight in result.get(
                "highlights",
                [],
            ):

                # Convert chunk-relative timestamps
                # back to original video timestamps.

                highlight["start_time"] = (
                    float(
                        highlight["start_time"]
                    )
                    + offset
                )

                highlight["end_time"] = (
                    float(
                        highlight["end_time"]
                    )
                    + offset
                )

                all_highlights.append(
                    highlight
                )

        highlights = dedupe_highlights(
            all_highlights
        )

    # ---------------------------------------------------------
    # SHORT VIDEO
    # ---------------------------------------------------------

    else:

        text = build_transcript_text(
            transcript
        )

        result = call_highlight_api(
            text,
            content_info,
            duration,
            num_clips=num_clips,
            is_chunk=False,
            llm_fn=llm_fn,
        )

        highlights = dedupe_highlights(
            result.get("highlights", [])
        )

    # Global ranking.

    highlights = sorted(
        highlights,
        key=lambda item: int(
            item.get("score", 0)
        ),
        reverse=True,
    )

    return {
        "highlights": highlights
    }
