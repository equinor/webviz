import pytest

from primary.auth.auth_helper import _is_safe_redirect_target


@pytest.mark.parametrize(
    "target",
    [
        "/",
        "/dashboard",
        "/dashboard?tab=recent#top",
        "/search?q=some%20text",
    ],
)
def test_is_safe_redirect_target_accepts_local_paths(target: str) -> None:
    assert _is_safe_redirect_target(target)


@pytest.mark.parametrize(
    "target",
    [
        "",
        "dashboard",
        "https://example.com",
        "//example.com",
        "///example.com",
        "/\\example.com",
        "/dashboard\nLocation: https://example.com",
        None,
        123,
        [],
        {},
    ],
)
def test_is_safe_redirect_target_rejects_unsafe_targets(target: object) -> None:
    assert not _is_safe_redirect_target(target)
