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
const semanticSpacingTokens = {
    // Vertical spacing scale (derived from EDS)
    "vertical-4xs": { axis: "y", className: "4xs", negative: true, value: "var(--eds-spacing-vertical-4xs)", groups: ["semantic-spacing", "position"] },
    "vertical-3xs": { axis: "y", className: "3xs", negative: true, value: "var(--eds-spacing-vertical-3xs)", groups: ["semantic-spacing", "position"] },
    "vertical-2xs": { axis: "y", className: "2xs", negative: true, value: "var(--eds-spacing-vertical-2xs)", groups: ["semantic-spacing", "position"] },
    "vertical-xs":  { axis: "y", className: "xs",  negative: true, value: "var(--eds-spacing-vertical-xs)",  groups: ["semantic-spacing", "position"] },
    "vertical-sm":  { axis: "y", className: "sm",  negative: true, value: "var(--eds-spacing-vertical-sm)",  groups: ["semantic-spacing", "position"] },
    "vertical-md":  { axis: "y", className: "md",  negative: true, value: "var(--eds-spacing-vertical-md)",  groups: ["semantic-spacing", "position"] },
    "vertical-lg":  { axis: "y", className: "lg",  negative: true, value: "var(--eds-spacing-vertical-lg)",  groups: ["semantic-spacing", "position"] },
    "vertical-xl":  { axis: "y", className: "xl",  negative: true, value: "var(--eds-spacing-vertical-xl)",  groups: ["semantic-spacing", "position"] },
    "vertical-2xl": { axis: "y", className: "2xl", negative: true, value: "var(--eds-spacing-vertical-2xl)", groups: ["semantic-spacing", "position"] },
    "vertical-3xl": { axis: "y", className: "3xl", negative: true, value: "var(--eds-spacing-vertical-3xl)", groups: ["semantic-spacing", "position"] },

    // Horizontal spacing scale (derived from EDS)
    "horizontal-4xs": { axis: "x", className: "4xs", negative: true, value: "var(--eds-spacing-horizontal-4xs)", groups: ["semantic-spacing", "position"] },
    "horizontal-3xs": { axis: "x", className: "3xs", negative: true, value: "var(--eds-spacing-horizontal-3xs)", groups: ["semantic-spacing", "position"] },
    "horizontal-2xs": { axis: "x", className: "2xs", negative: true, value: "var(--eds-spacing-horizontal-2xs)", groups: ["semantic-spacing", "position"] },
    "horizontal-xs":  { axis: "x", className: "xs",  negative: true, value: "var(--eds-spacing-horizontal-xs)",  groups: ["semantic-spacing", "position"] },
    "horizontal-sm":  { axis: "x", className: "sm",  negative: true, value: "var(--eds-spacing-horizontal-sm)",  groups: ["semantic-spacing", "position"] },
    "horizontal-md":  { axis: "x", className: "md",  negative: true, value: "var(--eds-spacing-horizontal-md)",  groups: ["semantic-spacing", "position"] },
    "horizontal-lg":  { axis: "x", className: "lg",  negative: true, value: "var(--eds-spacing-horizontal-lg)",  groups: ["semantic-spacing", "position"] },
    "horizontal-xl":  { axis: "x", className: "xl",  negative: true, value: "var(--eds-spacing-horizontal-xl)",  groups: ["semantic-spacing", "position"] },
    "horizontal-2xl": { axis: "x", className: "2xl", negative: true, value: "var(--eds-spacing-horizontal-2xl)", groups: ["semantic-spacing", "position"] },
    "horizontal-3xl": { axis: "x", className: "3xl", negative: true, value: "var(--eds-spacing-horizontal-3xl)", groups: ["semantic-spacing", "position"] },

    // Selectable spacing (dynamic — responds to density overrides)
    "selectable-x": {
        axis: "x",
        className: "selectable",
        value: "var(--eds-selectable-space-horizontal)",
        dynamic: true,
        negative: true,
        groups: ["semantic-spacing", "dimension", "position"],
    },
    "selectable-y": {
        axis: "y",
        className: "selectable",
        value: "var(--eds-selectable-space-vertical)",
        dynamic: true,
        negative: true,
        groups: ["semantic-spacing", "dimension", "position"],
    },
};

const rem = (n) => `${n}rem`;

