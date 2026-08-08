import numpy as np

from backend.services.classifier_service import ClassifierService


def test_heuristic_classifier_routes_human_by_default():
    service = ClassifierService()
    fake_crop = np.zeros((512, 512, 3), dtype=np.uint8)
    result = service.classify(fake_crop, has_animal_face_landmarks=False)
    assert result.category == "human"


def test_heuristic_classifier_routes_animal_on_hint():
    service = ClassifierService()
    fake_crop = np.zeros((512, 512, 3), dtype=np.uint8)
    result = service.classify(fake_crop, has_animal_face_landmarks=True)
    assert result.category == "animal"
