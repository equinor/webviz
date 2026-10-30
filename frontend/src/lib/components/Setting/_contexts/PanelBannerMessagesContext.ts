import React from "react";

/** A message reported by a `Setting.Banner`. */
export type BannerMessage = {
    /** The severity of the banner. */
    type: "warning" | "info" | "error";
    /** The banner title. */
    message: string;
};

/**
 * Reports a Setting.Banner's current message to an ancestor, keyed by banner id. `null` retracts the
 * entry (banner unmounted).
 */
export type BannerMessageReporter = (bannerId: string, message: BannerMessage | null) => void;

/**
 * Panel-scoped banner-message context: `Setting.Panel` provides this so descendant `Setting.Banner`s can
 * report their message, aggregated and forwarded to `onBannerMessagesChange`. Defaults to `undefined`
 * (no-op) when used standalone (e.g. Storybook/tests).
 */
export const PanelBannerMessagesContext = React.createContext<BannerMessageReporter | undefined>(undefined);
