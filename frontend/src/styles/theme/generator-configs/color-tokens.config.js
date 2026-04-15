/**
 * Color token definitions mapping semantic utility names to EDS CSS variables.
 *
 * This file is the single source of truth for color utilities. Run the generator to
 * regenerate colors.css:
 *
 *   npm run generate:color-utilities
 */

/** @type {Record<string, string>} */
export const fills = {
    // Surface / background
    canvas: "--eds-color-bg-neutral-canvas",
    surface: "--eds-color-bg-neutral-surface",
    floating: "--eds-color-bg-floating",
    // EDS uses --eds-color-text-strong as the background for snackbars and tooltips
    "floating-inverted": "--eds-color-text-strong",
    backdrop: "--eds-color-bg-backdrop",
    input: "--eds-color-bg-input",

    // Neutral
    "neutral-canvas": "--eds-color-bg-neutral-canvas",
    "neutral-surface": "--eds-color-bg-neutral-surface",
    neutral: "--eds-color-bg-neutral-fill-muted-default",
    "neutral-hover": "--eds-color-bg-neutral-fill-muted-hover",
    "neutral-active": "--eds-color-bg-neutral-fill-muted-active",
    "neutral-strong": "--eds-color-bg-neutral-fill-emphasis-default",
    "neutral-strong-hover": "--eds-color-bg-neutral-fill-emphasis-hover",
    "neutral-strong-active": "--eds-color-bg-neutral-fill-emphasis-active",

    // Accent
    "accent-canvas": "--eds-color-bg-accent-canvas",
    "accent-surface": "--eds-color-bg-accent-surface",
    accent: "--eds-color-bg-accent-fill-muted-default",
    "accent-hover": "--eds-color-bg-accent-fill-muted-hover",
    "accent-active": "--eds-color-bg-accent-fill-muted-active",
    "accent-strong": "--eds-color-bg-accent-fill-emphasis-default",
    "accent-strong-hover": "--eds-color-bg-accent-fill-emphasis-hover",
    "accent-strong-active": "--eds-color-bg-accent-fill-emphasis-active",

    // Success
    "success-canvas": "--eds-color-bg-success-canvas",
    "success-surface": "--eds-color-bg-success-surface",
    success: "--eds-color-bg-success-fill-muted-default",
    "success-hover": "--eds-color-bg-success-fill-muted-hover",
    "success-active": "--eds-color-bg-success-fill-muted-active",
    "success-strong": "--eds-color-bg-success-fill-emphasis-default",
    "success-strong-hover": "--eds-color-bg-success-fill-emphasis-hover",
    "success-strong-active": "--eds-color-bg-success-fill-emphasis-active",

    // Info
    "info-canvas": "--eds-color-bg-info-canvas",
    "info-surface": "--eds-color-bg-info-surface",
    info: "--eds-color-bg-info-fill-muted-default",
    "info-hover": "--eds-color-bg-info-fill-muted-hover",
    "info-active": "--eds-color-bg-info-fill-muted-active",
    "info-strong": "--eds-color-bg-info-fill-emphasis-default",
    "info-strong-hover": "--eds-color-bg-info-fill-emphasis-hover",
    "info-strong-active": "--eds-color-bg-info-fill-emphasis-active",

    // Warning
    "warning-canvas": "--eds-color-bg-warning-canvas",
    "warning-surface": "--eds-color-bg-warning-surface",
    warning: "--eds-color-bg-warning-fill-muted-default",
    "warning-hover": "--eds-color-bg-warning-fill-muted-hover",
    "warning-active": "--eds-color-bg-warning-fill-muted-active",
    "warning-strong": "--eds-color-bg-warning-fill-emphasis-default",
    "warning-strong-hover": "--eds-color-bg-warning-fill-emphasis-hover",
    "warning-strong-active": "--eds-color-bg-warning-fill-emphasis-active",

    // Danger
    "danger-canvas": "--eds-color-bg-danger-canvas",
    "danger-surface": "--eds-color-bg-danger-surface",
    danger: "--eds-color-bg-danger-fill-muted-default",
    "danger-hover": "--eds-color-bg-danger-fill-muted-hover",
    "danger-active": "--eds-color-bg-danger-fill-muted-active",
    "danger-strong": "--eds-color-bg-danger-fill-emphasis-default",
    "danger-strong-hover": "--eds-color-bg-danger-fill-emphasis-hover",
    "danger-strong-active": "--eds-color-bg-danger-fill-emphasis-active",

    // Disabled
    disabled: "--eds-color-bg-fill-emphasis-disabled",
};

