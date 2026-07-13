"""
Geração de metadata (título, descrição, hashtags) via LLM.
"""
import json
import re
from .highlights import call_beehive_llm


METADATA_PROMPT = """You are a social media expert specializing in short-form video content.

Given a video clip's hook sentence, virality reason, and context, generate:

1. **Title**: Catchy, clickbait-worthy title (max 60 chars). Use emojis if appropriate.
2. **Description**: Engaging description with a strong CTA (max 200 chars).
3. **Hashtags**: 8-15 relevant hashtags for maximum reach (mix of broad and niche).

Context:
- Video title: {video_title}
- Clip hook: {hook_sentence}
- Virality reason: {virality_reason}
- Platform: {platform}
- Language: {language}

Return ONLY valid JSON (no markdown fences):
{{
  "title": "...",
  "description": "...",
  "hashtags": ["tag1", "tag2", ...]
}}"""


def generate_metadata(
    hook_sentence: str,
    virality_reason: str,
    video_title: str = "",
    platform: str = "youtube",
    language: str = "pt",
    provider_id: str = "",
) -> dict:
    """
    Gera título, descrição e hashtags pra um clip.

    Returns:
        {"title": str, "description": str, "hashtags": [str]}
    """
    prompt = METADATA_PROMPT.format(
        video_title=video_title or "Unknown",
        hook_sentence=hook_sentence or "N/A",
        virality_reason=virality_reason or "N/A",
        platform=platform,
        language=language,
    )

    try:
        result = call_beehive_llm(prompt, provider_id)
        parsed = _parse_json_loose(result)

        if isinstance(parsed, dict):
            return {
                "title": str(parsed.get("title", ""))[:60],
                "description": str(parsed.get("description", ""))[:200],
                "hashtags": _clean_hashtags(parsed.get("hashtags", [])),
            }
    except Exception:
        pass

    return _fallback_metadata(hook_sentence, video_title)


def _clean_hashtags(tags: list) -> list:
    """Limpa e normaliza hashtags."""
    cleaned = []
    for tag in tags:
        t = str(tag).strip().lstrip("#").replace(" ", "")
        if t and len(t) < 30:
            cleaned.append(t.lower())
    return cleaned[:15]


def _fallback_metadata(hook: str, video_title: str) -> dict:
    """Metadata de fallback quando LLM falha."""
    words = (hook or video_title or "vídeo").split()[:5]
    title = " ".join(words)[:60]

    return {
        "title": title,
        "description": f"{title} 🔥 Assista ao completo!",
        "hashtags": ["shorts", "viral", "trending", "fyp", "for you"],
    }


def _parse_json_loose(text: str) -> any:
    """Parse JSON tolerante."""
    text = text.strip()

    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    obj_start = text.find("{")
    obj_end = text.rfind("}")
    if obj_start != -1 and obj_end > obj_start:
        try:
            return json.loads(text[obj_start:obj_end + 1])
        except json.JSONDecodeError:
            pass

    return None
