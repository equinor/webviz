import type { Slider as SliderBase } from "@base-ui/react/slider";

export type SliderChangeEventDetails =
    | SliderBase.Root.ChangeEventDetails
    | { reason: "clamp-value" }
    | { reason: "marker-clicked" }
    | { reason: "range-locked" };
// If we want to follow base-ui even more directly, use these
// | BaseUIChangeEventDetails<"clamp-min", SliderRootChangeEventCustomProperties>
// | BaseUIChangeEventDetails<"clamp-max", SliderRootChangeEventCustomProperties>;

export type SnapTarget = "nearest" | "next" | "prev";
