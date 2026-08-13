from backend.services.prompt_builder import build_prompt


def test_prompt_includes_expression_and_subject_framing():
    prompt = build_prompt("happy", "human")
    assert "smile" in prompt.lower() or "happy" in prompt.lower()
    assert "person" in prompt.lower()


def test_prompt_switches_framing_for_animal():
    prompt = build_prompt("angry", "animal")
    assert "animal" in prompt.lower()


def test_gender_does_not_affect_prompt():


    human_prompt = build_prompt("neutral", "human")
    assert "male" not in human_prompt.lower() and "female" not in human_prompt.lower()
