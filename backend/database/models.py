from __future__ import annotations

import datetime as dt

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.database import Base


class GenerationRequest(Base):
    __tablename__ = "generation_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    source_filename: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    subtype: Mapped[str] = mapped_column(String)
    category_confidence: Mapped[float] = mapped_column(Float)
    subtype_confidence: Mapped[float] = mapped_column(Float)
    requested_expressions: Mapped[list] = mapped_column(JSON)
    lora_used: Mapped[str | None] = mapped_column(String, nullable=True)

    outputs: Mapped[list["GeneratedImage"]] = relationship(back_populates="request", cascade="all, delete-orphan")


class GeneratedImage(Base):
    __tablename__ = "generated_images"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    request_id: Mapped[str] = mapped_column(ForeignKey("generation_requests.id"))
    expression: Mapped[str] = mapped_column(String)
    file_path: Mapped[str] = mapped_column(String)
    seed: Mapped[int] = mapped_column(Float)
    passed_quality: Mapped[bool] = mapped_column(default=True)
    failure_reasons: Mapped[list] = mapped_column(JSON, default=list)

    request: Mapped["GenerationRequest"] = relationship(back_populates="outputs")
