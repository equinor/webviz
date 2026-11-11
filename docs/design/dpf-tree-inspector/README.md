# DPF settings panel – tree view + inspector mock-up

Interactive, dependency-free HTML mock-up of a redesigned Data Provider Framework (DPF) settings panel.
Open [mockup.html](./mockup.html) directly in a browser (no build step, no server needed).

It is a **design artifact**, not an implementation: all data is hard-coded and nothing is wired to the real DPF.

## Problems it addresses

Users of the current DPF panel struggle with:

1. **What belongs where** – views, groups, context boundaries and providers nest inside one long list with the
   settings of every expanded item inline; once a parent header scrolls away the structure is lost.
2. **What affects what** – shared settings and context boundaries scope *implicitly by position*; a controlled
   setting only shows a link icon, with no pointer to its source, and a shared setting never shows what it reaches.
3. **How to add things** – a small `+` per container header with a three-level menu; the clicked header silently
   decides the scope.

## Design decisions (agreed in the design discussion)

| Topic | Decision |
|---|---|
| Layout | Structure-only **tree view** on top, **settings panel** for the selected item(s) below, resizable divider. |
| Selection | Only items with settings are selectable (providers, shared settings, settings-groups). Click / Ctrl-click / Shift-click / Esc. |
| Multi-select | Panel shows the common settings with intersected options. Differing values are shown as **Mixed** and locked until the user presses *Override for all* – selecting never writes. |
| Relations | **Connection rails** in a left gutter: one coloured rail per shared setting (or settings-group) from its row down to the last item it controls, square origin marker, dot at every controlled item. Colour is the identity of the source and is reused for its name, the panel labels of controlled settings and the *from …* chips. Hover highlights the relation in both directions. |
| Shared settings | Edited in the panel only (components can be large); the row shows the current value as text. |
| Root level | Fixed sections: **Global settings** (root shared settings), **On top of all views** / **Beneath all views** (root providers, drawn above / below all view layers), **Views**. Interleaving root providers between views is deliberately not supported. The Workbench row above shows the global settings set outside the DPF (read-only). |
| Adding | Every container and section ends with a **`+ Add …` row** placed where the new item will land; header `+` remains on hover. A full Delta surface shows a disabled note. |
| Names | Provider names are **generated** from the type and its distinguishing settings; a custom name overrides (✎ marker, *↺ auto* to revert). One distinct icon per provider type. |
| Actions | `⋯` menu per row: Add…, Rename / custom name, Colour, Expand/Collapse all, Select controlled items, Remove. |
| Drag & drop | Drag anywhere on a row, multi-drag of the selection, drop line / outlined container, red indicator for invalid targets, auto-scroll near edges, settings rebind to the nearest reachable shared setting after a move (stopping at context boundaries). |
| Sticky headers | Stacked like CSS `position: sticky`, in tree order: an expanded container or a shared setting pins the moment its own row reaches the boundary, stays while its content (descendants, or the rail's extent) is below, and is pushed up/clipped as that content runs out. The rail gutter stays visible underneath; pinned shared settings carry their origin marker on their rail. Sections do not stick. |

## Mapping to the real DPF

| Mock-up | DPF |
|---|---|
| Workbench row | `GlobalSettings` on `DataProviderManager` (field, ensembles, realization filter, …) |
| Global settings section | Root-level `SharedSetting` items |
| On top of / Beneath all views | Root-level `DataProvider` items (inherited into every view by `VisualizationAssembler`) |
| View / Group / Delta surface | `Group` (`GroupType.VIEW`, plain groups, `DeltaSurface` with its own `SharedSettingsDelegate`) |
| Context boundary | `ContextBoundary` |
| Rails / *from …* chips | `ExternalSettingController` relations (`SettingTopic.IS_EXTERNALLY_CONTROLLED`) |

## Not covered yet

- Loading / error / invalid-settings states beyond the ✔ badge.
- Which settings make up a provider's automatic name has to be declared per provider type.
- Persistence of selection and panel height.
