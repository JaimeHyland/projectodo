"""Shared validation for CMS and band photographs."""
import io
import uuid
import warnings

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError


class ImageUploadError(ValueError):
    pass


def prepare_image(upload):
    if not upload or upload.size > 5 * 1024 * 1024:
        raise ImageUploadError("image_size")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(upload) as image:
                if (image.format not in ("JPEG", "PNG", "WEBP")
                        or image.width * image.height > 20000000):
                    raise ValueError("Unsupported image")
                image.load()
                output = io.BytesIO()
                ImageOps.exif_transpose(image).convert("RGB").save(
                    output, format="JPEG", quality=90
                )
    except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError,
            Image.DecompressionBombWarning) as error:
        raise ImageUploadError("image_format") from error
    return ContentFile(output.getvalue(), name=f"{uuid.uuid4().hex}.jpg")
