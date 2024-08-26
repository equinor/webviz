import { VolumeDefinition, orderedVolumeDefinitions } from "@assets/volumeDefinitions";

/**
 * Returns volume definition for vector if it exists, otherwise returns null.
 *
 * @param volumeName - Volume name to get definition for.
 * @returns Volume definition for vector if it exists, otherwise returns null.
 */
export function getVolumeDefinition(volumeName: string): VolumeDefinition | null {
    if (volumeName in orderedVolumeDefinitions) {
        return orderedVolumeDefinitions[volumeName];
    }
    return null;
}

/**
 * Create hover text for requested volume name.
 *
 * @param volumeName - Volume name to create hover text for.
 * @returns Hover text for requested volume name.
 */
export function createHoverTextForVolume(volumeName: string): string {
    const volumeDefinition = getVolumeDefinition(volumeName);
    if (volumeDefinition) {
        return `${volumeDefinition.description}${volumeDefinition.unit ? ` [${volumeDefinition.unit}]` : ""}`;
    }
    return volumeName;
}
