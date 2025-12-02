import pytest
from fastapi import HTTPException

from primary.routers.surface._utils import _create_formation_segments_from_well_trajectory_and_picks
from primary.routers.surface.schemas import (
    PickDirection,
    SurfaceWellPick,
    WellTrajectory,
)


def create_well_trajectory(md_points: list[float]) -> WellTrajectory:
    """Helper to create a simple vertical well trajectory for testing."""
    return WellTrajectory(
        uwi="test-well",
        x_points=[100.0] * len(md_points),
        y_points=[200.0] * len(md_points),
        z_points=md_points,  # For simplicity, z equals md
        md_points=md_points,
    )


def create_pick(md: float, direction: PickDirection) -> SurfaceWellPick:
    """Helper to create a surface well pick."""
    return SurfaceWellPick(
        unique_wellbore_identifier="test-well",
        x=100.0,
        y=200.0,
        z=md,
        md=md,
        direction=direction,
    )


def test_well_enters_top_downward_and_exits_top_upward() -> None:
    """Test well entering formation from above (top downward) and exiting upward (top upward)."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter at 100
        create_pick(300.0, PickDirection.UPWARD),  # Exit at 300
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 100.0
    assert segments[0].md_exit == 300.0


def test_well_starts_inside_formation_top_upward() -> None:
    """Test well starting inside formation, first pick is top upward (exiting)."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = [
        create_pick(200.0, PickDirection.UPWARD),  # Exit at 200 (started inside)
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 0.0  # Started at well start
    assert segments[0].md_exit == 200.0


def test_well_enters_and_ends_inside_formation() -> None:
    """Test well entering formation and ending inside (no exit pick)."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter at 100
        # No exit pick - well ends inside
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 100.0
    assert segments[0].md_exit == 400.0  # Ends at well end


def test_well_multiple_entries_and_exits() -> None:
    """Test well with multiple entries and exits (e.g., horizontal well through folded formation)."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0, 500.0, 600.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter 1
        create_pick(200.0, PickDirection.UPWARD),  # Exit 1
        create_pick(300.0, PickDirection.DOWNWARD),  # Enter 2
        create_pick(400.0, PickDirection.UPWARD),  # Exit 2
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
    )

    assert len(segments) == 2
    assert segments[0].md_enter == 100.0
    assert segments[0].md_exit == 200.0
    assert segments[1].md_enter == 300.0
    assert segments[1].md_exit == 400.0


def test_well_with_bottom_surface_enter_from_below() -> None:
    """Test well entering from below (bottom upward) and exiting through bottom (bottom downward)."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = []
    bottom_picks = [
        create_pick(100.0, PickDirection.UPWARD),  # Enter from below at 100
        create_pick(300.0, PickDirection.DOWNWARD),  # Exit through bottom at 300
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=bottom_picks
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 100.0
    assert segments[0].md_exit == 300.0


def test_well_starts_inside_with_bottom_downward() -> None:
    """Test well starting inside formation, first pick is bottom downward (exiting down)."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = []
    bottom_picks = [
        create_pick(200.0, PickDirection.DOWNWARD),  # Exit down at 200 (started inside)
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=bottom_picks
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 0.0  # Started at well start
    assert segments[0].md_exit == 200.0


def test_well_with_both_top_and_bottom_surfaces() -> None:
    """Test well with both top and bottom surfaces, entering from top and exiting through bottom."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter through top at 100
    ]
    bottom_picks = [
        create_pick(300.0, PickDirection.DOWNWARD),  # Exit through bottom at 300
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=bottom_picks
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 100.0
    assert segments[0].md_exit == 300.0


def test_well_mixed_top_and_bottom_picks_raises_on_consecutive_entry() -> None:
    """Test well with consecutive entry picks raises HTTPException."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0, 500.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter through top at 100
        create_pick(400.0, PickDirection.DOWNWARD),  # Enter through top at 400 (consecutive entry!)
    ]
    bottom_picks = [
        create_pick(200.0, PickDirection.DOWNWARD),  # Exit through bottom at 200
        create_pick(450.0, PickDirection.UPWARD),  # Enter from below at 450 (another consecutive entry!)
    ]

    with pytest.raises(HTTPException) as exc_info:
        _create_formation_segments_from_well_trajectory_and_picks(
            well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=bottom_picks
        )

    assert exc_info.value.status_code == 500
    assert "Unexpected consecutive entry picks" in exc_info.value.detail
    assert "450.0" in exc_info.value.detail


