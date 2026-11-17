
from pathlib import Path
from io import BytesIO
import math

from PIL import Image, UnidentifiedImageError

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


MAX_TOTAL_COPIES = 2000
MAX_IMAGE_PIXELS = 36_000_000
PDF_IMAGE_DPI = 300


def prepare_pdf_image(image_path, photo_width_mm, photo_height_mm):
    """Prepare a memory-efficient image for PDF generation."""

    target_width = max(
        1, round(photo_width_mm / 25.4 * PDF_IMAGE_DPI)
    )
    target_height = max(
        1, round(photo_height_mm / 25.4 * PDF_IMAGE_DPI)
    )

    with Image.open(image_path) as original:
        if original.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("Unsupported photo format.")

        original.load()

        image = original.convert("RGB")

        image.thumbnail(
            (target_width, target_height),
            Image.Resampling.LANCZOS
        )

        canvas_image = Image.new(
            "RGB",
            (target_width, target_height),
            "white"
        )

        x = (target_width - image.width) // 2
        y = (target_height - image.height) // 2

        canvas_image.paste(image, (x, y))

        buffer = BytesIO()

        canvas_image.save(
            buffer,
            format="JPEG",
            quality=90,
            optimize=True
        )

        buffer.seek(0)

        return buffer


def generate_passport_pdf(
    photo_items,
    output_path,
    photo_width_mm=30,
    photo_height_mm=40
):
    """Generate an A4 passport photo PDF with automatic layout."""

    if not isinstance(photo_items, list) or not photo_items:
        raise ValueError("No photos were provided.")

    try:
        photo_width_mm = float(photo_width_mm)
        photo_height_mm = float(photo_height_mm)
    except (TypeError, ValueError):
        raise ValueError("Invalid photo dimensions.")

    if not all(map(math.isfinite, [
        photo_width_mm, photo_height_mm
    ])):
        raise ValueError("Invalid photo dimensions.")

    if not (
        10 <= photo_width_mm <= 100
        and 10 <= photo_height_mm <= 100
    ):
        raise ValueError("Photo dimensions must be between 10 and 100 mm.")

    validated_items = []
    total_copies = 0

    for item in photo_items:
        image_path = Path(item["path"])
        copies = int(item.get("copies", 1))

        if copies < 1 or copies > 999:
            raise ValueError("Invalid number of photo copies.")

        total_copies += copies

        if total_copies > MAX_TOTAL_COPIES:
            raise ValueError(
                f"A PDF can contain a maximum of {MAX_TOTAL_COPIES} photos."
            )

        if not image_path.is_file():
            raise FileNotFoundError("One of the photos was not found.")

        try:
            with Image.open(image_path) as image:
                if image.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ValueError("Unsupported photo format.")

                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise ValueError("Photo resolution is too large.")

                image.verify()

        except (UnidentifiedImageError, OSError):
            raise ValueError("One of the photos is damaged or invalid.")

        validated_items.append((image_path, copies))

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    page_width, page_height = A4

    margin = 10 * mm
    gap = 2 * mm

    photo_width = photo_width_mm * mm
    photo_height = photo_height_mm * mm

    available_width = page_width - 2 * margin
    available_height = page_height - 2 * margin

    columns = int(
        (available_width + gap) // (photo_width + gap)
    )

    rows = int(
        (available_height + gap) // (photo_height + gap)
    )

    if columns < 1 or rows < 1:
        raise ValueError("Selected photo size is too large for A4.")

    photos_per_page = columns * rows

    pdf = canvas.Canvas(str(output_path), pagesize=A4)

    try:
        photo_index = 0

        for image_path, copies in validated_items:

            with prepare_pdf_image(
                image_path,
                photo_width_mm,
                photo_height_mm
            ) as image_buffer:

                image_reader = ImageReader(image_buffer)

                for _ in range(copies):

                    position = photo_index % photos_per_page

                    if photo_index > 0 and position == 0:
                        pdf.showPage()

                    row = position // columns
                    column = position % columns

                    x = margin + column * (photo_width + gap)

                    y = (
                        page_height
                        - margin
                        - photo_height
                        - row * (photo_height + gap)
                    )

                    pdf.drawImage(
                        image_reader,
                        x,
                        y,
                        width=photo_width,
                        height=photo_height,
                        preserveAspectRatio=True,
                        anchor="c"
                    )

                    photo_index += 1

        pdf.save()

    except Exception:
        output_path.unlink(missing_ok=True)
        raise

    return {
        "success": True,
        "output_path": str(output_path),
        "total_photos": total_copies,
        "total_pages": math.ceil(total_copies / photos_per_page),
        "columns": columns,
        "rows": rows
    }