const numericLengthTokens = {
    zero: { className: "0", value: "0px", groups: ["semantic-spacing", "dimension", "position"] },
    px: { className: "px", value: "1px", groups: ["dimension", "position"] },

    s0_5: { className: "0.5", value: rem(0.125), groups: ["dimension", "position"], negative: true },
    s1: { className: "1", value: rem(0.25), groups: ["dimension", "position"], negative: true },
    s1_5: { className: "1.5", value: rem(0.375), groups: ["dimension", "position"], negative: true },
    s2: { className: "2", value: rem(0.5), groups: ["dimension", "position"], negative: true },
    s2_5: { className: "2.5", value: rem(0.625), groups: ["dimension", "position"], negative: true },
    s3: { className: "3", value: rem(0.75), groups: ["dimension", "position"], negative: true },
    s3_5: { className: "3.5", value: rem(0.875), groups: ["dimension", "position"], negative: true },

    s4: { className: "4", value: rem(1), groups: ["dimension", "position"], negative: true },
    s5: { className: "5", value: rem(1.25), groups: ["dimension", "position"], negative: true },
    s6: { className: "6", value: rem(1.5), groups: ["dimension", "position"], negative: true },
    s7: { className: "7", value: rem(1.75), groups: ["dimension", "position"], negative: true },
    s8: { className: "8", value: rem(2), groups: ["dimension", "position"], negative: true },
    s9: { className: "9", value: rem(2.25), groups: ["dimension", "position"], negative: true },
    s10: { className: "10", value: rem(2.5), groups: ["dimension", "position"], negative: true },
    s11: { className: "11", value: rem(2.75), groups: ["dimension", "position"], negative: true },
    s12: { className: "12", value: rem(3), groups: ["dimension", "position"], negative: true },
    s14: { className: "14", value: rem(3.5), groups: ["dimension", "position"], negative: true },
    s16: { className: "16", value: rem(4), groups: ["dimension", "position"], negative: true },

    s20: { className: "20", value: rem(5), groups: ["dimension", "position"], negative: true },
    s24: { className: "24", value: rem(6), groups: ["dimension", "position"], negative: true },
    s28: { className: "28", value: rem(7), groups: ["dimension", "position"], negative: true },
    s32: { className: "32", value: rem(8), groups: ["dimension", "position"], negative: true },
    s36: { className: "36", value: rem(9), groups: ["dimension", "position"], negative: true },
    s40: { className: "40", value: rem(10), groups: ["dimension", "position"], negative: true },
    s44: { className: "44", value: rem(11), groups: ["dimension", "position"], negative: true },
    s48: { className: "48", value: rem(12), groups: ["dimension", "position"], negative: true },
    s52: { className: "52", value: rem(13), groups: ["dimension", "position"], negative: true },
    s56: { className: "56", value: rem(14), groups: ["dimension", "position"], negative: true },
    s60: { className: "60", value: rem(15), groups: ["dimension", "position"], negative: true },
    s64: { className: "64", value: rem(16), groups: ["dimension", "position"], negative: true },
    s72: { className: "72", value: rem(18), groups: ["dimension", "position"], negative: true },
    s80: { className: "80", value: rem(20), groups: ["dimension", "position"], negative: true },
    s96: { className: "96", value: rem(24), groups: ["dimension", "position"], negative: true },
};

