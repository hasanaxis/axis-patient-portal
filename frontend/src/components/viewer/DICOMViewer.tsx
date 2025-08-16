import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Study, Series, DICOMImage } from '../../../../shared/src/types';
import { cornerstoneService, WindowLevelPreset } from '../../services/cornerstoneService';
import ViewerToolbar from './ViewerToolbar';
import SeriesNavigator from './SeriesNavigator';
import ImageNavigator from './ImageNavigator';
import ViewerMetadata from './ViewerMetadata';
import MobileControls from './MobileControls';
import { isMobile } from '../../utils/deviceDetection';
import './DICOMViewer.css';

interface DICOMViewerProps {
  study: Study;
  initialSeriesId?: string;
  initialImageIndex?: number;
  onClose?: () => void;
  fullscreen?: boolean;
}

interface ViewerState {
  currentSeries: Series | null;
  currentImageIndex: number;
  isLoading: boolean;
  error: string | null;
  windowLevel: { center: number; width: number };
  zoom: number;
  activeTool: string;
  showMetadata: boolean;
  isFullscreen: boolean;
  isMobileView: boolean;
}

const DICOMViewer: React.FC<DICOMViewerProps> = ({
  study,
  initialSeriesId,
  initialImageIndex = 0,
  onClose,
  fullscreen = false
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const renderingEngineId = `axis-viewer-${study.id}`;
  const viewportId = `viewport-${study.id}`;

  const [state, setState] = useState<ViewerState>({
    currentSeries: null,
    currentImageIndex: initialImageIndex,
    isLoading: true,
    error: null,
    windowLevel: { center: 1024, width: 2048 },
    zoom: 1,
    activeTool: 'WindowLevel',
    showMetadata: false,
    isFullscreen: fullscreen,
    isMobileView: isMobile()
  });

  // Initialize viewer
  useEffect(() => {
    const initViewer = async () => {
      if (!viewportRef.current || isInitialized) return;

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        await cornerstoneService.createViewer({
          container: viewportRef.current,
          renderingEngineId,
          viewportId
        });

        setIsInitialized(true);

        // Load initial series
        const initialSeries = initialSeriesId 
          ? study.series?.find(s => s.id === initialSeriesId)
          : study.series?.[0];

        if (initialSeries) {
          await loadSeries(initialSeries);
        }

        setState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        console.error('Failed to initialize viewer:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Failed to initialize DICOM viewer' 
        }));
      }
    };

    initViewer();

    return () => {
      if (isInitialized) {
        cornerstoneService.destroy();
      }
    };
  }, [study.id, initialSeriesId, isInitialized]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setState(prev => ({ ...prev, isMobileView: isMobile() }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isInitialized) return;

      switch (event.key) {
        case 'Escape':
          if (state.isFullscreen) {
            exitFullscreen();
          } else {
            onClose?.();
          }
          break;
        case 'f':
        case 'F':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'r':
        case 'R':
          resetViewer();
          break;
        case 'i':
        case 'I':
          invertImage();
          break;
        case 'h':
        case 'H':
          flipHorizontal();
          break;
        case 'v':
        case 'V':
          flipVertical();
          break;
        case 'ArrowLeft':
          previousImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
        case 'ArrowUp':
          previousSeries();
          break;
        case 'ArrowDown':
          nextSeries();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isInitialized, state]);

  const loadSeries = async (series: Series) => {
    if (!isInitialized) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Generate image IDs for the series
      const imageIds = series.images?.map(image => 
        `dicomweb:${window.location.origin}${image.imageUrl}`
      ) || [];

      if (imageIds.length === 0) {
        throw new Error('No images found in series');
      }

      await cornerstoneService.loadImages(imageIds, viewportId);

      // Set initial window/level based on modality
      const presets = cornerstoneService.windowLevelPresets[study.modality] || [];
      const defaultPreset = presets[0] || { windowCenter: 1024, windowWidth: 2048 };
      
      cornerstoneService.setWindowLevel(
        viewportId,
        defaultPreset.windowCenter,
        defaultPreset.windowWidth
      );

      setState(prev => ({
        ...prev,
        currentSeries: series,
        currentImageIndex: 0,
        isLoading: false,
        windowLevel: {
          center: defaultPreset.windowCenter,
          width: defaultPreset.windowWidth
        }
      }));

    } catch (error) {
      console.error('Failed to load series:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load medical images'
      }));
    }
  };

  const handleSeriesChange = useCallback((series: Series) => {
    loadSeries(series);
  }, [isInitialized]);

  const handleImageIndexChange = useCallback((index: number) => {
    if (!isInitialized) return;

    cornerstoneService.setImageIndex(viewportId, index);
    setState(prev => ({ ...prev, currentImageIndex: index }));
  }, [isInitialized]);

  const handleToolChange = useCallback((toolName: string) => {
    if (!isInitialized) return;

    if (toolName === 'Reset') {
      cornerstoneService.resetToDefaultTools();
      setState(prev => ({ ...prev, activeTool: 'WindowLevel' }));
    } else {
      cornerstoneService.activateTool(toolName);
      setState(prev => ({ ...prev, activeTool: toolName }));
    }
  }, [isInitialized]);

  const handleWindowLevelPreset = useCallback((preset: WindowLevelPreset) => {
    if (!isInitialized) return;

    cornerstoneService.setWindowLevel(viewportId, preset.windowCenter, preset.windowWidth);
    setState(prev => ({
      ...prev,
      windowLevel: { center: preset.windowCenter, width: preset.windowWidth }
    }));
  }, [isInitialized]);

  const nextImage = useCallback(() => {
    if (!isInitialized || !state.currentSeries) return;

    const maxIndex = (state.currentSeries.images?.length || 1) - 1;
    const newIndex = Math.min(state.currentImageIndex + 1, maxIndex);
    handleImageIndexChange(newIndex);
  }, [isInitialized, state.currentSeries, state.currentImageIndex, handleImageIndexChange]);

  const previousImage = useCallback(() => {
    if (!isInitialized) return;

    const newIndex = Math.max(state.currentImageIndex - 1, 0);
    handleImageIndexChange(newIndex);
  }, [isInitialized, state.currentImageIndex, handleImageIndexChange]);

  const nextSeries = useCallback(() => {
    if (!study.series || !state.currentSeries) return;

    const currentIndex = study.series.findIndex(s => s.id === state.currentSeries?.id);
    const nextIndex = Math.min(currentIndex + 1, study.series.length - 1);
    
    if (nextIndex !== currentIndex) {
      handleSeriesChange(study.series[nextIndex]);
    }
  }, [study.series, state.currentSeries, handleSeriesChange]);

  const previousSeries = useCallback(() => {
    if (!study.series || !state.currentSeries) return;

    const currentIndex = study.series.findIndex(s => s.id === state.currentSeries?.id);
    const prevIndex = Math.max(currentIndex - 1, 0);
    
    if (prevIndex !== currentIndex) {
      handleSeriesChange(study.series[prevIndex]);
    }
  }, [study.series, state.currentSeries, handleSeriesChange]);

  const resetViewer = useCallback(() => {
    if (!isInitialized) return;
    cornerstoneService.reset(viewportId);
    setState(prev => ({ ...prev, zoom: 1 }));
  }, [isInitialized]);

  const invertImage = useCallback(() => {
    if (!isInitialized) return;
    cornerstoneService.invert(viewportId);
  }, [isInitialized]);

  const flipHorizontal = useCallback(() => {
    if (!isInitialized) return;
    cornerstoneService.flipHorizontal(viewportId);
  }, [isInitialized]);

  const flipVertical = useCallback(() => {
    if (!isInitialized) return;
    cornerstoneService.flipVertical(viewportId);
  }, [isInitialized]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setState(prev => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setState(prev => ({ ...prev, isFullscreen: false }));
  }, []);

  const exportImage = useCallback(() => {
    if (!isInitialized) return;

    const dataUrl = cornerstoneService.exportImage(viewportId);
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `${study.accessionNumber}_image_${state.currentImageIndex + 1}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [isInitialized, study.accessionNumber, state.currentImageIndex]);

  if (state.error) {
    return (
      <div className="dicom-viewer-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Medical Images</h3>
          <p>{state.error}</p>
          <button onClick={onClose} className="axis-button-primary">
            Close Viewer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`dicom-viewer ${state.isFullscreen ? 'fullscreen' : ''} ${state.isMobileView ? 'mobile' : ''}`}>
      {/* Header */}
      <div className="viewer-header">
        <div className="header-left">
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="study-info">
            <h2>{study.studyDescription}</h2>
            <p>{study.patient?.user?.firstName} {study.patient?.user?.lastName} • {study.accessionNumber}</p>
          </div>
        </div>
        
        <div className="header-right">
          <button
            className="metadata-toggle"
            onClick={() => setState(prev => ({ ...prev, showMetadata: !prev.showMetadata }))}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M10 6v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Info
          </button>
          
          <button className="fullscreen-btn" onClick={toggleFullscreen}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 7V3h4M17 7V3h-4M17 13v4h-4M3 13v4h4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="viewer-content">
        {/* Sidebar */}
        {!state.isMobileView && (
          <div className="viewer-sidebar">
            <SeriesNavigator
              series={study.series || []}
              currentSeries={state.currentSeries}
              onSeriesChange={handleSeriesChange}
            />
          </div>
        )}

        {/* Viewport Area */}
        <div className="viewer-main">
          {/* Toolbar */}
          <ViewerToolbar
            modality={study.modality}
            activeTool={state.activeTool}
            onToolChange={handleToolChange}
            onWindowLevelPreset={handleWindowLevelPreset}
            onReset={resetViewer}
            onInvert={invertImage}
            onFlipH={flipHorizontal}
            onFlipV={flipVertical}
            onExport={exportImage}
            windowLevelPresets={cornerstoneService.windowLevelPresets[study.modality] || []}
          />

          {/* Viewport */}
          <div className="viewport-container">
            {state.isLoading && (
              <div className="viewport-loading">
                <div className="axis-loading-spinner">
                  <div className="spinner-x"></div>
                </div>
                <p>Loading medical images...</p>
              </div>
            )}
            
            <div
              ref={viewportRef}
              className="cornerstone-viewport"
              style={{ width: '100%', height: '100%' }}
            />

            {/* Viewport Overlay */}
            <div className="viewport-overlay">
              <div className="overlay-top-left">
                <div className="patient-info">
                  {study.patient?.user?.firstName} {study.patient?.user?.lastName}
                </div>
                <div className="study-date">
                  {new Date(study.studyDate).toLocaleDateString()}
                </div>
              </div>
              
              <div className="overlay-top-right">
                <div className="series-info">
                  {state.currentSeries?.seriesDescription}
                </div>
                <div className="modality-info">
                  {study.modality} • {study.institutionName}
                </div>
              </div>
              
              <div className="overlay-bottom-left">
                <div className="window-level">
                  W: {state.windowLevel.width} / L: {state.windowLevel.center}
                </div>
              </div>
              
              <div className="overlay-bottom-right">
                <div className="image-info">
                  {state.currentImageIndex + 1} / {state.currentSeries?.numberOfInstances || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Image Navigator */}
          {state.currentSeries && (
            <ImageNavigator
              series={state.currentSeries}
              currentIndex={state.currentImageIndex}
              onImageChange={handleImageIndexChange}
              isMobile={state.isMobileView}
            />
          )}
        </div>

        {/* Metadata Panel */}
        {state.showMetadata && state.currentSeries && (
          <div className="metadata-panel">
            <ViewerMetadata
              study={study}
              series={state.currentSeries}
              currentImage={state.currentSeries.images?.[state.currentImageIndex]}
              onClose={() => setState(prev => ({ ...prev, showMetadata: false }))}
            />
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      {state.isMobileView && (
        <MobileControls
          study={study}
          currentSeries={state.currentSeries}
          currentImageIndex={state.currentImageIndex}
          onSeriesChange={handleSeriesChange}
          onImageChange={handleImageIndexChange}
          onToolChange={handleToolChange}
          activeTool={state.activeTool}
        />
      )}
    </div>
  );
};

export default DICOMViewer;