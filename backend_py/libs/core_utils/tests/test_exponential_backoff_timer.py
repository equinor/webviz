from webviz_core_utils.exponential_backoff_timer import ExponentialBackoffTimer


def test_without_jitter() -> None:
    backoff_timer = ExponentialBackoffTimer(
        initial_delay_s=1.0,
        max_delay_s=10.0,
        max_total_duration_s=60.0,
        jitter=None,
    )

    delays = []
    while len(delays) < 6:
        delays.append(backoff_timer.next_delay_s())

    # Check that delays are as expected without jitter
    expected_delays = [1.0, 2.0, 4.0, 8.0, 10.0, 10.0]
    assert delays == expected_delays
