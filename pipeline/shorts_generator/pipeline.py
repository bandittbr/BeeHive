"""
Pipeline principal — orquestra todo o fluxo:
download → transcribe → analyze → crop → subtitles → metadata → publish
"""
import os
import json
import traceback
from .config import LOCAL_OUTPUT_DIR, DEFAULT_NUM_CLIPS, DEFAULT_ASPECT_RATIO, DEFAULT_LANGUAGE, DEFAULT_PROVIDER_ID
from .downloader import download_video
from .transcriber import transcribe_video
from .highlights import identify_highlights
from .clipper import crop_clip, add_subtitles, generate_thumbnail
from .subtitles import generate_srt, clip_segments
from .metadata import generate_metadata
from .publisher import Publisher


def generate_shorts(
    youtube_url: str,
    agent_id: str = "",
    num_clips: int = DEFAULT_NUM_CLIPS,
    aspect_ratio: str = DEFAULT_ASPECT_RATIO,
    language: str = DEFAULT_LANGUAGE,
    provider_id: str = DEFAULT_PROVIDER_ID,
    model: str = "",
    output_dir: str = LOCAL_OUTPUT_DIR,
    progress_callback=None,
) -> dict:
    """
    Pipeline completo de geração de shorts.

    Args:
        youtube_url: URL do vídeo no YouTube
        agent_id: ID do agent (pra publicação)
        num_clips: número de clipes pra gerar
        aspect_ratio: ratio do output (9:16 padrão)
        language: idioma da transcrição
        provider_id: provider LLM pra usar
        output_dir: diretório de saída
        progress_callback: callback(status, progress, message) pra updates

    Returns:
        {
            "video_info": {...},
            "transcript": {...},
            "clips": [{"path": str, "title": str, ...}],
            "publish_results": [...],
            "errors": [...]
        }
    """
    os.makedirs(output_dir, exist_ok=True)
    errors = []
    result = {
        "video_info": {},
        "transcript": {},
        "highlights": [],
        "clips": [],
        "publish_results": [],
        "errors": [],
    }

    def report(status, progress, message=""):
        if progress_callback:
            progress_callback(status, progress, message)

    # STEP 1: Download
    report("downloading", 10, "Baixando vídeo...")
    try:
        video_info = download_video(youtube_url, output_dir)
        result["video_info"] = video_info
        report("downloading", 20, f"Vídeo baixado: {video_info['title']}")
    except Exception as e:
        error_msg = f"Erro no download: {e}"
        errors.append(error_msg)
        result["errors"].append(error_msg)
        report("error", 0, error_msg)
        return result

    # STEP 2: Transcribe
    report("transcribing", 25, "Transcrevendo áudio...")
    try:
        transcript = transcribe_video(video_info["path"], language)
        result["transcript"] = transcript
        report("transcribing", 40, f"Transcrição: {len(transcript['segments'])} segmentos")
    except Exception as e:
        error_msg = f"Erro na transcrição: {e}\n{traceback.format_exc()}"
        errors.append(error_msg)
        result["errors"].append(error_msg)
        report("error", 0, error_msg)
        return result

    # STEP 3: Identify Highlights
    report("analyzing", 45, "IA analisando melhores momentos...")
    try:
        highlights = identify_highlights(
            transcript,
            num_clips=num_clips,
            provider_id=provider_id,
            model=model,
        )
        result["highlights"] = highlights
        report("analyzing", 60, f"{len(highlights)} cortes identificados")
    except Exception as e:
        error_msg = f"Erro na análise: {e}\n{traceback.format_exc()}"
        errors.append(error_msg)
        result["errors"].append(error_msg)
        report("error", 0, error_msg)
        return result

    # Fallback: vídeo sem falas detectadas ou sem highlights -> recorta
    # trechos do próprio vídeo para não entregar zero clips.
    if not result["highlights"] and video_info.get("duration"):
        dur = float(video_info["duration"]) or 0
        if dur > 0:
            seg = min(dur, 45)
            result["highlights"] = [{
                "title": str(video_info.get("title", "Clip"))[:60],
                "start_time": 0.0,
                "end_time": seg,
                "score": 50,
                "hook_sentence": "",
                "virality_reason": "Recorte automático (sem falas detectadas)",
            }]
            report("analyzing", 60, "Usando recorte automático de fallback")

    # STEP 4: Generate clips
    video_title = video_info.get("title", "")
    agent_dir = os.path.join(output_dir, agent_id or "default")
    os.makedirs(agent_dir, exist_ok=True)

    for i, highlight in enumerate(highlights):
        progress = 60 + int((i / max(len(highlights), 1)) * 25)
        report("cropping", progress, f"Gerando clip {i+1}/{len(highlights)}...")

        try:
            clip_filename = f"short_{i+1:02d}.mp4"
            clip_path = os.path.join(agent_dir, clip_filename)

            crop_clip(
                video_info["path"],
                highlight["start_time"],
                highlight["end_time"],
                clip_path,
                aspect_ratio,
            )

            clip_segments_list = clip_segments(
                transcript["segments"],
                highlight["start_time"],
                highlight["end_time"],
            )

            srt_path = clip_path.replace(".mp4", ".srt")
            generate_srt(clip_segments_list, srt_path)

            subbed_path = clip_path.replace(".mp4", "_subbed.mp4")
            try:
                add_subtitles(clip_path, srt_path, subbed_path)
                final_path = subbed_path
            except Exception:
                final_path = clip_path

            thumb_path = clip_path.replace(".mp4", "_thumb.jpg")
            try:
                generate_thumbnail(
                    video_info["path"],
                    (highlight["start_time"] + highlight["end_time"]) / 2,
                    thumb_path,
                )
            except Exception:
                thumb_path = ""

            meta = generate_metadata(
                hook_sentence=highlight.get("hook_sentence", ""),
                virality_reason=highlight.get("virality_reason", ""),
                video_title=video_title,
                language=language,
                provider_id=provider_id,
                model=model,
            )

            clip_data = {
                "id": f"clip_{i+1}",
                "path": final_path,
                "original_path": clip_path,
                "subtitle_path": srt_path,
                "thumbnail_path": thumb_path,
                "title": meta["title"],
                "description": meta["description"],
                "hashtags": meta["hashtags"],
                "start_time": highlight["start_time"],
                "end_time": highlight["end_time"],
                "duration": highlight["end_time"] - highlight["start_time"],
                "score": highlight.get("score", 50),
                "hook_sentence": highlight.get("hook_sentence", ""),
                "virality_reason": highlight.get("virality_reason", ""),
            }
            result["clips"].append(clip_data)

        except Exception as e:
            error_msg = f"Erro no clip {i+1}: {e}"
            errors.append(error_msg)
            result["errors"].append(error_msg)

    # STEP 5: Publish
    if agent_id and result["clips"]:
        report("publishing", 90, "Publicando clips...")
        try:
            publisher = Publisher(agent_id)
            for clip_data in result["clips"]:
                pub_results = publisher.publish_all({
                    "clip_path": clip_data["path"],
                    "clip_url": clip_data.get("clip_url", ""),
                    "title": clip_data["title"],
                    "description": clip_data["description"],
                    "hashtags": clip_data["hashtags"],
                    "clip_id": clip_data["id"],
                })
                clip_data["publish_results"] = pub_results
                result["publish_results"].extend(pub_results)
        except Exception as e:
            error_msg = f"Erro na publicação: {e}"
            errors.append(error_msg)
            result["errors"].append(error_msg)

    report("done", 100, f"Concluído! {len(result['clips'])} clipes gerados.")
    return result
