
from pathlib import Path

from PIL import Image
from rembg import remove, new_session


# Load the AI background removal model once.
_background_session = None


def get_background_session():
    global _background_session

    if _background_session is None:
        _background_session = new_session("isnet-general-use")

    return _background_session


def remove_background(input_path, output_path):
    """
    Remove the background from a photo
    and save the result as a transparent PNG.
    """

    input_path = Path(input_path)
    output_path = Path(output_path)

    if not input_path.is_file():
        raise FileNotFoundError("Input photo was not found.")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(input_path) as image:
        image = image.convert("RGBA")

        result = remove(
            image,
            session=get_background_session()
        )

        result.save(output_path, format="PNG")

    return output_path


def change_background(input_path, output_path, background_color):
    """
    Replace a transparent photo background
    with a selected solid colour.
    """

    input_path = Path(input_path)
    output_path = Path(output_path)

    allowed_colors = {
        "white": (255, 255, 255),
        "blue": (0, 102, 204),
        "red": (220, 20, 60)
    }

    color_key = background_color.lower()

    if color_key not in allowed_colors:
        raise ValueError("Unsupported background colour.")

    if not input_path.is_file():
        raise FileNotFoundError("Processed photo was not found.")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(input_path) as image:
        foreground = image.convert("RGBA")

        background = Image.new(
            "RGBA",
            foreground.size,
            (*allowed_colors[color_key], 255)
        )

        final_image = Image.alpha_composite(
            background,
            foreground
        )

        final_image.convert("RGB").save(
            output_path,
            format="JPEG",
            quality=95
        )

    return output_path
