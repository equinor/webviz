import type { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { IntersectionViewSettings } from "@modules/_shared/DataProviderFramework/groups/implementations/IntersectionView";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { GroupCustomPropsCollector } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { TargetViewReturnTypes } from "@modules/Intersection/view/components/DataProvidersWrapper";

import { createValidExtensionLength } from "../utils/extensionLengthUtils";

export const makeEsvViewDataCollection: GroupCustomPropsCollector<
    IntersectionViewSettings,
    GroupType.INTERSECTION_VIEW,
    TargetViewReturnTypes
> = ({ getSetting }) => {
    const intersection = getSetting(Setting.INTERSECTION);
    const extensionLength = createValidExtensionLength(intersection, getSetting(Setting.WELLBORE_EXTENSION_LENGTH));

    return {
        intersection: intersection,
        extensionLength: extensionLength,
    };
};
