"""
Configuração do pipeline de Cortes Youtube.
Todas as variáveis vêm de environment variables.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# BeeHive API
BEEHIVE_API_URL = os.getenv("BEEHIVE_API_URL", "http://localhost:4000")

# Pipeline settings
LOCAL_OUTPUT_DIR = os.getenv("LOCAL_OUTPUT_DIR", "output")
LOCAL_WHISPER_MODEL = os.getenv("LOCAL_WHISPER_MODEL", "base")
LOCAL_WHISPER_DEVICE = os.getenv("LOCAL_WHISPER_DEVICE", "auto")
LOCAL_WHISPER_COMPUTE_TYPE = os.getenv("LOCAL_WHISPER_COMPUTE_TYPE", "int8")
LOCAL_WHISPER_VAD_FILTER = os.getenv("LOCAL_WHISPER_VAD_FILTER", "false").lower() == "true"

# LLM settings (via BeeHive provider)
DEFAULT_PROVIDER_ID = os.getenv("DEFAULT_PROVIDER_ID", "")

# Video settings
DEFAULT_NUM_CLIPS = int(os.getenv("DEFAULT_NUM_CLIPS", "3"))
DEFAULT_ASPECT_RATIO = os.getenv("DEFAULT_ASPECT_RATIO", "9:16")
DEFAULT_LANGUAGE = os.getenv("DEFAULT_LANGUAGE", "pt")

# YouTube download
YOUTUBE_FORMAT = os.getenv("YOUTUBE_FORMAT", "bestvideo[height<=720]+bestaudio/best[height<=720]")
YOUTUBE_CACHE_DIR = os.getenv("YOUTUBE_CACHE_DIR", os.path.join(LOCAL_OUTPUT_DIR, "cache"))
