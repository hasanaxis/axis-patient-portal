import React from 'react';
import { Series, Modality } from '../../../../shared/src/types';
import './SeriesNavigator.css';

interface SeriesNavigatorProps {
  series: Series[];
  currentSeries: Series | null;
  onSeriesChange: (series: Series) => void;
}

const SeriesNavigator: React.FC<SeriesNavigatorProps> = ({
  series,
  currentSeries,
  onSeriesChange
}) => {
  const getModalityColor = (modality: Modality): string => {
    const colors: Record<Modality, string> = {
      [Modality.DX]: '#662D91',
      [Modality.CT]: '#006CB3',
      [Modality.MR]: '#B41E8E',
      [Modality.US]: '#00A496',
      [Modality.MG]: '#EC008C',
      [Modality.NM]: '#262262',
      [Modality.PT]: '#662D91',
      [Modality.CR]: '#606A70',
      [Modality.RF]: '#3C4247',
      [Modality.SC]: '#C4CED4',
      [Modality.XA]: '#B41E8E',
      [Modality.XR]: '#262262'
    };
    return colors[modality] || '#606A70';
  };

  const getThumbnailUrl = (seriesItem: Series): string => {
    if (seriesItem.images?.[0]?.thumbnailUrl) {
      return seriesItem.images[0].thumbnailUrl;
    }
    return `/placeholder-${seriesItem.modality.toLowerCase()}.jpg`;
  };

  const formatFileSize = (bytes: bigint | number | undefined): string => {
    if (!bytes) return 'N/A';
    const size = typeof bytes === 'bigint' ? Number(bytes) : bytes;
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    let value = size;
    
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
    }
    
    return `${value.toFixed(1)} ${units[index]}`;
  };

  return (
    <div className="series-navigator">
      <div className="navigator-header">
        <h3>Series ({series.length})</h3>
      </div>
      
      <div className="series-list">
        {series.map((seriesItem, index) => (
          <div
            key={seriesItem.id}
            className={`series-item ${currentSeries?.id === seriesItem.id ? 'active' : ''}`}
            onClick={() => onSeriesChange(seriesItem)}
          >
            <div className="series-thumbnail">
              <img 
                src={getThumbnailUrl(seriesItem)} 
                alt={seriesItem.seriesDescription || 'Series'}
              />
              <div 
                className="modality-badge"
                style={{ backgroundColor: getModalityColor(seriesItem.modality) }}
              >
                {seriesItem.modality}
              </div>
            </div>
            
            <div className="series-info">
              <div className="series-header">
                <div className="series-number">#{seriesItem.seriesNumber || index + 1}</div>
                <div className="series-title">
                  {seriesItem.seriesDescription || 'Unnamed Series'}
                </div>
              </div>
              
              <div className="series-details">
                <div className="detail-row">
                  <span className="detail-label">Images:</span>
                  <span className="detail-value">{seriesItem.numberOfInstances}</span>
                </div>
                
                {seriesItem.sliceThickness && (
                  <div className="detail-row">
                    <span className="detail-label">Thickness:</span>
                    <span className="detail-value">{seriesItem.sliceThickness}mm</span>
                  </div>
                )}
                
                <div className="detail-row">
                  <span className="detail-label">Size:</span>
                  <span className="detail-value">{formatFileSize(seriesItem.seriesSize)}</span>
                </div>
                
                {seriesItem.protocolName && (
                  <div className="detail-row">
                    <span className="detail-label">Protocol:</span>
                    <span className="detail-value">{seriesItem.protocolName}</span>
                  </div>
                )}
              </div>
              
              {seriesItem.seriesComments && (
                <div className="series-comments">
                  {seriesItem.seriesComments}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeriesNavigator;