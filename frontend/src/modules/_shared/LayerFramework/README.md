# Data Provider Framework

## Content

- [Data Provider Framework](#data-provider-framework)
  - [Content](#content)
  - [Overview](#overview)
  - [Add new settings](#add-new-settings)
  - [Add new data provider](#add-new-data-provider)

## Overview

![Data Provider Framework](../../../assets/DataProviderFramework.png)

The framework consists of two parts: a data provider framework and a visualization factory. In the former, custom data providers can be defined that consist of a set of settings, a dependency graph between these, and a data fetching function. In the latter, a set of functions for visualizing the fetched data can be registered for each of the layers for a given visualization target (e.g. DeckGL, Videx or ESV).

## Add new settings

Base folder: `@modules/_shared/DataProviderFramework/settings`

1. Open file `settingsDefinitions.ts`
2. Add new setting to `Setting` enum
3. Assign a category in `settingCategories` mapping
4. Assign a TS type in `SettingTypes`
5. Go to the `implementations` directory. There might already be a setting implementation that you can reuse. Check the existing ones and see if you find one with the same value type and a fitting implementation. If you find a proper setting, continue with step 8.
6. Create a new file with the new setting name in `implementations` and create a new class that implements the `CustomSettingImplementation` interface
    ```typescript
    type ValueType = string | null;
    export class MySetting implements CustomSettingImplementation<ValueType, SettingCategory.BOOLEAN> {
     ...
     }
    ```
7. Implement all methods that you need. The only one that is required is `makeComponent` in which you have to define the React component used for creating a GUI for your setting.
8. In the base folder, open the file `registerAllSettings.ts` and register your new setting.
    ```typescript
    SettingRegistry.registerSetting(Setting.MY_SETTING, "My Setting", CustomSettingImplementation);
    ```
    In order to add a new setting, you have to create a new file in the `@modules/_shared/DataProviderFramework/settings/implementations` directory.

## Add new data provider

When implementing a new data provider you have to evaluate if the provider is going to be shared among multiple modules or only used in a single one. In the former case, you want to add the new provider to `@modules/_shared/DataProviderFramework/providers`, otherwise you add it to your module's directory. When adding the provider to the shared directory, open the file `providerTypes.ts` and add the provider type to the enum.
Create a new custom provider file (when shared in the `implementations` folder).

1. Create a constant holding the provider's settings as a tuple of `Setting` enum values and create a type based upon this constant.
    ```typescript
    const MY_PROVIDER_SETTINGS = [Setting.MY_SETTING_1, Setting.MY_SETTING_2, ...];
    const MyProviderSettings = typeof MY_PROVIDER_SETTINGS;
    ```
2. You can automatically create the respective mapping between the setting enums and the types by using
    ```typescript
    type SettingsWithTypes = MakeSettingTypesMap<MyProviderSettings>;
    ```
