import time
import threading
from typing import Any

class UserCache:
    """
    Thread-safe, user-isolated in-memory cache with configurable TTL.
    Guarantees that all cache keys are strictly scoped by user_id to prevent cross-user data leakage.
    Provides immediate invalidation on mutations (connect, disconnect, sync, tasks, projects, settings).
    """
    def __init__(self, default_ttl_seconds: int = 30, max_entries: int = 5000):
        self.default_ttl = default_ttl_seconds
        self.max_entries = max_entries
        self._cache: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def _make_key(self, user_id: int, namespace: str, extra: str | None = None) -> str:
        if extra:
            return f"u:{user_id}:{namespace}:{extra}"
        return f"u:{user_id}:{namespace}"

    def get(self, user_id: int, namespace: str, extra: str | None = None) -> Any | None:
        key = self._make_key(user_id, namespace, extra)
        with self._lock:
            if key in self._cache:
                val, exp = self._cache[key]
                if time.time() < exp:
                    return val
                del self._cache[key]
        return None

    def set(self, user_id: int, namespace: str, value: Any, ttl: int | None = None, extra: str | None = None) -> None:
        key = self._make_key(user_id, namespace, extra)
        ttl_val = ttl if ttl is not None else self.default_ttl
        with self._lock:
            # Periodic cleanup if size exceeds limit
            if len(self._cache) >= self.max_entries:
                now = time.time()
                expired = [k for k, (_, exp) in self._cache.items() if now >= exp]
                for k in expired:
                    del self._cache[k]
                # If still over limit, pop oldest 20%
                if len(self._cache) >= self.max_entries:
                    excess = len(self._cache) - int(self.max_entries * 0.8)
                    for _ in range(excess):
                        self._cache.pop(next(iter(self._cache)), None)

            self._cache[key] = (value, time.time() + ttl_val)

    def invalidate_user(self, user_id: int, namespace: str | None = None) -> None:
        prefix = f"u:{user_id}:"
        with self._lock:
            if namespace:
                target_prefix = f"u:{user_id}:{namespace}"
                keys_to_del = [k for k in self._cache if k == target_prefix or k.startswith(f"{target_prefix}:")]
                for k in keys_to_del:
                    self._cache.pop(k, None)
            else:
                keys_to_del = [k for k in self._cache if k.startswith(prefix)]
                for k in keys_to_del:
                    del self._cache[k]

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

# Global singleton cache instance
user_cache = UserCache(default_ttl_seconds=30)

