import io
import json
import pathlib
import sys

from PIL import Image


TARGET_BYTES = 15_728_640


def pad_image(format_name: str, extension: str, output_dir: pathlib.Path) -> dict:
    image = Image.new("RGB", (2, 2), (41, 105, 134))
    buffer = io.BytesIO()
    save_options = {"quality": 90} if format_name == "JPEG" else {}
    image.save(buffer, format=format_name, **save_options)
    payload = bytearray(buffer.getvalue())

    if format_name == "WEBP":
        remaining = TARGET_BYTES - len(payload)
        if remaining < 8 or remaining % 2:
            raise RuntimeError(f"Cannot create exact WebP padding: base={len(payload)} remaining={remaining}")
        chunk_size = remaining - 8
        payload.extend(b"QA00")
        payload.extend(chunk_size.to_bytes(4, "little"))
        payload.extend(b"\0" * chunk_size)
        payload[4:8] = (TARGET_BYTES - 8).to_bytes(4, "little")
    else:
        payload.extend(b"\0" * (TARGET_BYTES - len(payload)))

    output_path = output_dir / f"exact-15mib.{extension}"
    output_path.write_bytes(payload)

    with Image.open(output_path) as verification:
        verification.load()
        verified_format = verification.format
        dimensions = list(verification.size)

    return {
        "format": format_name,
        "verifiedFormat": verified_format,
        "dimensions": dimensions,
        "path": str(output_path),
        "bytes": output_path.stat().st_size,
    }


def main() -> None:
    output_dir = pathlib.Path(sys.argv[1]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    results = [
        pad_image("PNG", "png", output_dir),
        pad_image("JPEG", "jpg", output_dir),
        pad_image("WEBP", "webp", output_dir),
    ]
    print(json.dumps(results, ensure_ascii=False))


if __name__ == "__main__":
    main()
