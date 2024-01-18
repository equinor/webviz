import { ChannelReceiverChannelContent } from "@framework/DataChannelTypes";

export function makeTitleFromChannelContent(content: ChannelReceiverChannelContent<any>, useLineBreak = true): string {
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
    const nameX = makeTitleFromChannelContent(contentX, false);
    const nameY = makeTitleFromChannelContent(contentY, false);

    return `${nameX}: <b>%{x}</b><br>${nameY}: <b>%{y}</b><br>Realization: <b>${realization}</b>`;
}

export function makeHoverTextWithColor(
    contentX: ChannelReceiverChannelContent<any>,
    contentY: ChannelReceiverChannelContent<any>,
    contentColor: ChannelReceiverChannelContent<any>,
    realization: number
): string {
    const nameX = makeTitleFromChannelContent(contentX, false);
    const nameY = makeTitleFromChannelContent(contentY, false);
    const nameColor = makeTitleFromChannelContent(contentColor, false);

    return `${nameX}: <b>%{x}</b><br>${nameY}: <b>%{y}</b><br>${nameColor}: <b>%{marker.color:,.0f}</b><br>Realization: <b>${realization}</b> `;
}
