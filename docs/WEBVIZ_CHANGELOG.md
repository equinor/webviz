<!--::metadata
  changelog_counter: 2
  date: 02.09.2026
-->

# Changelog

## September 2026

### Changed

- **Leaving a session**: The close (✕) button has been removed. Instead, a "Start" breadcrumb now appears in front of the session name in the top bar — click it to leave the current session or snapshot and return to the start page.

### Added

- **Planned well trajectories**: Planned well trajectories from SMDA can now be displayed in the 2D and 3D viewers and used as the path for Intersection views.

- **Top bar**: Clicking the FMU logo or the "FMU Analysis" title reloads the application and returns you to the start page.

## August 2026

### Added

- **Visualizations**: When the browser stops a graphics-intensive view to free up GPU resources (e.g. with many 2D/3D views or browser tabs open), the view now shows an explanation and a "Restore" button instead of going silently blank. It also recovers automatically when you return to the tab.

### Fixed

- **In-place volumes**: Zone and region order is now preserved in filters, plots, and tables. Fluid-specific responses such as oil and gas formation volume factors are now grouped correctly and provide clearer guidance when the required fluid is not selected.
- **Ensemble selection**: The "Only my cases" filter is now applied as soon as the ensemble dialog opens. Previously, when the setting was remembered as enabled, the case list was not filtered until the switch was toggled off and on again.
