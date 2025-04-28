// import { IntersectionType } from "@framework/types/intersection";
import type { TargetViewReturnTypes } from "@modules/IntersectionNew/view/components/DataProvidersWrapper";
import type { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { IntersectionViewSettings } from "@modules/_shared/DataProviderFramework/groups/implementations/IntersectionView";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { GroupCustomPropsCollector } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export const makeEsvViewDataCollection: GroupCustomPropsCollector<
    IntersectionViewSettings,
    GroupType.INTERSECTION_VIEW,
    TargetViewReturnTypes
> = ({ getSetting }) => {
    const intersection = getSetting(Setting.INTERSECTION);
    const intersectionExtensionLength = getSetting(Setting.INTERSECTION_EXTENSION_LENGTH);

    // if (!intersection) {
    //     throw new Error("Intersection is not defined");
    // }
    // if (intersection.type === IntersectionType.WELLBORE && intersectionExtensionLength === null) {
    //     throw new Error("Intersection extension length is not defined for wellbore intersection");
    // }

    return {
        intersection: intersection,
        extensionLength: intersectionExtensionLength,
    };
};
