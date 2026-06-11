import { SettingWrapper as SettingWrapperBase } from "./_components/SettingWrapper";
import { Group } from "./_components/Group";
import { Section } from "./_components/Section";

export const SettingWrapper = Object.assign(SettingWrapperBase, { Group, Section });

export type { SettingAnnotation, SettingWrapperProps } from "./_components/SettingWrapper";
export type { GroupProps as SettingsGroupProps } from "./_components/Group";
export type { SectionProps as SettingsSectionProps } from "./_components/Section";
export { LayoutContext as SettingsLayoutContext } from "./_components/Group";
