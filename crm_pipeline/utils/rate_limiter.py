"""
Token-bucket rate limiter keyed by domain.
Thread-safe and asyncio-compatible.
"""
from __future__ import annotations
import asyncio
import time
from collections import defaultdict
from urllib.parse import urlparse
import config


class TokenBucket:
    """Allows `rate` tokens per second; burst up to `capacity` tokens."""

    def __init__(self, rate: float, capacity: float | None = None):
        self.rate = rate
        self.capacity = capacity or max(rate, 1.0)
        self._tokens = self.capacity
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            self._refill()
            while self._tokens < 1.0:
                wait = (1.0 - self._tokens) / self.rate
                await asyncio.sleep(wait)
                self._refill()
            self._tokens -= 1.0

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(self.capacity, self._tokens + elapsed * self.rate)
        self._last_refill = now


class DomainRateLimiter:
    """One TokenBucket per domain; unknown domains use the 'default' rate."""

    def __init__(self, limits: dict[str, float] | None = None):
        self._limits = limits or config.RATE_LIMITS
        self._buckets: dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(self._limits.get("default", 1.0))
        )

    def _bucket(self, url_or_domain: str) -> TokenBucket:
        try:
            domain = urlparse(url_or_domain).netloc or url_or_domain
        except Exception:
            domain = url_or_domain
        if domain not in self._buckets:
            rate = self._limits.get(domain, self._limits.get("default", 1.0))
            self._buckets[domain] = TokenBucket(rate)
        return self._buckets[domain]

    async def wait(self, url_or_domain: str) -> None:
        await self._bucket(url_or_domain).acquire()


# Singleton used across the whole pipeline
rate_limiter = DomainRateLimiter()
