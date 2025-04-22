import { GroupRegistry } from "./GroupRegistry";
import { GroupType } from "./groupTypes";
import { View } from "./implementations/View";

GroupRegistry.registerGroup(GroupType.VIEW, View);
