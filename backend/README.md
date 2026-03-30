# FastAPI Backend

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export MISTRAL_API_KEY=your_api_key
uvicorn app.main:app --reload
```

## Endpoint

`POST /improve`

Request body:

```json
{
  "prompt": "Write a prompt for a product launch email"
}
```

Response body:

```json
{
  "improved_prompt": "Task: ... "
}
```
