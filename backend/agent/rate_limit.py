"""
Rate limiting — protect Anthropic + Tavily API budget.

Per-IP:    10 research sessions per hour
Global:    150 sessions per day (hard budget cap across all users)

Uses Django's default LocMemCache (in-memory, per-process).
"""

from django.core.cache import cache
from django.http import JsonResponse

HOURLY_LIMIT_PER_IP = 10
DAILY_LIMIT_GLOBAL  = 150


def _get_ip(request) -> str:
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '0.0.0.0')


def check_rate_limit(request):
    """Return a 429 JsonResponse if any limit is exceeded, else None."""
    ip = _get_ip(request)

    ip_count = cache.get(f'rl:ip:{ip}', 0)
    if ip_count >= HOURLY_LIMIT_PER_IP:
        return JsonResponse(
            {'error': f'Rate limit: max {HOURLY_LIMIT_PER_IP} research sessions per hour. Try again later.'},
            status=429,
        )

    global_count = cache.get('rl:global', 0)
    if global_count >= DAILY_LIMIT_GLOBAL:
        return JsonResponse(
            {'error': 'Service is temporarily at capacity. Please try again in a few minutes.'},
            status=429,
        )

    return None


def record_request(request):
    """Increment counters after a session is successfully created."""
    ip = _get_ip(request)
    cache.set(f'rl:ip:{ip}', cache.get(f'rl:ip:{ip}', 0) + 1, timeout=3600)   # 1-hour window
    cache.set('rl:global',   cache.get('rl:global',   0) + 1, timeout=86400)  # 24-hour window
