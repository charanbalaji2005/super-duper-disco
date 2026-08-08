import numpy as np

from backend.utils.image_utils import laplacian_blur_variance


def test_blur_variance_is_higher_for_sharp_image():
    sharp = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
    import cv2

    blurry = cv2.GaussianBlur(sharp, (15, 15), 0)
    assert laplacian_blur_variance(sharp) > laplacian_blur_variance(blurry)
