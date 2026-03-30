import os

from mistralai import Mistral


SYSTEM_PROMPT = """You are a prompt engineering expert. Rewrite user prompts to be clearer, more specific, and structured using:
Task:
Context:
Constraints:
Output Format:
Return only the improved prompt."""

MODEL_NAME = "mistral-small-latest"


class MistralServiceError(Exception):
    """Raised when the Mistral service cannot fulfill a request."""


class MistralConfigurationError(MistralServiceError):
    """Raised when the Mistral client is not configured correctly."""


async def improve_prompt(prompt: str) -> str:
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        raise MistralConfigurationError("Missing MISTRAL_API_KEY environment variable.")

    try:
        client = Mistral(api_key=api_key)
        response = await client.chat.complete_async(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
    except Exception as exc:  # pragma: no cover
        raise MistralServiceError("Failed to generate improved prompt from Mistral.") from exc

    content = response.choices[0].message.content if response.choices else None
    if isinstance(content, list):
        text_parts = [
            item.text for item in content if getattr(item, "type", None) == "text" and item.text
        ]
        content = "\n".join(text_parts).strip()

    if not isinstance(content, str) or not content.strip():
        raise MistralServiceError("Mistral returned an empty response.")

    return content.strip()
