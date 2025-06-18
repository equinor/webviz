import { BooleanSetting } from "../implementations/BooleanSetting";
import { ColorScaleSetting } from "../implementations/ColorScaleSetting";
import { ColorSetSetting } from "../implementations/ColorSetSetting";
import { DrilledWellborePicksSetting } from "../implementations/DrilledWellborePicksSetting";
import { DrilledWellboresSetting } from "../implementations/DrilledWellboresSetting";
import { DropdownNumberSetting } from "../implementations/DropdownNumberSetting";
import { DropdownStringSetting } from "../implementations/DropdownStringSetting";
import { EnsembleSetting } from "../implementations/EnsembleSetting";
import { GridLayerRangeSetting } from "../implementations/GridLayerRangeSetting";
import { Direction as GridLayerDirection, GridLayerSetting } from "../implementations/GridLayerSetting";
import { InputNumberSetting } from "../implementations/InputNumberSetting";
import { IntersectionSetting } from "../implementations/IntersectionSetting";
import { RangeSetting } from "../implementations/RangeSetting";
import { SeismicSliceSetting } from "../implementations/SeismicSliceSetting";
import { SelectNumberSetting } from "../implementations/SelectNumberSetting";
import { SelectStringSetting } from "../implementations/SelectStringSetting";
import { SensitivitySetting } from "../implementations/SensitivitySetting";
import { SingleColorSetting } from "../implementations/SingleColorSetting";
import { SliderNumberSetting } from "../implementations/SliderNumberSetting";
import { StatisticFunctionSetting } from "../implementations/StatisticFunctionSetting";
import { TimeOrIntervalSetting } from "../implementations/TimeOrIntervalSetting";
import { Setting } from "../settingsDefinitions";

import { SettingRegistry } from "./_SettingRegistry";

SettingRegistry.registerSetting(Setting.ATTRIBUTE, "Attribute", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.ENSEMBLE, "Ensemble", EnsembleSetting);
SettingRegistry.registerSetting(Setting.COLOR_SCALE, "Color Scale", ColorScaleSetting);
SettingRegistry.registerSetting(Setting.COLOR_SET, "Color Set", ColorSetSetting);

SettingRegistry.registerSetting(Setting.GRID_LAYER_K, "Grid Layer K", GridLayerSetting, {
    customConstructorParameters: [GridLayerDirection.K],
});
SettingRegistry.registerSetting(Setting.GRID_LAYER_RANGE, "Grid Ranges", GridLayerRangeSetting);
SettingRegistry.registerSetting(Setting.GRID_NAME, "Grid Name", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.INTERSECTION, "Intersection", IntersectionSetting);
SettingRegistry.registerSetting(Setting.OPACITY_PERCENT, "Color Opacity [%]", SliderNumberSetting, {
    customConstructorParameters: [{ minMax: { min: 0, max: 100 }, step: 1 }],
});
SettingRegistry.registerSetting(Setting.POLYGONS_ATTRIBUTE, "Polygons Attribute", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.POLYGONS_NAME, "Polygons Name", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.REALIZATION, "Realization", DropdownNumberSetting);
SettingRegistry.registerSetting(Setting.REALIZATIONS, "Realizations", SelectNumberSetting);
SettingRegistry.registerSetting(
    Setting.SAMPLE_RESOLUTION_IN_METERS,
    "Sample Resolution in Meters",
    InputNumberSetting,
    {
        customConstructorParameters: [{ min: 1.0, max: 50.0 }],
    },
);
SettingRegistry.registerSetting(Setting.SEISMIC_SLICES, "Seismic Slices", SeismicSliceSetting);
SettingRegistry.registerSetting(Setting.SENSITIVITY, "Sensitivity", SensitivitySetting);
SettingRegistry.registerSetting(Setting.SHOW_GRID_LINES, "Show Grid Lines", BooleanSetting);
SettingRegistry.registerSetting(Setting.SMDA_WELLBORE_HEADERS, "SMDA Wellbore Headers", DrilledWellboresSetting);
SettingRegistry.registerSetting(Setting.STATISTIC_FUNCTION, "Statistic Function", StatisticFunctionSetting);
SettingRegistry.registerSetting(Setting.SURFACE_NAME, "Surface Name", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.SURFACE_NAMES, "Surface Names", SelectStringSetting);
SettingRegistry.registerSetting(Setting.TIME_OR_INTERVAL, "Time or Interval", TimeOrIntervalSetting);
SettingRegistry.registerSetting(Setting.WELLBORE_EXTENSION_LENGTH, "Wellbore Extension Length", InputNumberSetting, {
    customConstructorParameters: [{ min: 0.0, max: 5000.0 }],
});
SettingRegistry.registerSetting(Setting.WELLBORE_PICK_IDENTIFIER, "Wellbore Pick Identifier", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.WELLBORE_PICKS, "Wellbore Picks", DrilledWellborePicksSetting);
SettingRegistry.registerSetting(Setting.OMIT_RANGE, "Omit Value Range", RangeSetting);
SettingRegistry.registerSetting(Setting.OMIT_COLOR, "Color for omitted Values", SingleColorSetting, {
    customConstructorParameters: [true],
});
