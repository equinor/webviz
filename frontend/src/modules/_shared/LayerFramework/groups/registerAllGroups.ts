import { GroupRegistry } from "./GroupRegistry";
import { IntersectionView } from "./implementations/IntersectionView";
import { RealizationView } from "./implementations/RealizationView";
import { View } from "./implementations/View";

GroupRegistry.registerGroup("View", View);
GroupRegistry.registerGroup("IntersectionView", IntersectionView);
GroupRegistry.registerGroup("RealizationView", RealizationView);
