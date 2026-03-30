from fastapi import APIRouter, HTTPException, status

from app.models import ImproveRequest, ImproveResponse
from app.services.mistral_service import (
    MistralConfigurationError,
    MistralServiceError,
    improve_prompt,
)


router = APIRouter()


@router.post("/improve", response_model=ImproveResponse, status_code=status.HTTP_200_OK)
async def improve(request: ImproveRequest) -> ImproveResponse:
    try:
        improved_prompt = await improve_prompt(request.prompt)
    except MistralConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except MistralServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return ImproveResponse(improved_prompt=improved_prompt)