def test_well_mixed_top_and_bottom_picks_raises_on_consecutive_exits() -> None:
    """Test well with mixed picks that creates consecutive exits raises HTTPException."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0, 500.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter through top at 100
        create_pick(300.0, PickDirection.UPWARD),  # Exit through top at 300 (consecutive exit!)
    ]
    bottom_picks = [
        create_pick(200.0, PickDirection.DOWNWARD),  # Exit through bottom at 200
    ]

    # Sorted by MD: 100 (enter), 200 (exit), 300 (exit) - two consecutive exits!
    with pytest.raises(HTTPException) as exc_info:
        _create_formation_segments_from_well_trajectory_and_picks(
            well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=bottom_picks
        )

    assert exc_info.value.status_code == 500
    assert "Unexpected exit pick without entry" in exc_info.value.detail
    assert "300.0" in exc_info.value.detail


def test_well_mixed_top_and_bottom_picks_valid() -> None:
    """Test well with valid mixed top and bottom picks creating a single segment."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0, 500.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter through top at 100
    ]
    bottom_picks = [
        create_pick(300.0, PickDirection.DOWNWARD),  # Exit through bottom at 300
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=bottom_picks
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 100.0
    assert segments[0].md_exit == 300.0


def test_well_starts_inside_ends_inside() -> None:
    """Test well starting inside and ending inside (first pick is exit, no further picks)."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = [
        create_pick(100.0, PickDirection.UPWARD),  # Exit up at 100 (started inside)
        create_pick(200.0, PickDirection.DOWNWARD),  # Re-enter at 200
        # No exit - ends inside
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
    )

    assert len(segments) == 2
    assert segments[0].md_enter == 0.0
    assert segments[0].md_exit == 100.0
    assert segments[1].md_enter == 200.0
    assert segments[1].md_exit == 400.0


def test_well_no_intersection() -> None:
    """Test well with no picks (doesn't intersect formation)."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = []
    bottom_picks = []

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=bottom_picks
    )

    assert len(segments) == 0


def test_well_only_top_downward_no_bottom_surface() -> None:
    """Test well entering through top with no bottom surface - formation extends to well end."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = [
        create_pick(150.0, PickDirection.DOWNWARD),  # Enter at 150, no exit
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 150.0
    assert segments[0].md_exit == 400.0  # Extends to end of trajectory


def test_consecutive_entry_picks_raises_exception() -> None:
    """Test consecutive entry picks raises HTTPException for data quality issue."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter 1
        create_pick(150.0, PickDirection.DOWNWARD),  # Enter 2 (consecutive entry!)
        create_pick(300.0, PickDirection.UPWARD),  # Exit
    ]

    with pytest.raises(HTTPException) as exc_info:
        _create_formation_segments_from_well_trajectory_and_picks(
            well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
        )

    assert exc_info.value.status_code == 500
    assert "Unexpected consecutive entry picks" in exc_info.value.detail
    assert "150.0" in exc_info.value.detail


def test_consecutive_exit_picks_raises_exception() -> None:
    """Test consecutive exit picks without prior entry raises HTTPException for data quality issue."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter
        create_pick(200.0, PickDirection.UPWARD),  # Exit 1
        create_pick(250.0, PickDirection.UPWARD),  # Exit 2 (consecutive exit without entry!)
    ]

    with pytest.raises(HTTPException) as exc_info:
        _create_formation_segments_from_well_trajectory_and_picks(
            well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
        )

    assert exc_info.value.status_code == 500
    assert "Unexpected exit pick without entry" in exc_info.value.detail
    assert "250.0" in exc_info.value.detail


def test_well_picks_unsorted_by_md() -> None:
    """Test that picks are correctly sorted by MD even if provided out of order."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0, 400.0])
    # Provide picks out of order
    top_picks = [
        create_pick(300.0, PickDirection.UPWARD),  # Exit at 300
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter at 100
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 100.0
    assert segments[0].md_exit == 300.0


def test_complex_scenario_raises_on_consecutive_entries() -> None:
    """Test complex scenario with consecutive entries raises HTTPException."""
    trajectory = create_well_trajectory([0.0, 50.0, 100.0, 150.0, 200.0, 250.0, 300.0, 350.0, 400.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter through top at 100
        create_pick(250.0, PickDirection.UPWARD),  # Exit through top at 250
    ]
    bottom_picks = [
        create_pick(200.0, PickDirection.UPWARD),  # Enter from below at 200 (consecutive entry!)
    ]

    # Sorted by MD: 100 (enter), 200 (enter), 250 (exit) - two consecutive entries!
    with pytest.raises(HTTPException) as exc_info:
        _create_formation_segments_from_well_trajectory_and_picks(
            well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=bottom_picks
        )

    assert exc_info.value.status_code == 500
    assert "Unexpected consecutive entry picks" in exc_info.value.detail
    assert "200.0" in exc_info.value.detail


def test_complex_scenario_with_multiple_surfaces_valid() -> None:
    """Test valid complex scenario with multiple crossings of both top and bottom surfaces."""
    trajectory = create_well_trajectory([0.0, 50.0, 100.0, 150.0, 200.0, 250.0, 300.0, 350.0, 400.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),  # Enter through top at 100
        create_pick(300.0, PickDirection.DOWNWARD),  # Re-enter through top at 300
    ]
    bottom_picks = [
        create_pick(200.0, PickDirection.DOWNWARD),  # Exit through bottom at 200
        create_pick(350.0, PickDirection.DOWNWARD),  # Exit through bottom at 350
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=bottom_picks
    )

    # Should create two segments: 100-200 and 300-350
    assert len(segments) == 2
    assert segments[0].md_enter == 100.0
    assert segments[0].md_exit == 200.0
    assert segments[1].md_enter == 300.0
    assert segments[1].md_exit == 350.0


def test_single_top_pick_downward_extends_to_end() -> None:
    """Test single top downward pick with no bottom surface - formation extends to trajectory end."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0])
    top_picks = [
        create_pick(100.0, PickDirection.DOWNWARD),
    ]

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
    )

    assert len(segments) == 1
    assert segments[0].md_enter == 100.0
    assert segments[0].md_exit == 300.0


def test_well_entirely_inside_formation() -> None:
    """Test well that starts and ends inside formation (no picks)."""
    trajectory = create_well_trajectory([0.0, 100.0, 200.0, 300.0])
    top_picks = []  # No picks means well doesn't cross surfaces

    segments = _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=trajectory, top_surface_picks=top_picks, bottom_surface_picks=None
    )

    # With no picks, we can't determine if well is inside - returns empty
    assert len(segments) == 0
