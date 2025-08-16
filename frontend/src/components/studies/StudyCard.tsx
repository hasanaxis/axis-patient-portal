import React from 'react';
import { 
  Study, 
  Modality, 
  StudyStatus, 
  Priority,
  StudyViewStatus,
  ShareStatus 
} from '../../../../shared/src/types';
import { format } from 'date-fns';
import StudyStatusBadge from './StudyStatusBadge';
import './StudyCard.css';

interface StudyCardProps {
  study: Study;
  viewMode: 'grid' | 'list';
  onClick?: () => void;
}

const StudyCard: React.FC<StudyCardProps> = ({ study, viewMode, onClick }) => {
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

  const getModalityName = (modality: Modality): string => {
    const names: Record<Modality, string> = {
      [Modality.DX]: 'Digital X-Ray',
      [Modality.CT]: 'CT Scan',
      [Modality.MR]: 'MRI',
      [Modality.US]: 'Ultrasound',
      [Modality.MG]: 'Mammography',
      [Modality.NM]: 'Nuclear Medicine',
      [Modality.PT]: 'PET Scan',
      [Modality.CR]: 'Computed Radiography',
      [Modality.RF]: 'Fluoroscopy',
      [Modality.SC]: 'Secondary Capture',
      [Modality.XA]: 'Angiography',
      [Modality.XR]: 'X-Ray'
    };
    return names[modality] || modality;
  };

  const getThumbnailUrl = () => {
    if (study.series?.[0]?.images?.[0]?.thumbnailUrl) {
      return study.series[0].images[0].thumbnailUrl;
    }
    return `/placeholder-${study.modality.toLowerCase()}.jpg`;
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

  if (viewMode === 'list') {
    return (
      <div className="study-card-list" onClick={onClick}>
        <div className="study-list-thumbnail">
          <img src={getThumbnailUrl()} alt={study.studyDescription} />
          <div className="modality-overlay" style={{ background: getModalityColor(study.modality) }}>
            {study.modality}
          </div>
        </div>

        <div className="study-list-content">
          <div className="study-list-header">
            <h3 className="study-list-title">{study.studyDescription || 'Medical Imaging Study'}</h3>
            <div className="study-list-badges">
              {study.viewStatus === StudyViewStatus.NEW && (
                <span className="axis-badge axis-badge-new">New</span>
              )}
              {study.priority === Priority.URGENT && (
                <span className="axis-badge axis-badge-urgent">Urgent</span>
              )}
              {study.criticalFindings && (
                <span className="axis-badge axis-badge-critical">Critical</span>
              )}
              {study.report && (
                <span className="axis-badge axis-badge-final">Report Ready</span>
              )}
            </div>
          </div>

          <div className="study-list-details">
            <span className="detail-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 4v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              {format(new Date(study.studyDate), 'dd MMM yyyy')}
            </span>
            <span className="detail-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 6h10M6 3v10" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              {study.numberOfSeries} series, {study.numberOfInstances} images
            </span>
            <span className="detail-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {formatFileSize(study.studySize)}
            </span>
            {study.bodyPartExamined && (
              <span className="detail-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 14v-4l4-2 4 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {study.bodyPartExamined}
              </span>
            )}
          </div>

          <div className="study-list-meta">
            <span className="meta-item">Acc: {study.accessionNumber}</span>
            {study.referringPhysician && (
              <span className="meta-item">Ref: {study.referringPhysician}</span>
            )}
            {study.performingPhysician && (
              <span className="meta-item">Rad: {study.performingPhysician}</span>
            )}
          </div>
        </div>

        <div className="study-list-actions">
          <StudyStatusBadge status={study.status} />
          {study.shareStatus === ShareStatus.SHARED_WITH_GP && (
            <div className="share-indicator" title="Shared with GP">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 10l3 3 7-7" stroke="#00A496" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="study-card" onClick={onClick}>
      <div className="study-card-header">
        <div 
          className="modality-badge"
          style={{ background: `linear-gradient(135deg, ${getModalityColor(study.modality)}, ${getModalityColor(study.modality)}dd)` }}
        >
          {study.modality}
        </div>
        <div className="study-date">
          {format(new Date(study.studyDate), 'dd MMM yyyy')}
        </div>
      </div>

      <div className="study-thumbnail">
        <img src={getThumbnailUrl()} alt={study.studyDescription} />
        {study.viewStatus === StudyViewStatus.NEW && (
          <div className="new-indicator">NEW</div>
        )}
        {study.criticalFindings && (
          <div className="critical-indicator">!</div>
        )}
      </div>

      <div className="study-card-content">
        <h3 className="study-card-title">
          {study.studyDescription || 'Medical Imaging Study'}
        </h3>
        
        <div className="study-info">
          <div className="info-row">
            <span className="info-label">Body Part:</span>
            <span className="info-value">{study.bodyPartExamined || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Images:</span>
            <span className="info-value">{study.numberOfInstances}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Series:</span>
            <span className="info-value">{study.numberOfSeries}</span>
          </div>
        </div>

        <div className="study-card-footer">
          <StudyStatusBadge status={study.status} />
          {study.report && (
            <button className="view-report-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 2h8l2 2v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 7h4M6 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyCard;