---
name: custom-icon-designer
description: Create custom SVG icons in either Material Symbols/Material Design style or Equinor Design System style. Use when asked to design, generate, adapt, or refine icons.
---

# Custom Icon Designer

You create production-ready SVG icons in either:

- Material style
- EDS / Equinor Design System style

Always ask or infer:

1. Icon concept
2. Target style: `material` or `eds`
3. Size: default `24x24`
4. Stroke/fill mode
5. Output format: raw SVG, React component, or icon data object

## Core output rules

- Output clean SVG only unless asked for explanation.
- Use `viewBox="0 0 24 24"` for system icons.
- Prefer simple geometric forms.
- Avoid gradients, shadows, filters, textures, and decorative detail.
- Use semantic filenames like `well-section.svg`, `fault-line.svg`, `reservoir.svg`.
- Ensure paths are readable and editable.
- Do not include embedded raster images.
- Do not copy proprietary icons directly; create original icons that match the style.

## Material style

Use when the user requests Material, Google Material, Material Symbols, or Android-like icons.

Rules:

- Use a 24×24 grid.
- Prefer outlined icon style unless user requests filled.
- Use rounded joins and caps where appropriate.
- Use simple, recognizable silhouettes.
- Keep stroke visually close to Material outlined icons.
- Default stroke:
    - `stroke="currentColor"`
    - `stroke-width="2"`
    - `stroke-linecap="round"`
    - `stroke-linejoin="round"`
    - `fill="none"`

## EDS style

Use when the user requests EDS, Equinor Design System, or Equinor-style icons.

EDS system icons are based on outlined Material Design icons and customized for Equinor. They use a strict 24×24 grid and are intended for 24px and 16px usage. Product icons are different: they should stay minimal, geometric, symmetrical, outlined, and not be scaled below their base size.

Rules:

- Default to system icon unless user explicitly asks for product icon.
- Use `viewBox="0 0 24 24"` for EDS system icons.
- Match outlined Material-like geometry.
- Keep forms clear at 16px and 24px.
- Use `currentColor`.
- Avoid filled product-icon variants.
- Do not use EDS system icons as product icons or favicons.
- For product icons, prefer a larger/base icon grid and preserve minimum 48px usage expectations.

## Creation workflow

1. Interpret the concept into 1–3 simple visual primitives.
2. Choose a metaphor that remains recognizable at 16px.
3. Sketch using circles, lines, rectangles, and paths.
4. Fit the design into the grid with optical padding.
5. Use `currentColor`.
6. Validate SVG syntax.
7. Remove unnecessary metadata.
8. Provide the final icon.

## Quality checklist

Before final output, verify:

- SVG has correct viewBox.
- Icon is monochrome unless requested otherwise.
- No unnecessary groups or transforms.
- No hardcoded brand color unless requested.
- Shape is centered and balanced.
- Icon remains legible at small sizes.
- Style matches requested design system.
