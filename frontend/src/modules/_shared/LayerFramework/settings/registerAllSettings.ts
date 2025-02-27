import { SettingRegistry } from "./SettingRegistry";
import { AttributeSetting } from "./implementations/AttributeSetting";
import { SettingType } from "./settingsTypes";

SettingRegistry.registerSetting(SettingType.ATTRIBUTE, AttributeSetting);