/** @type {Record<string, string>} */
export const strokes = {
    // Surface / background
    canvas: "--eds-color-bg-neutral-canvas",
    surface: "--eds-color-bg-neutral-surface",
    floating: "--eds-color-bg-floating",
    "floating-inverted": "--eds-color-text-strong",
    backdrop: "--eds-color-bg-backdrop",
    input: "--eds-color-bg-input",

    // Neutral
    "neutral-canvas": "--eds-color-bg-neutral-canvas",
    "neutral-surface": "--eds-color-bg-neutral-surface",
    neutral: "--eds-color-bg-neutral-fill-muted-default",
    "neutral-hover": "--eds-color-bg-neutral-fill-muted-hover",
    "neutral-active": "--eds-color-bg-neutral-fill-muted-active",
    "neutral-strong": "--eds-color-bg-neutral-fill-emphasis-default",
    "neutral-strong-hover": "--eds-color-bg-neutral-fill-emphasis-hover",
    "neutral-strong-active": "--eds-color-bg-neutral-fill-emphasis-active",

    // Accent
    "accent-canvas": "--eds-color-bg-accent-canvas",
    "accent-surface": "--eds-color-bg-accent-surface",
    accent: "--eds-color-bg-accent-fill-muted-default",
    "accent-hover": "--eds-color-bg-accent-fill-muted-hover",
    "accent-active": "--eds-color-bg-accent-fill-muted-active",
    "accent-strong": "--eds-color-bg-accent-fill-emphasis-default",
    "accent-strong-hover": "--eds-color-bg-accent-fill-emphasis-hover",
    "accent-strong-active": "--eds-color-bg-accent-fill-emphasis-active",

    // Success
    "success-canvas": "--eds-color-bg-success-canvas",
    "success-surface": "--eds-color-bg-success-surface",
    success: "--eds-color-bg-success-fill-muted-default",
    "success-hover": "--eds-color-bg-success-fill-muted-hover",
    "success-active": "--eds-color-bg-success-fill-muted-active",
    "success-strong": "--eds-color-bg-success-fill-emphasis-default",
    "success-strong-hover": "--eds-color-bg-success-fill-emphasis-hover",
    "success-strong-active": "--eds-color-bg-success-fill-emphasis-active",

    // Info
    "info-canvas": "--eds-color-bg-info-canvas",
    "info-surface": "--eds-color-bg-info-surface",
    info: "--eds-color-bg-info-fill-muted-default",
    "info-hover": "--eds-color-bg-info-fill-muted-hover",
    "info-active": "--eds-color-bg-info-fill-muted-active",
    "info-strong": "--eds-color-bg-info-fill-emphasis-default",
    "info-strong-hover": "--eds-color-bg-info-fill-emphasis-hover",
    "info-strong-active": "--eds-color-bg-info-fill-emphasis-active",

    // Warning
    "warning-canvas": "--eds-color-bg-warning-canvas",
    "warning-surface": "--eds-color-bg-warning-surface",
    warning: "--eds-color-bg-warning-fill-muted-default",
    "warning-hover": "--eds-color-bg-warning-fill-muted-hover",
    "warning-active": "--eds-color-bg-warning-fill-muted-active",
    "warning-strong": "--eds-color-bg-warning-fill-emphasis-default",
    "warning-strong-hover": "--eds-color-bg-warning-fill-emphasis-hover",
    "warning-strong-active": "--eds-color-bg-warning-fill-emphasis-active",

    // Danger
    "danger-canvas": "--eds-color-bg-danger-canvas",
    "danger-surface": "--eds-color-bg-danger-surface",
    danger: "--eds-color-bg-danger-fill-muted-default",
    "danger-hover": "--eds-color-bg-danger-fill-muted-hover",
    "danger-active": "--eds-color-bg-danger-fill-muted-active",
    "danger-strong": "--eds-color-bg-danger-fill-emphasis-default",
    "danger-strong-hover": "--eds-color-bg-danger-fill-emphasis-hover",
    "danger-strong-active": "--eds-color-bg-danger-fill-emphasis-active",

    // Disabled
    disabled: "--eds-color-bg-fill-emphasis-disabled",
};

