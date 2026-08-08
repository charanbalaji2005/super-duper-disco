from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.models import GeneratedImage, GenerationRequest
from backend.pipelines.expression_pipeline import PipelineOutput
from backend.utils.helpers import new_id


async def save_generation_request(
    db: AsyncSession,
    source_filename: str,
    expressions: list[str],
    output: PipelineOutput,
    lora_used: str | None = None,
) -> GenerationRequest:
    record = GenerationRequest(
        id=output.request_id,
        source_filename=source_filename,
        category=output.classification.category,
        subtype=output.classification.subtype,
        category_confidence=output.classification.category_confidence,
        subtype_confidence=output.classification.subtype_confidence,
        requested_expressions=expressions,
        lora_used=lora_used,
    )
    for result, report in output.generations:
        record.outputs.append(
            GeneratedImage(
                id=new_id("img"),
                request_id=output.request_id,
                expression=result.expression,
                file_path=str(output.output_paths[result.expression]),
                seed=result.seed,
                passed_quality=report.passed,
                failure_reasons=report.failure_reasons,
            )
        )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def get_history(db: AsyncSession, limit: int = 50) -> list[GenerationRequest]:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    stmt = (
        select(GenerationRequest)
        .options(selectinload(GenerationRequest.outputs))
        .order_by(GenerationRequest.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
