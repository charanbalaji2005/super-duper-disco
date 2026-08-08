from pathlib import Path

from backend.config import get_app_config
from backend.services.img2img_generator import ALL_EXPRESSIONS, Img2ImgGenerator


def test_all_expressions_constant_has_seven():
    assert len(ALL_EXPRESSIONS) == 7
    assert set(ALL_EXPRESSIONS) == {
        "happy",
        "sad",
        "angry",
        "surprise",
        "fear",
        "disgust",
        "neutral",
    }


def test_lora_training_config_present():
    cfg = get_app_config().get("lora_training", {})
    assert cfg.get("rank")
    assert cfg.get("base_model")


def test_list_available_loras_empty_when_no_weights(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "models" / "loras").mkdir(parents=True)
    generator = Img2ImgGenerator()
    assert generator.list_available_loras() == []


def test_list_available_loras_finds_trained_adapter(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    lora_dir = tmp_path / "models" / "loras" / "my-lora"
    lora_dir.mkdir(parents=True)
    (lora_dir / "pytorch_lora_weights.safetensors").touch()

    generator = Img2ImgGenerator()
    assert generator.list_available_loras() == ["my-lora"]


def test_set_lora_none_is_a_noop_before_pipeline_loaded():
    # set_lora(None) on a generator with no pipeline loaded yet would trigger
    # a full SD1.5 load attempt; this test just documents that calling
    # set_lora(None, ...) when nothing is loaded should not raise due to the
    # "already == None" short-circuit, without needing real SD weights.
    generator = Img2ImgGenerator()
    generator._loaded_lora_name = None
    # No pipeline load should be triggered since lora_name matches current state.
    generator.set_lora(None)
    assert generator._loaded_lora_name is None
