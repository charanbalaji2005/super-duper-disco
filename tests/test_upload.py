import io

from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def _fake_png_bytes() -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (64, 64), color=(120, 120, 120)).save(buf, format="PNG")
    return buf.getvalue()


def test_upload_rejects_bad_content_type():
    resp = client.post("/api/upload", files={"file": ("test.txt", b"not an image", "text/plain")})
    assert resp.status_code == 400


def test_upload_accepts_valid_png():
    resp = client.post("/api/upload", files={"file": ("test.png", _fake_png_bytes(), "image/png")})
    assert resp.status_code == 200
    body = resp.json()
    assert "upload_id" in body
    assert body["size_bytes"] > 0
