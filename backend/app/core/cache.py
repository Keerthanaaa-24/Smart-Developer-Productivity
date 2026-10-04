import time
import threading
from typing import Any

class UserCache:
    """
    Thread-safe, user-isolated in-memory cache with configurable TTL.
    Prevents cross-user data leakage and eliminates redundant SQL roundtrips.
    """
    def __init__(self, default_ttl_seconds: int = 30):
        self.default_ttl = default_ttl_seconds
        self._cache: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()

    def _make_key(self, user_id: int, namespace: str) -> str:
        return f"u:{user_id}:{namespace}"

    def get(self, user_id: int, namespace: str) -> Any | None:
        key = self._make_key(user_id, namespace)
        with self._lock:
            if key in self._cache:
                val, exp = self._cache[key]
                if time.time() < exp:
                    return val
                del self._cache[key]
        return None

    def set(self, user_id: int, namespace: str, value: Any, ttl: int | None = None) -> None:
        key = self._make_key(user_id, namespace)
        ttl_val = ttl if ttl is not None else self.default_ttl
        with self._lock:
            self._cache[key] = (value, time.time() + ttl_val)

    def invalidate_user(self, user_id: int, namespace: str | None = None) -> None:
        prefix = f"u:{user_id}:"
        target_key = self._make_key(user_id, namespace) if namespace else None
        with self._lock:
            if target_key:
                self._cache.pop(target_key, None)
            else:
                keys_to_del = [k for k in self._cache if k.startswith(prefix)]
                for k in keys_to_del:
                    del self._cache[k]

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

# Global singleton cache instance
user_cache = UserCache(default_ttl_seconds=30)
