import { SortDirection } from "./typesAndEnums";

export function getNextSortDirection(currentSortDirection: SortDirection) {
    const directions = [SortDirection.DESC, SortDirection.ASC, SortDirection.NONE];

    const currentIndex = directions.indexOf(currentSortDirection);
    const nextIndex = (currentIndex + 1) % directions.length;

    return directions[nextIndex];
}
