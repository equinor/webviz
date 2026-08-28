import { Provider } from "./_components/provider";
import { Tooltip as TooltipComp } from "./tooltip";

export type { TriggerProps as TooltipTriggerProps } from "./_components/trigger";
export type { PopupProps as TooltipPopupProps } from "./_components/popup";
export type { RootProps as TooltipRootProps } from "./_components/root";
export type { ProviderProps as TooltipProviderProps } from "./_components/provider";

export const Tooltip = Object.assign(TooltipComp, { Provider });
