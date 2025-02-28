import { SettingRegistry } from "./SettingRegistry";
import { BooleanSetting } from "./implementations/BooleanSetting";
import { DrilledWellboresSetting } from "./implementations/DrilledWellboresSetting";
import { DropdownNumberSetting } from "./implementations/DropdownNumberSetting";
import { DropdownStringSetting } from "./implementations/DropdownStringSetting";
import { EnsembleSetting } from "./implementations/EnsembleSetting";
import { Direction, GridLayerRangeSetting } from "./implementations/GridLayerRangeSetting";
import { IntersectionSetting } from "./implementations/IntersectionSetting";
import { SeismicSliceDirection, SeismicSliceSetting } from "./implementations/SeismicSliceSetting";
import { SensitivitySetting } from "./implementations/SensitivitySetting";
import { StatisticFunctionSetting } from "./implementations/StatisticFunctionSetting";
import { SettingType } from "./settingsTypes";

SettingRegistry.registerSetting(SettingType.ATTRIBUTE, "Attribute", DropdownStringSetting);
SettingRegistry.registerSetting(SettingType.ENSEMBLE, "Ensemble", EnsembleSetting);
SettingRegistry.registerSetting(SettingType.GRID_LAYER_K, "Grid Layer K", DropdownNumberSetting);
SettingRegistry.registerSetting(SettingType.GRID_LAYER_K_RANGE, "Grid Layer K Range", GridLayerRangeSetting, [
    Direction.I,
]);
SettingRegistry.registerSetting(SettingType.GRID_LAYER_I_RANGE, "Grid Layer I Range", GridLayerRangeSetting, [
    Direction.J,
]);
SettingRegistry.registerSetting(SettingType.GRID_LAYER_J_RANGE, "Grid Layer J Range", GridLayerRangeSetting, [
    Direction.K,
]);
SettingRegistry.registerSetting(SettingType.GRID_NAME, "Grid Name", DropdownStringSetting);
SettingRegistry.registerSetting(SettingType.INTERSECTION, "Intersection", IntersectionSetting);
SettingRegistry.registerSetting(SettingType.POLYGONS_ATTRIBUTE, "Polygons Attribute", DropdownStringSetting);
SettingRegistry.registerSetting(SettingType.POLYGONS_NAME, "Polygons Name", DropdownStringSetting);
SettingRegistry.registerSetting(SettingType.REALIZATION, "Realization", DropdownNumberSetting);
SettingRegistry.registerSetting(SettingType.SEISMIC_CROSSLINE, "Seismic Crossline", SeismicSliceSetting, [
    SeismicSliceDirection.CROSSLINE,
]);
SettingRegistry.registerSetting(SettingType.SEISMIC_DEPTH_SLICE, "Seismic Depth Slice", SeismicSliceSetting, [
    SeismicSliceDirection.DEPTH,
]);
SettingRegistry.registerSetting(SettingType.SEISMIC_INLINE, "Seismic Inline", SeismicSliceSetting, [
    SeismicSliceDirection.INLINE,
]);
SettingRegistry.registerSetting(SettingType.SENSITIVITY, "Sensitivity", SensitivitySetting);
SettingRegistry.registerSetting(SettingType.SHOW_GRID_LINES, "Show Grid Lines", BooleanSetting);
SettingRegistry.registerSetting(SettingType.SMDA_WELLBORE_HEADERS, "SMDA Wellbore Headers", DrilledWellboresSetting);
SettingRegistry.registerSetting(SettingType.STATISTIC_FUNCTION, "Statistic Function", StatisticFunctionSetting);
