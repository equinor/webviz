/**
 * Spacing token definitions.
 *
 * This file is the single source of truth for spacing utilities. Run the generator to
 * regenerate spacing.css:
 *
 *   npm run generate:spacing-utilities
 */

/**
 * Spacing tokens mapped to their CSS values.
 * Tokens marked `dynamic: true` are exposed as CSS custom properties so they can be
 * overridden at runtime (e.g. density variants).
 *
 * @type {Record<string, { value: string, dynamic?: boolean }>}
 */
export const tokens = {
    // ── Semantic spacing (EDS only) ─────────────────────────────

    "vertical-4xs": { value: "var(--eds-spacing-vertical-4xs)", groups: ["semantic-spacing"] },
    "vertical-3xs": { value: "var(--eds-spacing-vertical-3xs)", groups: ["semantic-spacing"] },
    "vertical-2xs": { value: "var(--eds-spacing-vertical-2xs)", groups: ["semantic-spacing"] },
    "vertical-xs": { value: "var(--eds-spacing-vertical-xs)", groups: ["semantic-spacing"] },
    "vertical-sm": { value: "var(--eds-spacing-vertical-sm)", groups: ["semantic-spacing"] },
    "vertical-md": { value: "var(--eds-spacing-vertical-md)", groups: ["semantic-spacing"] },
    "vertical-lg": { value: "var(--eds-spacing-vertical-lg)", groups: ["semantic-spacing"] },
    "vertical-xl": { value: "var(--eds-spacing-vertical-xl)", groups: ["semantic-spacing"] },
    "vertical-2xl": { value: "var(--eds-spacing-vertical-2xl)", groups: ["semantic-spacing"] },
    "vertical-3xl": { value: "var(--eds-spacing-vertical-3xl)", groups: ["semantic-spacing"] },

    "horizontal-4xs": { value: "var(--eds-spacing-horizontal-4xs)", groups: ["semantic-spacing"] },
    "horizontal-3xs": { value: "var(--eds-spacing-horizontal-3xs)", groups: ["semantic-spacing"] },
    "horizontal-2xs": { value: "var(--eds-spacing-horizontal-2xs)", groups: ["semantic-spacing"] },
    "horizontal-xs": { value: "var(--eds-spacing-horizontal-xs)", groups: ["semantic-spacing"] },
    "horizontal-sm": { value: "var(--eds-spacing-horizontal-sm)", groups: ["semantic-spacing"] },
    "horizontal-md": { value: "var(--eds-spacing-horizontal-md)", groups: ["semantic-spacing"] },
    "horizontal-lg": { value: "var(--eds-spacing-horizontal-lg)", groups: ["semantic-spacing"] },
    "horizontal-xl": { value: "var(--eds-spacing-horizontal-xl)", groups: ["semantic-spacing"] },
    "horizontal-2xl": { value: "var(--eds-spacing-horizontal-2xl)", groups: ["semantic-spacing"] },
    "horizontal-3xl": { value: "var(--eds-spacing-horizontal-3xl)", groups: ["semantic-spacing"] },

    "selectable-x": {
        value: "var(--eds-selectable-space-horizontal)",
        dynamic: true,
        groups: ["semantic-spacing"],
    },
    "selectable-y": {
        value: "var(--eds-selectable-space-vertical)",
        dynamic: true,
        groups: ["semantic-spacing"],
    },

    // ── Numeric tokens (Tailwind-like) ──────────────────────────

    0: { value: "0px", groups: ["dimension", "position"] },
    px: { value: "1px", groups: ["dimension", "position"] },

    1: { value: "0.25rem", groups: ["dimension", "position"], negative: true },
    2: { value: "0.5rem", groups: ["dimension", "position"], negative: true },
    3: { value: "0.75rem", groups: ["dimension", "position"], negative: true },
    4: { value: "1rem", groups: ["dimension", "position"], negative: true },
    5: { value: "1.25rem", groups: ["dimension", "position"], negative: true },
    6: { value: "1.5rem", groups: ["dimension", "position"], negative: true },
    8: { value: "2rem", groups: ["dimension", "position"], negative: true },
    10: { value: "2.5rem", groups: ["dimension", "position"], negative: true },
    12: { value: "3rem", groups: ["dimension", "position"], negative: true },
    16: { value: "4rem", groups: ["dimension", "position"], negative: true },
};
/**
 * Density overrides for dynamic tokens.
 * Keyed by token name; values are the overridden CSS value.
 *
 * @type {Record<string, string>}
 */
export const densityOverrides = {
    "selectable-y": "var(--eds-spacing-proportions-xs-vertical)",
};

/**
 * CSS utility prefixes to generate for every spacing token.
 * Each entry maps a Tailwind-style prefix to its CSS property.
 *
 * @type {Record<string, string>}
 */
export const propertyGroups = {
    "semantic-spacing": {
        // Padding
        p: "padding",
        pt: "padding-top",
        pr: "padding-right",
        pb: "padding-bottom",
        pl: "padding-left",
        px: "padding-inline",
        py: "padding-block",

        // Margin
        m: "margin",
        mt: "margin-top",
        mr: "margin-right",
        mb: "margin-bottom",
        ml: "margin-left",
        mx: "margin-inline",
        my: "margin-block",

        // Gap
        gap: "gap",
        "gap-x": "column-gap",
        "gap-y": "row-gap",
    },

    dimension: {
        w: "width",
        h: "height",
        "min-w": "min-width",
        "max-w": "max-width",
        "min-h": "min-height",
        "max-h": "max-height",
    },

    position: {
        top: "top",
        right: "right",
        bottom: "bottom",
        left: "left",
        inset: "inset",
        "inset-x": "inset-inline",
        "inset-y": "inset-block",
    },
};
