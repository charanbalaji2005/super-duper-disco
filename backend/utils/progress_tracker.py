from pydantic import BaseModel

class ProgressState(BaseModel):
    request_id: str
    status: str
    progress_percent: int
    current_step: int
    total_steps: int
    current_expression: str
    total_expressions: int


_progress_store: dict[str, ProgressState] = {}
_cancelled_requests: set[str] = set()

def set_progress(request_id: str, state: ProgressState):
    _progress_store[request_id] = state

def update_progress_percent(request_id: str, percent: int, current_step: int, total_steps: int, current_expression: str, total_expressions: int):
    _progress_store[request_id] = ProgressState(
        request_id=request_id,
        status="running",
        progress_percent=percent,
        current_step=current_step,
        total_steps=total_steps,
        current_expression=current_expression,
        total_expressions=total_expressions,
    )

def get_progress(request_id: str) -> ProgressState | None:
    return _progress_store.get(request_id)

def cancel_request(request_id: str):
    _cancelled_requests.add(request_id)
    if request_id in _progress_store:
        state = _progress_store[request_id]
        _progress_store[request_id] = ProgressState(
            request_id=request_id,
            status="failed",
            progress_percent=state.progress_percent,
            current_step=state.current_step,
            total_steps=state.total_steps,
            current_expression=state.current_expression,
            total_expressions=state.total_expressions,
        )

def is_cancelled(request_id: str) -> bool:
    return request_id in _cancelled_requests
