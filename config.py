
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")

    if not SECRET_KEY:
        raise RuntimeError(
        "SECRET_KEY environment variable is not configured."
    )

    MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25 MB

    UPLOAD_FOLDER = BASE_DIR / "uploads"
    OUTPUT_FOLDER = BASE_DIR / "outputs"

    ALLOWED_EXTENSIONS = {
        "jpg",
        "jpeg",
        "png",
        "webp"
    }

    ALLOWED_IMAGE_FORMATS = {
        "JPEG",
        "PNG",
        "WEBP"
    }

    MAX_IMAGE_WIDTH = 6000
    MAX_IMAGE_HEIGHT = 6000

    MAX_PHOTOS_PER_UPLOAD = 20
    MAX_COPIES_PER_PHOTO = 999
    MAX_TOTAL_PDF_COPIES = 2000

    # Automatic File Cleanup Settings
    FILE_RETENTION_HOURS = 24
    CLEANUP_INTERVAL_SECONDS = 3600  # Run cleanup every 1 hour