from pydantic import BaseModel, Field


class ImproveRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="The prompt to improve.")


class ImproveResponse(BaseModel):
    improved_prompt: str
