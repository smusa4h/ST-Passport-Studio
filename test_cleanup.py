
import os
import time
import tempfile
from pathlib import Path

from cleanup_storage import (
    cleanup_old_files,
    protect_file
)


with tempfile.TemporaryDirectory() as temp_folder:

    test_folder = Path(temp_folder)

    # Create an old test file.
    old_file = test_folder / "protected_test.txt"
    old_file.write_text("This file is being used.")

    # Make the file 2 hours old.
    old_time = time.time() - (2 * 60 * 60)
    os.utime(old_file, (old_time, old_time))

    # Protect the file while cleanup runs.
    with protect_file(old_file):

        result = cleanup_old_files(
            folders=[test_folder],
            retention_hours=1
        )

        print("Cleanup while protected:", result)
        print("File still exists:", old_file.exists())

        assert old_file.exists() is True
        assert result["deleted"] == 0

    # Run cleanup again after releasing protection.
    result = cleanup_old_files(
        folders=[test_folder],
        retention_hours=1
    )

    print("Cleanup after protection:", result)
    print("File still exists:", old_file.exists())

    assert old_file.exists() is False
    assert result["deleted"] == 1

    print("\nSUCCESS: File protection test passed!")
