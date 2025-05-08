import { GroupType } from "../groupTypes";
import { View } from "../implementations/View";

import { GroupRegistry } from "./_GroupRegistry";

GroupRegistry.registerGroup(GroupType.VIEW, View);
