"""
Async HTTP client with:
  • automatic retries (exponential back-off via tenacity)
  • per-domain rate limiting
  • rotating User-Agent headers
  • optional proxy rotation
"""
from __future__ import annotations
import asyncio
import json
import random
from typing import Any, Dict, Optional
import aiohttp
from tenacity import (
    AsyncRetrying, stop_after_attempt, wait_exponential,
    retry_if_exception_type,
)
import config
from utils.rate_limiter import rate_limiter


_RETRYABLE = (aiohttp.ClientConnectionError, aiohttp.ServerTimeoutError, asyncio.TimeoutError)


def _random_headers() -> Dict[str, str]:
    return {
        "User-Agent": random.choice(config.USER_AGENTS),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

def _next_proxy() -> Optional[str]:
    if not config.PROXY_LIST:
        return None
    return random.choice(config.PROXY_LIST)


class AsyncHTTPClient:
    """
    Shared async session.  Use as an async context manager or call
    `await client.start()` / `await client.close()` manually.
    """

    def __init__(self, semaphore_limit: int = config.CONCURRENT_REQUESTS):
        self._session: Optional[aiohttp.ClientSession] = None
        self._sem = asyncio.Semaphore(semaphore_limit)

    async def start(self) -> None:
        connector = aiohttp.TCPConnector(ssl=False, limit=config.CONCURRENT_REQUESTS)
        timeout = aiohttp.ClientTimeout(total=config.REQUEST_TIMEOUT)
        self._session = aiohttp.ClientSession(connector=connector, timeout=timeout)

    async def close(self) -> None:
        if self._session:
            await self._session.close()
            self._session = None

    async def __aenter__(self) -> "AsyncHTTPClient":
        await self.start()
        return self

    async def __aexit__(self, *_) -> None:
        await self.close()

    async def get(
        self,
        url: str,
        params: Dict[str, Any] | None = None,
        headers: Dict[str, str] | None = None,
        as_json: bool = False,
    ) -> tuple[int, str | dict]:
        """Return (status_code, body).  body is dict if as_json=True."""
        await rate_limiter.wait(url)

        merged_headers = {**_random_headers(), **(headers or {})}
        proxy = _next_proxy()

        async with self._sem:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(config.MAX_RETRIES),
                wait=wait_exponential(multiplier=1, min=2, max=30),
                retry=retry_if_exception_type(_RETRYABLE),
                reraise=True,
            ):
                with attempt:
                    async with self._session.get(
                        url,
                        params=params,
                        headers=merged_headers,
                        proxy=proxy,
                        allow_redirects=True,
                    ) as resp:
                        if as_json:
                            body = await resp.json(content_type=None)
                        else:
                            body = await resp.text(errors="replace")
                        return resp.status, body

    async def post(
        self,
        url: str,
        json_body: Dict[str, Any] | None = None,
        headers: Dict[str, str] | None = None,
    ) -> tuple[int, dict]:
        await rate_limiter.wait(url)
        merged_headers = {**_random_headers(), **(headers or {})}
        proxy = _next_proxy()

        async with self._sem:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(config.MAX_RETRIES),
                wait=wait_exponential(multiplier=1, min=2, max=30),
                retry=retry_if_exception_type(_RETRYABLE),
                reraise=True,
            ):
                with attempt:
                    async with self._session.post(
                        url,
                        json=json_body,
                        headers=merged_headers,
                        proxy=proxy,
                    ) as resp:
                        body = await resp.json(content_type=None)
                        return resp.status, body
