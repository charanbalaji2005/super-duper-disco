from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import align, classify, detect, download, generate, history, lora, quality, upload
from backend.database.database import init_db
from backend.utils.logger import logger
from fastapi import Request
from fastapi.responses import JSONResponse



@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Synthetic Facial Expression Generator API...")
    await init_db()
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Synthetic Facial Expression Generator",
    description=(
        "Identity-preserving synthetic facial expression generation using "
        "Stable Diffusion 1.5 img2img. Supports human and animal subjects."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(classify.router)
app.include_router(detect.router)
app.include_router(align.router)
app.include_router(generate.router)
app.include_router(quality.router)
app.include_router(download.router)
app.include_router(history.router)
app.include_router(lora.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error occurred:")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
