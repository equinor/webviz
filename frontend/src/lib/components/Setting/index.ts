import { Field } from "./_components/Field";
import { Panel } from "./_components/Panel";
import { ScrollArea } from "./_components/ScrollArea";
import { Section } from "./_components/Section";

export const Setting = { Field, Panel, ScrollArea, Section };

export type { SettingAnnotation, SettingFieldProps } from "./_components/Field";
export type { PanelProps as SettingPanelProps } from "./_components/Panel";
export type { ScrollAreaProps as SettingScrollAreaProps } from "./_components/ScrollArea";
export type { SectionProps as SettingSectionProps } from "./_components/Section";
export { LayoutContext as SettingLayoutContext } from "./_components/Panel";
