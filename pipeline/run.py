#!/usr/bin/env python3
"""
Entry point do pipeline de Cortes Youtube.

Recebe configuração via stdin (JSON), processa, e retorna resultado via stdout.
O Node.js (API) spawn esse script como subprocess.

Usage:
    echo '{"youtubeUrl":"...","agentId":"...","numClips":3}' | python run.py
"""
import sys
import json
import os

sys.path.insert(0, os.path.dirname(__file__))

from shorts_generator.pipeline import generate_shorts


def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    youtube_url = input_data.get("youtubeUrl", "")
    if not youtube_url:
        print(json.dumps({"error": "youtubeUrl is required"}))
        sys.exit(1)

    def progress_callback(status, progress, message=""):
        """Envia update de progresso via stdout (NDJSON)."""
        update = {
            "type": "progress",
            "status": status,
            "progress": progress,
            "message": message,
        }
        print(json.dumps(update), flush=True)

    try:
        result = generate_shorts(
            youtube_url=youtube_url,
            agent_id=input_data.get("agentId", ""),
            num_clips=input_data.get("numClips", 3),
            aspect_ratio=input_data.get("aspectRatio", "9:16"),
            language=input_data.get("language", "pt"),
            provider_id=input_data.get("providerId", ""),
            output_dir=input_data.get("outputDir", "output"),
            progress_callback=progress_callback,
        )

        output = {
            "type": "result",
            "videoInfo": result.get("video_info", {}),
            "clips": result.get("clips", []),
            "publishResults": result.get("publish_results", []),
            "errors": result.get("errors", []),
        }
        print(json.dumps(output, default=str))

    except Exception as e:
        error_output = {
            "type": "error",
            "error": str(e),
            "traceback": traceback.format_exc() if os.getenv("DEBUG") else "",
        }
        print(json.dumps(error_output))
        sys.exit(1)


if __name__ == "__main__":
    import traceback
    main()