const fractionTokens = {
    full: { className: "full", value: "100%", groups: ["semantic-spacing", "dimension", "position"] },

    half: { className: "1/2", value: "50%", groups: ["semantic-spacing", "dimension", "position"], negative: true },

    third: { className: "1/3", value: "33.333333%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    twoThirds: { className: "2/3", value: "66.666667%", groups: ["semantic-spacing", "dimension", "position"], negative: true },

    quarter: { className: "1/4", value: "25%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    threeQuarters: { className: "3/4", value: "75%", groups: ["semantic-spacing", "dimension", "position"], negative: true },

    fifth: { className: "1/5", value: "20%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    twoFifths: { className: "2/5", value: "40%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    threeFifths: { className: "3/5", value: "60%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    fourFifths: { className: "4/5", value: "80%", groups: ["semantic-spacing", "dimension", "position"], negative: true },

    sixth: { className: "1/6", value: "16.666667%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    twoSixths: { className: "2/6", value: "33.333333%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    threeSixths: { className: "3/6", value: "50%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    fourSixths: { className: "4/6", value: "66.666667%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    fiveSixths: { className: "5/6", value: "83.333333%", groups: ["semantic-spacing", "dimension", "position"], negative: true },

    twelfth: { className: "1/12", value: "8.333333%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    twoTwelfths: { className: "2/12", value: "16.666667%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    threeTwelfths: { className: "3/12", value: "25%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    fourTwelfths: { className: "4/12", value: "33.333333%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    fiveTwelfths: { className: "5/12", value: "41.666667%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    sixTwelfths: { className: "6/12", value: "50%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    sevenTwelfths: { className: "7/12", value: "58.333333%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    eightTwelfths: { className: "8/12", value: "66.666667%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    nineTwelfths: { className: "9/12", value: "75%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    tenTwelfths: { className: "10/12", value: "83.333333%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
    elevenTwelfths: { className: "11/12", value: "91.666667%", groups: ["semantic-spacing", "dimension", "position"], negative: true },
};

export const tokens = {
    ...semanticSpacingTokens,
    ...numericLengthTokens,
    ...fractionTokens,
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
 *
 * Prefix entry types:
 *   - { property, axis }: axis-specific. Only tokens whose `axis` matches generate a
 *     utility. Uses `token.className` as the class suffix.
 *   - { type: "combined", inlineProperty, blockProperty, shorthandProperty, negative }:
 *     for tokens with a matching x/y pair (same `className`), generates a two-property
 *     utility: `p-xs { padding-inline: …horiz-xs; padding-block: …vert-xs; }`
 *     for axis-agnostic tokens, generates a single shorthand: `p-0 { padding: 0; }`
 *
 * @type {Record<string, Record<string, string | object>>}
 */
export const propertyGroups = {
    "semantic-spacing": {
        // Padding (x-axis)
        pl: { property: "padding-left",   axis: "x" },
        pr: { property: "padding-right",  axis: "x" },
        px: { property: "padding-inline", axis: "x" },

        // Padding (y-axis)
        pt: { property: "padding-top",    axis: "y" },
        pb: { property: "padding-bottom", axis: "y" },
        py: { property: "padding-block",  axis: "y" },

        // Margin (x-axis)
        ml: { property: "margin-left",   axis: "x" },
        mr: { property: "margin-right",  axis: "x" },
        mx: { property: "margin-inline", axis: "x" },

        // Margin (y-axis)
        mt: { property: "margin-top",    axis: "y" },
        mb: { property: "margin-bottom", axis: "y" },
        my: { property: "margin-block",  axis: "y" },

        // Gap (x-axis)
        "gap-x": { property: "column-gap", axis: "x" },

        // Gap (y-axis)
        "gap-y": { property: "row-gap", axis: "y" },

        // Combined: two properties from x/y token pairs; shorthand for axis-agnostic tokens
        p:   { type: "combined", inlineProperty: "padding-inline", blockProperty: "padding-block", shorthandProperty: "padding", negative: false },
        m:   { type: "combined", inlineProperty: "margin-inline",  blockProperty: "margin-block",  shorthandProperty: "margin",  negative: true  },
        gap: { type: "combined", inlineProperty: "column-gap",     blockProperty: "row-gap",       shorthandProperty: "gap",     negative: false },
    },

    dimension: {
        // Width properties use x-axis tokens; height properties use y-axis tokens.
        // Axis-agnostic tokens (fractions, numeric) still generate for all prefixes.
        w:       { property: "width",      axis: "x" },
        "min-w": { property: "min-width",  axis: "x" },
        "max-w": { property: "max-width",  axis: "x" },
        h:       { property: "height",     axis: "y" },
        "min-h": { property: "min-height", axis: "y" },
        "max-h": { property: "max-height", axis: "y" },
    },

    position: {
        // Physical axis-specific properties
        top:    { property: "top",    axis: "y" },
        right:  { property: "right",  axis: "x" },
        bottom: { property: "bottom", axis: "y" },
        left:   { property: "left",   axis: "x" },

        // Logical axis-specific properties
        "inset-x": { property: "inset-inline", axis: "x" },
        "inset-y": { property: "inset-block",  axis: "y" },

        // Combined: inset-inline + inset-block for x/y pairs; inset shorthand for axis-agnostic
        inset: { type: "combined", inlineProperty: "inset-inline", blockProperty: "inset-block", shorthandProperty: "inset", negative: true },
    },
};
