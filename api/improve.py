from fastapi import FastAPI, HTTPException, status

from backend.app.models import ImproveRequest, ImproveResponse
from backend.app.services.mistral_service import (
    MistralConfigurationError,
    MistralServiceError,
    improve_prompt,
)


app = FastAPI()


@app.post("/", response_model=ImproveResponse, status_code=status.HTTP_200_OK)
@app.post("/improve", response_model=ImproveResponse, status_code=status.HTTP_200_OK)
async def improve(request: ImproveRequest) -> ImproveResponse:
    try:
        improved = await improve_prompt(request.prompt)
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

    return ImproveResponse(improved_prompt=improved)
