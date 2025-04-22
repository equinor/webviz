import { BooleanSetting } from "../implementations/BooleanSetting";
import { ColorScaleSetting } from "../implementations/ColorScaleSetting";
import { DrilledWellboresSetting } from "../implementations/DrilledWellboresSetting";
import { DropdownNumberSetting } from "../implementations/DropdownNumberSetting";
import { DropdownStringSetting } from "../implementations/DropdownStringSetting";
import { EnsembleSetting } from "../implementations/EnsembleSetting";
import { Direction as GridLayerRangeDirection, GridLayerRangeSetting } from "../implementations/GridLayerRangeSetting";
import { Direction as GridLayerDirection, GridLayerSetting } from "../implementations/GridLayerSetting";
import { IntersectionSetting } from "../implementations/IntersectionSetting";
import { SeismicSliceDirection, SeismicSliceSetting } from "../implementations/SeismicSliceSetting";
import { SensitivitySetting } from "../implementations/SensitivitySetting";
import { StatisticFunctionSetting } from "../implementations/StatisticFunctionSetting";
import { SettingRegistry } from "./_SettingRegistry";
import { Setting } from "../settingsDefinitions";

SettingRegistry.registerSetting(Setting.ATTRIBUTE, "Attribute", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.ENSEMBLE, "Ensemble", EnsembleSetting);
SettingRegistry.registerSetting(Setting.COLOR_SCALE, "Color Scale", ColorScaleSetting);

SettingRegistry.registerSetting(Setting.GRID_LAYER_K, "Grid Layer K", GridLayerSetting, {
    customConstructorParameters: [GridLayerDirection.K],
});
SettingRegistry.registerSetting(Setting.GRID_LAYER_K_RANGE, "Grid Layer K Range", GridLayerRangeSetting, {
    customConstructorParameters: [GridLayerRangeDirection.I],
});
SettingRegistry.registerSetting(Setting.GRID_LAYER_I_RANGE, "Grid Layer I Range", GridLayerRangeSetting, {
    customConstructorParameters: [GridLayerRangeDirection.J],
});
SettingRegistry.registerSetting(Setting.GRID_LAYER_J_RANGE, "Grid Layer J Range", GridLayerRangeSetting, {
    customConstructorParameters: [GridLayerRangeDirection.K],
});
SettingRegistry.registerSetting(Setting.GRID_NAME, "Grid Name", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.INTERSECTION, "Intersection", IntersectionSetting);
SettingRegistry.registerSetting(Setting.POLYGONS_ATTRIBUTE, "Polygons Attribute", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.POLYGONS_NAME, "Polygons Name", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.REALIZATION, "Realization", DropdownNumberSetting);
SettingRegistry.registerSetting(Setting.SEISMIC_CROSSLINE, "Seismic Crossline", SeismicSliceSetting, {
    customConstructorParameters: [SeismicSliceDirection.CROSSLINE],
});
SettingRegistry.registerSetting(Setting.SEISMIC_DEPTH_SLICE, "Seismic Depth Slice", SeismicSliceSetting, {
    customConstructorParameters: [SeismicSliceDirection.DEPTH],
});
SettingRegistry.registerSetting(Setting.SEISMIC_INLINE, "Seismic Inline", SeismicSliceSetting, {
    customConstructorParameters: [SeismicSliceDirection.INLINE],
});
SettingRegistry.registerSetting(Setting.SENSITIVITY, "Sensitivity", SensitivitySetting);
SettingRegistry.registerSetting(Setting.SHOW_GRID_LINES, "Show Grid Lines", BooleanSetting);
SettingRegistry.registerSetting(Setting.SMDA_WELLBORE_HEADERS, "SMDA Wellbore Headers", DrilledWellboresSetting);
SettingRegistry.registerSetting(Setting.STATISTIC_FUNCTION, "Statistic Function", StatisticFunctionSetting);
SettingRegistry.registerSetting(Setting.SURFACE_NAME, "Surface Name", DropdownStringSetting);
SettingRegistry.registerSetting(Setting.TIME_OR_INTERVAL, "Time or Interval", DropdownStringSetting);
