import { BooleanSetting } from "../implementations/BooleanSetting";
import { ColorScaleSetting } from "../implementations/ColorScaleSetting";
import { DrilledWellboresSetting } from "../implementations/DrilledWellboresSetting";
import { DropdownNumberSetting } from "../implementations/DropdownNumberSetting";
import { DropdownStringSetting } from "../implementations/DropdownStringSetting";
import { EnsembleSetting } from "../implementations/EnsembleSetting";
import { GridLayerRangeSetting } from "../implementations/GridLayerRangeSetting";
import { Direction as GridLayerDirection, GridLayerSetting } from "../implementations/GridLayerSetting";
import { IntersectionSetting } from "../implementations/IntersectionSetting";
import { RangeSetting } from "../implementations/RangeSetting";
import { SeismicSliceSetting } from "../implementations/SeismicSliceSetting";
import { SelectStringSetting } from "../implementations/SelectStringSetting";
import { SensitivitySetting } from "../implementations/SensitivitySetting";
import { SingleColorSetting } from "../implementations/SingleColorSetting";
import { StatisticFunctionSetting } from "../implementations/StatisticFunctionSetting";
import { Setting } from "../settingsDefinitions";

import { SettingRegistry } from "./_SettingRegistry";

SettingRegistry.registerSetting(Setting.ATTRIBUTE, "Attribute", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.ENSEMBLE, "Ensemble", EnsembleSetting);
SettingRegistry.registerSetting(Setting.COLOR_SCALE, "Color Scale", ColorScaleSetting);

SettingRegistry.registerSetting(Setting.GRID_LAYER_K, "Grid Layer K", GridLayerSetting, {
    customConstructorParameters: [GridLayerDirection.K],
});
SettingRegistry.registerSetting(Setting.GRID_LAYER_RANGE, "Grid Ranges", GridLayerRangeSetting);
SettingRegistry.registerSetting(Setting.GRID_NAME, "Grid Name", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.INTERSECTION, "Intersection", IntersectionSetting);
SettingRegistry.registerSetting(Setting.POLYGONS_ATTRIBUTE, "Polygons Attribute", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.POLYGONS_NAME, "Polygons Name", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.REALIZATION, "Realization", DropdownNumberSetting);
SettingRegistry.registerSetting(Setting.SEISMIC_SLICES, "Seismic Slices", SeismicSliceSetting);
SettingRegistry.registerSetting(Setting.SENSITIVITY, "Sensitivity", SensitivitySetting);
SettingRegistry.registerSetting(Setting.SHOW_GRID_LINES, "Show Grid Lines", BooleanSetting);
SettingRegistry.registerSetting(Setting.SMDA_WELLBORE_HEADERS, "SMDA Wellbore Headers", DrilledWellboresSetting);
SettingRegistry.registerSetting(Setting.STATISTIC_FUNCTION, "Statistic Function", StatisticFunctionSetting);
SettingRegistry.registerSetting(Setting.SURFACE_NAME, "Surface Name", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.TIME_OR_INTERVAL, "Time or Interval", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.POLYLINES, "Polylines", SelectStringSetting);
SettingRegistry.registerSetting(Setting.OMIT_RANGE, "Omit Value Range", RangeSetting);
SettingRegistry.registerSetting(Setting.OMIT_COLOR, "Color for omitted Values", SingleColorSetting, {
    customConstructorParameters: [true],
});
