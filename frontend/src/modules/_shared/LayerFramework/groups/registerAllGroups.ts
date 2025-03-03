import { GroupRegistry } from "./GroupRegistry";
import { IntersectionView } from "./implementations/IntersectionView";
import { View } from "./implementations/View";

GroupRegistry.registerSetting("View", View);
GroupRegistry.registerSetting("Intersection View", IntersectionView);
