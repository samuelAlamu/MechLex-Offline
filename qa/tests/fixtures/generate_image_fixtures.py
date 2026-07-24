from __future__ import annotations

import base64
import json
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SIZES_MB = (1, 3, 5, 8, 10, 15)

# Valid 1x1 RGBA PNG. A standards-compliant tEXt chunk is inserted before IEND
# so each fixture has the exact requested byte size without changing the pixels.
BASE_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAF"
    "/gL+X8pVAAAAAElFTkSuQmCC"
)


def chunk(chunk_type: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + chunk_type
        + payload
        + struct.pack(">I", zlib.crc32(chunk_type + payload) & 0xFFFFFFFF)
    )


def exact_png(target_bytes: int) -> bytes:
    iend_offset = BASE_PNG.rfind(b"\x00\x00\x00\x00IEND")
    if iend_offset < 0:
        raise RuntimeError("Base PNG does not contain IEND")
    prefix = BASE_PNG[:iend_offset]
    iend = BASE_PNG[iend_offset:]
    payload_size = target_bytes - len(prefix) - len(iend) - 12
    if payload_size < 8:
        raise ValueError("Target size is too small")
    payload = b"MechLex\x00" + (b"Q" * (payload_size - 8))
    result = prefix + chunk(b"tEXt", payload) + iend
    if len(result) != target_bytes:
        raise AssertionError((len(result), target_bytes))
    return result


manifest = []
for size_mb in SIZES_MB:
    target = size_mb * 1024 * 1024
    path = ROOT / f"mechlex-qa-{size_mb}mb.png"
    path.write_bytes(exact_png(target))
    manifest.append({"file": path.name, "bytes": path.stat().st_size, "format": "PNG", "valid": True})

corrupt = ROOT / "mechlex-qa-corrupt.png"
corrupt.write_bytes(b"\x89PNG\r\n\x1a\ncorrupt-and-truncated")
manifest.append({"file": corrupt.name, "bytes": corrupt.stat().st_size, "format": "PNG", "valid": False})

(ROOT / "image-fixtures.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(json.dumps(manifest, ensure_ascii=False))
