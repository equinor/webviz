import { Banner } from "./_components/Banner";
import { Field } from "./_components/Field";
import { Panel } from "./_components/Panel";
import { ScrollArea } from "./_components/ScrollArea";
import { Section } from "./_components/Section";

export const Setting = { Banner, Field, Panel, ScrollArea, Section };

export type { SettingAnnotation, SettingFieldProps, Overlay as SettingOverlay } from "./_components/Field";
export type { PanelProps as SettingPanelProps } from "./_components/Panel";
export type { ScrollAreaProps as SettingScrollAreaProps } from "./_components/ScrollArea";
export type { SectionProps as SettingSectionProps } from "./_components/Section";
export type { BannerProps as SettingBannerProps, BannerType as SettingBannerType } from "./_components/Banner";
export { LayoutContext as SettingLayoutContext } from "./_components/Panel";
export type { FieldAnnotationsReporter } from "./_components/PanelAnnotationsContext";
export type { FieldOverlayReporter } from "./_components/PanelOverlaysContext";
export type {
    BannerMessage as SettingBannerMessage,
    BannerMessageReporter,
} from "./_components/PanelBannerMessagesContext";
