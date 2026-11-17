
import logging

from config import Config
from cleanup_storage import cleanup_old_files


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)


def main():
    folders = [
        Config.UPLOAD_FOLDER,
        Config.OUTPUT_FOLDER
    ]

    result = cleanup_old_files(
        folders=folders,
        retention_hours=Config.FILE_RETENTION_HOURS
    )

    logging.info(
        "Cleanup completed: %s files deleted, %s failed.",
        result["deleted"],
        result["failed"]
    )


if __name__ == "__main__":
    main()