/** @type {Record<string, string>} */
export const borders = {
    // Neutral
    "neutral-subtle": "--eds-color-border-neutral-subtle",
    neutral: "--eds-color-border-neutral-medium",
    "neutral-strong": "--eds-color-border-neutral-strong",

    // Accent
    "accent-subtle": "--eds-color-border-accent-subtle",
    accent: "--eds-color-border-accent-medium",
    "accent-strong": "--eds-color-border-accent-strong",

    // Success
    "success-subtle": "--eds-color-border-success-subtle",
    success: "--eds-color-border-success-medium",
    "success-strong": "--eds-color-border-success-strong",

    // Info
    "info-subtle": "--eds-color-border-info-subtle",
    info: "--eds-color-border-info-medium",
    "info-strong": "--eds-color-border-info-strong",

    // Warning
    "warning-subtle": "--eds-color-border-warning-subtle",
    warning: "--eds-color-border-warning-medium",
    "warning-strong": "--eds-color-border-warning-strong",

    // Danger
    "danger-subtle": "--eds-color-border-danger-subtle",
    danger: "--eds-color-border-danger-medium",
    "danger-strong": "--eds-color-border-danger-strong",

    // Special
    focus: "--eds-color-border-focus",
    disabled: "--eds-color-border-neutral-subtle",
};

/** @type {Record<string, string>} */
export const text = {
    // Neutral
    "neutral-subtle": "--eds-color-text-neutral-subtle",
    neutral: "--eds-color-text-neutral-default",
    "neutral-strong": "--eds-color-text-neutral-strong",
    "neutral-subtle-on-emphasis": "--eds-color-text-neutral-subtle-on-emphasis",
    "neutral-strong-on-emphasis": "--eds-color-text-neutral-strong-on-emphasis",

    // Accent
    "accent-subtle": "--eds-color-text-accent-subtle",
    accent: "--eds-color-text-accent-default",
    "accent-strong": "--eds-color-text-accent-strong",
    "accent-subtle-on-emphasis": "--eds-color-text-accent-subtle-on-emphasis",
    "accent-strong-on-emphasis": "--eds-color-text-accent-strong-on-emphasis",

    // Success
    "success-subtle": "--eds-color-text-success-subtle",
    success: "--eds-color-text-success-default",
    "success-strong": "--eds-color-text-success-strong",
    "success-subtle-on-emphasis": "--eds-color-text-success-subtle-on-emphasis",
    "success-strong-on-emphasis": "--eds-color-text-success-strong-on-emphasis",

    // Info
    "info-subtle": "--eds-color-text-info-subtle",
    info: "--eds-color-text-info-default",
    "info-strong": "--eds-color-text-info-strong",
    "info-subtle-on-emphasis": "--eds-color-text-info-subtle-on-emphasis",
    "info-strong-on-emphasis": "--eds-color-text-info-strong-on-emphasis",

    // Warning
    "warning-subtle": "--eds-color-text-warning-subtle",
    warning: "--eds-color-text-warning-default",
    "warning-strong": "--eds-color-text-warning-strong",
    "warning-subtle-on-emphasis": "--eds-color-text-warning-subtle-on-emphasis",
    "warning-strong-on-emphasis": "--eds-color-text-warning-strong-on-emphasis",

    // Danger
    "danger-subtle": "--eds-color-text-danger-subtle",
    danger: "--eds-color-text-danger-default",
    "danger-strong": "--eds-color-text-danger-strong",
    "danger-subtle-on-emphasis": "--eds-color-text-danger-subtle-on-emphasis",
    "danger-strong-on-emphasis": "--eds-color-text-danger-strong-on-emphasis",

    // Special
    link: "--eds-color-text-link",
    disabled: "--eds-color-text-neutral-subtle",
    "fill-disabled": "--eds-color-bg-fill-emphasis-disabled",
};
