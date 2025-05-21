import { GroupType } from "../groupTypes";
import { IntersectionView } from "../implementations/IntersectionView";
import { View } from "../implementations/View";

import { GroupRegistry } from "./_GroupRegistry";

GroupRegistry.registerGroup(GroupType.VIEW, View);
GroupRegistry.registerGroup(GroupType.INTERSECTION_VIEW, IntersectionView);
