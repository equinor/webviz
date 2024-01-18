import { ChannelReceiverChannelContent } from "@framework/DataChannelTypes";

export function makePlotTitle(content: ChannelReceiverChannelContent<any>, useLineBreak = true): string {
    let title = "";

    if (content.metaData.displayString) {
        title = content.metaData.displayString;
    } else {
        title = content.displayName;
    }

    if (content.metaData.unit) {
        title += `${useLineBreak ? "<br>" : " "}[${content.metaData.unit}]`;
    }

    return title;
}

export function makeHoverText(
    contentX: ChannelReceiverChannelContent<any>,
    contentY: ChannelReceiverChannelContent<any>,
    realization: number
): string {
    const nameX = makePlotTitle(contentX, false);
    const nameY = makePlotTitle(contentY, false);

    return `${nameX}: <b>%{x}</b><br>${nameY}: <b>%{y}</b><br>Realization: <b>${realization}</b>`;
}

export function makeHoverTextWithColor(
    contentX: ChannelReceiverChannelContent<any>,
    contentY: ChannelReceiverChannelContent<any>,
    contentColor: ChannelReceiverChannelContent<any>,
    realization: number
): string {
    const nameX = makePlotTitle(contentX, false);
    const nameY = makePlotTitle(contentY, false);
    const nameColor = makePlotTitle(contentColor, false);

    return `${nameX}: <b>%{x}</b><br>${nameY}: <b>%{y}</b><br>${nameColor}: <b>%{marker.color:,.0f}</b><br>Realization: <b>${realization}</b> `;
}
