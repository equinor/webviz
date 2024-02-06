import React from 'react';

type LegendItem = {
    color: string;
    label: string;
};


type LegendProps = {
    items: LegendItem[];
};

const Legend: React.FC<LegendProps> = ({ items }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {items.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginRight: 10 }}>
                    <div style={{
                        width: 20,
                        height: 20,
                        backgroundColor: item.color,
                        marginRight: 5,
                    }} />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
};
export default Legend;
