import numpy as np

from backend.preprocessing.align_face import align_by_eyes


def test_align_by_eyes_returns_expected_size():
    img = np.random.randint(0, 255, (400, 400, 3), dtype=np.uint8)
    aligned = align_by_eyes(img, left_eye=(150, 180), right_eye=(250, 180), target_size=512)
    assert aligned.shape == (512, 512, 3)
