import { GroupRegistry } from "./_GroupRegistry";
import { GroupType } from "../groupTypes";
import { View } from "../implementations/View";

GroupRegistry.registerGroup(GroupType.VIEW, View);
