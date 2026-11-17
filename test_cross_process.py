import os
import time
import tempfile
import multiprocessing
from pathlib import Path

from cleanup_storage import (
    cleanup_old_files,
    protect_file
)


def hold_file(file_path, ready_event):
    """Hold a file lock in a separate process."""

    with protect_file(file_path):
        print("Child process: File is protected.")
        ready_event.set()

        time.sleep(5)

    print("Child process: Protection released.")


def main():
    with tempfile.TemporaryDirectory() as temp_folder:

        test_folder = Path(temp_folder)

        old_file = test_folder / "cross_process_test.txt"
        old_file.write_text("Cross-process protection test.")

        old_time = time.time() - (2 * 60 * 60)
        os.utime(old_file, (old_time, old_time))

        ready_event = multiprocessing.Event()

        process = multiprocessing.Process(
            target=hold_file,
            args=(old_file, ready_event)
        )

        process.start()

        ready_event.wait()

        result = cleanup_old_files(
            folders=[test_folder],
            retention_hours=1
        )

        print("Cleanup while child process holds lock:", result)
        print("File still exists:", old_file.exists())

        assert old_file.exists() is True
        assert result["deleted"] == 0

        process.join()

        result = cleanup_old_files(
            folders=[test_folder],
            retention_hours=1
        )

        print("Cleanup after child process releases lock:", result)
        print("File still exists:", old_file.exists())

        assert old_file.exists() is False
        assert result["deleted"] == 1

        print("\nSUCCESS: Cross-process protection test passed!")


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()