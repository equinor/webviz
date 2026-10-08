<!--::metadata
  changelog_counter: 3
  date: 30.09.2026
-->

# Changelog

## September 2026

### Changed

- **VFP module**: The VFP module now supports standard lift curve data from `SIM2SUMO`.
- **Experimental modules**: In the module list, experimental modules are now shown by default.
- **Leaving a session**: The close (✕) button has been removed. Instead, a "Start" breadcrumb now appears in front of the session name in the top bar — click it to leave the current session or snapshot and return to the start page.

### Fixed

- **Well trajectories**: Failures when fetching well perforations or completions/screens no longer prevent drilled wellbore trajectories from loading; error details are now surfaced via the provider status indicator while still displaying trajectories.
- **Intersection seismic readout**: The value shown when hovering over a seismic slice in the Intersection view is now interpolated between neighboring samples instead of taken from a single cell, giving a smoother, more accurate readout.
- **Inplace Volumes Plot**: In a bar plot with one bar per zone, region or other category, the statistics table below the plot now shows one row per category instead of pooling all categories together.
- **Sensitivity/Response plot**: "Hide sensitivities without impact" now also hides sensitivities whose difference from the reference is only rounding noise, and Monte Carlo sensitivities that match a Monte Carlo reference. The reference itself is always shown.
- **Sensitivity/Response plot**: When the data channel holds several responses (e.g. one per region), one tornado is shown per response instead of only the first, and the table lists all responses.
- **Sensitivity/Response plot**: Sensitivities with no data in the received response (e.g. cases filtered out in the sending module) are left out and listed in a warning, instead of being drawn as zero. A reference sensitivity without data is reported instead of being treated as zero.
- **Inplace Volumes Plot**: Hovers show which group (e.g. sensitivity case) a value belongs to and the actual realization number. Clicking a legend item now applies to all subplots, and long legends scroll.

### Added

- **Multiple dashboards**: A session can now hold several dashboards. Add, clone, rename, remove, and reorder them from the dashboard bar, and switch between them instantly — a dashboard you switch away from stays ready in the background for a while, so coming back to it doesn't reload anything.
- **In-place volumes**: Delta ensembles can now be used in plots and tables to compare volumes per realization, with statistics calculated from the differences.
- **In-place volumes**: A new "Inplace Volumes Comparison" module shows a waterfall chart decomposing the change in STOIIP/GIIP between two ensembles or tables into contributions from BULK, porosity, saturation, and formation volume factor.
- **Planned well trajectories**: Planned well trajectories from SMDA can now be displayed in the 2D and 3D viewers and used as the path for Intersection views.
- **Fluid contact surfaces**: Initial fluid contacts are now available as a separate layer in the 2D, 3D, and Intersection views.
- **Top bar**: Clicking the FMU logo or the "FMU Analysis" title reloads the application and returns you to the start page.
- **Inplace Volumes Table**: added CSV download of the displayed table (respects filters, sorting and table mode).
- **3D viewer**: Well trajectory depth/flow filters and completion (screen/perforation) markers are now supported, matching the 2D viewer.
- **Inplace Volumes Table**: wide tables now scroll horizontally with the grouping columns pinned, and columns with the same value on every row are summarised above the table.
- **Inplace Volumes Table**: new "Statistics layout" option shows responses as rows, keeping the table narrow when many responses are selected.
- **In-place volumes plots**: For an ensemble with sensitivities (design matrix), all plots and the statistics table are split per sensitivity case and coloured by case by default. A new "Sensitivity cases" filter selects which cases are included.
- **Inplace Volumes Table**: For an ensemble with sensitivities, a SENSITIVITY column is added and statistics are computed per sensitivity case.
- **Inplace Volumes Comparison**: For an ensemble with sensitivities, each side selects a sensitivity case, so a case can be compared against the base case of the same ensemble.

## August 2026

### Added

- **Visualizations**: When the browser stops a graphics-intensive view to free up GPU resources (e.g. with many 2D/3D views or browser tabs open), the view now shows an explanation and a "Restore" button instead of going silently blank. It also recovers automatically when you return to the tab.

### Fixed

- **In-place volumes**: Zone and region order is now preserved in filters, plots, and tables. Fluid-specific responses such as oil and gas formation volume factors are now grouped correctly and provide clearer guidance when the required fluid is not selected.
- **Ensemble selection**: The "Only my cases" filter is now applied as soon as the ensemble dialog opens. Previously, when the setting was remembered as enabled, the case list was not filtered until the switch was toggled off and on again.
