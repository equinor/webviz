import { GroupType } from "./groupTypes";
import { View } from "./implementations/View";

// Avoid issues with circular dependencies by using dynamic import
// for the GroupRegistry module and registering the groups after the module is loaded.
try {
    await import("./GroupRegistry").then(({ GroupRegistry }) => {
        GroupRegistry.registerGroup(GroupType.VIEW, View);
    });
} catch (error) {
    console.error("Error registering groups:", error);
}
