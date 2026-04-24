import logging
import json
from typing import AsyncIterator, List, Dict, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


def build_rag_prompt(
    query: str,
    context_chunks: List[Dict],
    conversation_history: Optional[List[Dict]] = None,
    answer_mode: str = "concise",
) -> tuple:
    """Build system and user messages for RAG."""
    chunk_context = ""
    for i, chunk in enumerate(context_chunks, start=1):
        doc_name = chunk.get("document_name", "Unknown")
        heading = chunk.get("heading", "")
        page = chunk.get("page_start", "")
        section = chunk.get("section_path", "")
        text = chunk.get("text", "")

        ref = f"[Source {i}: {doc_name}"
        if page:
            ref += f", p.{page}"
        if heading:
            ref += f", §{heading}"
        ref += "]"

        chunk_context += f"\n{ref}\n{text}\n"

    depth_instruction = (
        "Provide a CONCISE answer (2-4 sentences), then offer to elaborate if needed."
        if answer_mode == "concise"
        else "Provide a DETAILED, well-structured answer with bullet points where helpful."
    )

    system_prompt = f"""You are RAG Automation, an expert assistant that answers questions STRICTLY based on the provided document context.

Rules:
1. Answer ONLY using information from the provided context chunks.
2. If the answer cannot be found in the context, say: "I don't have enough information in the provided documents to answer this question."
3. Always cite your sources using the [Source N: ...] references provided.
4. Never hallucinate or add information not in the context.
5. {depth_instruction}
6. Structure your answer clearly with inline citations like [Source 1], [Source 2], etc.

Context from documents:
{chunk_context}
"""

    messages = []
    if conversation_history:
        for turn in conversation_history[-4:]:  # last 4 turns for context
            messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": query})

    return system_prompt, messages


async def stream_answer(
    system_prompt: str,
    messages: List[Dict],
) -> AsyncIterator[str]:
    """Stream LLM response tokens."""
    provider = settings.LLM_PROVIDER

    if provider == "groq":
        async for token in _stream_groq(system_prompt, messages):
            yield token
    elif provider == "openrouter":
        async for token in _stream_openrouter(system_prompt, messages):
            yield token
    elif provider == "ollama":
        async for token in _stream_ollama(system_prompt, messages):
            yield token
    elif provider == "huggingface":
        async for token in _stream_huggingface(system_prompt, messages):
            yield token
    else:
        logger.warning(f"Unknown LLM provider '{provider}'. Trying Groq.")
        async for token in _stream_groq(system_prompt, messages):
            yield token


async def _stream_groq(system_prompt: str, messages: List[Dict]) -> AsyncIterator[str]:
    """Stream from Groq API (free tier available)."""
    import httpx

    api_key = settings.LLM_API_KEY
    if not api_key:
        yield "**Error:** LLM_API_KEY not configured. Please set GROQ_API_KEY in .env"
        return

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.LLM_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "max_tokens": settings.LLM_MAX_TOKENS,
        "temperature": settings.LLM_TEMPERATURE,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=settings.QUERY_TIMEOUT) as client:
        async with client.stream(
            "POST",
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
        ) as resp:
            if resp.status_code != 200:
                body = await resp.aread()
                yield f"**LLM Error ({resp.status_code}):** {body.decode()}"
                return
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                        delta = obj["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except Exception:
                        pass


async def _stream_openrouter(system_prompt: str, messages: List[Dict]) -> AsyncIterator[str]:
    """Stream from OpenRouter (has free models like mistral-7b)."""
    import httpx

    api_key = settings.LLM_API_KEY
    base_url = settings.LLM_BASE_URL or "https://openrouter.ai/api/v1"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rag-automation.app",
    }
    payload = {
        "model": settings.LLM_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "max_tokens": settings.LLM_MAX_TOKENS,
        "temperature": settings.LLM_TEMPERATURE,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=settings.QUERY_TIMEOUT) as client:
        async with client.stream(
            "POST",
            f"{base_url}/chat/completions",
            headers=headers,
            json=payload,
        ) as resp:
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                        delta = obj["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except Exception:
                        pass


async def _stream_ollama(system_prompt: str, messages: List[Dict]) -> AsyncIterator[str]:
    """Stream from local Ollama instance."""
    import httpx

    base_url = settings.LLM_BASE_URL or "http://localhost:11434"
    payload = {
        "model": settings.LLM_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "stream": True,
        "options": {"temperature": settings.LLM_TEMPERATURE, "num_predict": settings.LLM_MAX_TOKENS},
    }

    async with httpx.AsyncClient(timeout=settings.QUERY_TIMEOUT) as client:
        async with client.stream("POST", f"{base_url}/api/chat", json=payload) as resp:
            async for line in resp.aiter_lines():
                if line:
                    try:
                        obj = json.loads(line)
                        delta = obj.get("message", {}).get("content", "")
                        if delta:
                            yield delta
                        if obj.get("done"):
                            break
                    except Exception:
                        pass


async def _stream_huggingface(system_prompt: str, messages: List[Dict]) -> AsyncIterator[str]:
    """Use HuggingFace text generation (non-streaming fallback)."""
    import httpx

    api_key = settings.LLM_API_KEY
    model = settings.LLM_MODEL
    url = f"https://api-inference.huggingface.co/models/{model}"

    full_prompt = system_prompt + "\n\n"
    for m in messages:
        role = m["role"].upper()
        full_prompt += f"{role}: {m['content']}\n"
    full_prompt += "ASSISTANT:"

    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    async with httpx.AsyncClient(timeout=settings.QUERY_TIMEOUT) as client:
        resp = await client.post(
            url,
            json={"inputs": full_prompt, "parameters": {"max_new_tokens": settings.LLM_MAX_TOKENS}},
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data[0]["generated_text"] if isinstance(data, list) else str(data)
        # Strip the prompt from the response
        if full_prompt in text:
            text = text[len(full_prompt):]
        yield text
