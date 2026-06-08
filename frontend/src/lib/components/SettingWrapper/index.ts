import { SettingWrapper as SettingWrapperBase } from "./_components/SettingWrapper";
import { Group } from "./_components/Group";

export const SettingWrapper = Object.assign(SettingWrapperBase, { Group });

export type { SettingAnnotation, SettingWrapperProps } from "./_components/SettingWrapper";
export type { GroupProps as SettingsGroupProps } from "./_components/Group";
export { LayoutContext as SettingsLayoutContext } from "./_components/Group";
