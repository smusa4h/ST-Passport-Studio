
import time
import hashlib
import logging
from pathlib import Path
from contextlib import contextmanager
from threading import Lock

from filelock import FileLock, Timeout


_file_locks = {}
_thread_locks = {}
_locks_guard = Lock()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LOCK_FOLDER = Path(__file__).resolve().parent / ".file_locks"


def get_thread_lock(file_path):
    """Get a thread lock for a specific file."""

    key = str(Path(file_path).resolve())

    with _locks_guard:
        if key not in _thread_locks:
            _thread_locks[key] = Lock()

        return _thread_locks[key]


def get_file_lock(file_path):
    """Get a cross-process lock for a specific file."""

    key = str(Path(file_path).resolve())

    with _locks_guard:
        if key not in _file_locks:
            LOCK_FOLDER.mkdir(
                parents=True,
                exist_ok=True
            )

            lock_name = hashlib.sha256(
                key.encode("utf-8")
            ).hexdigest() + ".lock"

            lock_path = LOCK_FOLDER / lock_name

            _file_locks[key] = FileLock(str(lock_path))

        return _file_locks[key]


@contextmanager
def protect_file(file_path):
    """Protect a file across threads and processes."""

    thread_lock = get_thread_lock(file_path)
    file_lock = get_file_lock(file_path)

    logger.info(
        "[LOCK DEBUG] Waiting for thread lock: %s",
        file_path
    )

    with thread_lock:

        logger.info(
            "[LOCK DEBUG] Thread lock acquired: %s",
            file_path
        )

        logger.info(
            "[LOCK DEBUG] Waiting for file lock: %s",
            file_path
        )

        with file_lock:

            logger.info(
                "[LOCK DEBUG] File lock acquired: %s",
                file_path
            )

            try:
                yield

            finally:
                logger.info(
                    "[LOCK DEBUG] Releasing file protection: %s",
                    file_path
                )


def cleanup_old_files(
    folders,
    retention_hours=24,
    protected_files=None
):
    """Delete files older than the configured retention period."""

    cutoff_time = time.time() - (
        retention_hours * 60 * 60
    )

    protected_files = {
        Path(file).resolve()
        for file in (protected_files or [])
    }

    deleted_count = 0
    failed_count = 0

    for folder in folders:
        folder = Path(folder)

        if not folder.exists() or not folder.is_dir():
            continue

        for file_path in folder.iterdir():

            if file_path.is_symlink() or not file_path.is_file():
                continue

            if file_path.resolve() in protected_files:
                continue

            thread_lock = get_thread_lock(file_path)
            file_lock = get_file_lock(file_path)

            if not thread_lock.acquire(blocking=False):
                continue

            try:
                try:
                    file_lock.acquire(timeout=0)

                except Timeout:
                    continue

                try:
                    if file_path.stat().st_mtime < cutoff_time:
                        file_path.unlink()
                        deleted_count += 1

                except OSError:
                    failed_count += 1

                finally:
                    file_lock.release()

            finally:
                thread_lock.release()

    return {
        "deleted": deleted_count,
        "failed": failed_count
    }
