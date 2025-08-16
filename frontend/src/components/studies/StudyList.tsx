import React, { useState, useEffect } from 'react';
import { 
  Study, 
  StudyFilter, 
  Modality, 
  StudyStatus, 
  Priority,
  StudyViewStatus,
  ShareStatus 
} from '../../../../shared/src/types';
import { format } from 'date-fns';
import StudyFilterPanel from './StudyFilterPanel';
import StudyCard from './StudyCard';
import StudyStatusBadge from './StudyStatusBadge';
import '../../styles/axis-theme.css';
import './StudyList.css';

interface StudyListProps {
  patientId?: string;
  onStudySelect?: (study: Study) => void;
}

const StudyList: React.FC<StudyListProps> = ({ patientId, onStudySelect }) => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StudyFilter>({
    page: 1,
    limit: 20,
    sortBy: 'studyDate',
    sortOrder: 'desc'
  });
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchStudies();
  }, [filter, patientId]);

  const fetchStudies = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v.toString()));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/studies?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudies(data.data);
        setTotalPages(data.meta.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch studies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: Partial<StudyFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilter(prev => ({ ...prev, page }));
  };

  const getModalityIcon = (modality: Modality) => {
    const icons: Record<Modality, string> = {
      [Modality.DX]: '📷',
      [Modality.CT]: '🔄',
      [Modality.MR]: '🧲',
      [Modality.US]: '〰️',
      [Modality.MG]: '🎯',
      [Modality.NM]: '☢️',
      [Modality.PT]: '⚛️',
      [Modality.CR]: '📸',
      [Modality.RF]: '📹',
      [Modality.SC]: '📄',
      [Modality.XA]: '💉',
      [Modality.XR]: '✖️'
    };
    return icons[modality] || '📋';
  };

  const getStudyStats = () => {
    const newStudies = studies.filter(s => s.viewStatus === StudyViewStatus.NEW).length;
    const withReports = studies.filter(s => s.report).length;
    const critical = studies.filter(s => s.criticalFindings).length;
    
    return { newStudies, withReports, critical };
  };

  const stats = getStudyStats();

  return (
    <div className="study-list-container">
      {/* Header Section */}
      <div className="study-header">
        <div className="study-header-content">
          <h1 className="study-title">
            <span className="axis-gradient-text">Your Medical Imaging</span>
          </h1>
          <p className="study-subtitle">Access your radiology studies and reports from Axis Imaging</p>
        </div>
        
        <div className="study-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.newStudies}</div>
            <div className="stat-label">New Studies</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.withReports}</div>
            <div className="stat-label">With Reports</div>
          </div>
          {stats.critical > 0 && (
            <div className="stat-card stat-critical">
              <div className="stat-value">{stats.critical}</div>
              <div className="stat-label">Critical</div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="study-toolbar">
        <div className="toolbar-left">
          <button 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 10h10M2.5 5h15M7.5 15h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Filters {filter.modality?.length ? `(${filter.modality.length})` : ''}
          </button>

          <div className="search-box">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 14l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search studies..."
              value={filter.searchTerm || ''}
              onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
            />
          </div>
        </div>

        <div className="toolbar-right">
          <div className="view-toggle">
            <button 
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <select 
            className="sort-select"
            value={`${filter.sortBy}_${filter.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('_');
              handleFilterChange({ sortBy: sortBy as any, sortOrder: sortOrder as any });
            }}
          >
            <option value="studyDate_desc">Newest First</option>
            <option value="studyDate_asc">Oldest First</option>
            <option value="modality_asc">Modality A-Z</option>
            <option value="status_desc">Status</option>
            <option value="priority_desc">Priority</option>
          </select>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <StudyFilterPanel
          filter={filter}
          onChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Studies Grid/List */}
      {loading ? (
        <div className="loading-container">
          <div className="axis-loading-spinner">
            <div className="spinner-x"></div>
          </div>
          <p>Loading your studies...</p>
        </div>
      ) : studies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No studies found</h3>
          <p>Adjust your filters or search criteria to find studies</p>
        </div>
      ) : (
        <div className={`studies-${viewMode}`}>
          {studies.map(study => (
            <StudyCard
              key={study.id}
              study={study}
              viewMode={viewMode}
              onClick={() => onStudySelect?.(study)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={filter.page === 1}
            onClick={() => handlePageChange((filter.page || 1) - 1)}
            className="pagination-btn"
          >
            Previous
          </button>
          
          <div className="pagination-pages">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  className={`pagination-page ${filter.page === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && <span className="pagination-ellipsis">...</span>}
            {totalPages > 5 && (
              <button
                className={`pagination-page ${filter.page === totalPages ? 'active' : ''}`}
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </button>
            )}
          </div>

          <button 
            disabled={filter.page === totalPages}
            onClick={() => handlePageChange((filter.page || 1) + 1)}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default StudyList;