import React from 'react';
import { CheckCircleIcon } from './Icons';

interface FacilitiesListProps {
    facilities: string[];
}

export const FacilitiesList: React.FC<FacilitiesListProps> = ({ facilities }) => {
    if (!facilities || facilities.length === 0) {
        return <p>Informasi fasilitas tidak tersedia untuk paket ini.</p>;
    }

    return (
        <div className="facilities-row" role="list">
            {facilities.map((facility, index) => (
                <div key={index} className="facility-badge" role="listitem" title={facility}>
                    <span className="facility-badge-icon"><CheckCircleIcon /></span>
                    <span className="facility-badge-label">{facility}</span>
                </div>
            ))}
        </div>
    );
};