import React, { useState, useRef, useEffect } from 'react';
import { Series, DICOMImage } from '../../../../shared/src/types';
import './ImageNavigator.css';

interface ImageNavigatorProps {
  series: Series;
  currentIndex: number;
  onImageChange: (index: number) => void;
  isMobile: boolean;
}

const ImageNavigator: React.FC<ImageNavigatorProps> = ({
  series,
  currentIndex,
  onImageChange,
  isMobile
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const [showThumbnails, setShowThumbnails] = useState(!isMobile);

  const totalImages = series.numberOfInstances;
  const images = series.images || [];

  // Auto-scroll thumbnails to keep current image visible
  useEffect(() => {
    if (!thumbnailsRef.current || !showThumbnails) return;

    const thumbnailElement = thumbnailsRef.current.children[currentIndex] as HTMLElement;
    if (thumbnailElement) {
      thumbnailElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [currentIndex, showThumbnails]);

  const handleSliderMouseDown = (event: React.MouseEvent) => {
    if (!sliderRef.current) return;
    
    setIsDragging(true);
    handleSliderMove(event);
  };

  const handleSliderMove = (event: React.MouseEvent | MouseEvent) => {
    if (!sliderRef.current || (!isDragging && event.type === 'mousemove')) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newIndex = Math.round(percentage * (totalImages - 1));
    
    if (newIndex !== currentIndex) {
      onImageChange(newIndex);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchMove = (event: React.TouchEvent) => {
    if (!sliderRef.current) return;

    const touch = event.touches[0];
    const rect = sliderRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newIndex = Math.round(percentage * (totalImages - 1));
    
    if (newIndex !== currentIndex) {
      onImageChange(newIndex);
    }
  };

  // Mouse event listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleSliderMove(e);
    const handleMouseUpGlobal = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUpGlobal);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [isDragging]);

  const getThumbnailUrl = (image: DICOMImage, index: number): string => {
    if (image?.thumbnailUrl) {
      return image.thumbnailUrl;
    }
    return `/placeholder-thumb-${index}.jpg`;
  };

  const formatImageInfo = (image: DICOMImage | undefined): string => {
    if (!image) return '';
    
    const parts = [];
    if (image.rows && image.columns) {
      parts.push(`${image.columns}×${image.rows}`);
    }
    if (image.sliceLocation !== undefined) {
      parts.push(`Loc: ${image.sliceLocation.toFixed(1)}mm`);
    }
    if (image.sliceThickness) {
      parts.push(`${image.sliceThickness}mm`);
    }
    
    return parts.join(' • ');
  };

  return (
    <div className={`image-navigator ${isMobile ? 'mobile' : ''}`}>
      {/* Progress Bar */}
      <div className="navigator-header">
        <div className="image-counter">
          <span className="current-image">{currentIndex + 1}</span>
          <span className="separator">/</span>
          <span className="total-images">{totalImages}</span>
        </div>
        
        <div className="navigator-controls">
          <button
            className="nav-btn"
            onClick={() => onImageChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          
          <button
            className="nav-btn"
            onClick={() => onImageChange(Math.min(totalImages - 1, currentIndex + 1))}
            disabled={currentIndex === totalImages - 1}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          
          {!isMobile && (
            <button
              className={`thumbnails-toggle ${showThumbnails ? 'active' : ''}`}
              onClick={() => setShowThumbnails(!showThumbnails)}
              title="Toggle thumbnails"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="4" height="4" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="7" y="2" width="4" height="4" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="12" y="2" width="2" height="4" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="2" y="7" width="4" height="4" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="7" y="7" width="4" height="4" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="12" y="7" width="2" height="4" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Image Slider */}
      <div
        ref={sliderRef}
        className="image-slider"
        onMouseDown={handleSliderMouseDown}
        onTouchMove={handleTouchMove}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (sliderRef.current) {
            const rect = sliderRef.current.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            const newIndex = Math.round(percentage * (totalImages - 1));
            onImageChange(newIndex);
          }
        }}
      >
        <div className="slider-track">
          <div 
            className="slider-progress"
            style={{ width: `${((currentIndex + 1) / totalImages) * 100}%` }}
          />
          <div 
            className="slider-thumb"
            style={{ left: `${(currentIndex / (totalImages - 1)) * 100}%` }}
          />
        </div>
        
        {/* Tick marks for images */}
        <div className="slider-ticks">
          {Array.from({ length: Math.min(totalImages, 50) }, (_, i) => {
            const index = Math.round((i / (Math.min(totalImages, 50) - 1)) * (totalImages - 1));
            return (
              <div
                key={i}
                className={`tick ${index === currentIndex ? 'active' : ''}`}
                style={{ left: `${(index / (totalImages - 1)) * 100}%` }}
                onClick={() => onImageChange(index)}
              />
            );
          })}
        </div>
      </div>

      {/* Current Image Info */}
      <div className="current-image-info">
        <div className="image-details">
          {images[currentIndex] && formatImageInfo(images[currentIndex])}
        </div>
        <div className="image-instance">
          Instance: {images[currentIndex]?.instanceNumber || currentIndex + 1}
        </div>
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 0 && (
        <div className="thumbnails-container">
          <div ref={thumbnailsRef} className="thumbnails-strip">
            {images.map((image, index) => (
              <div
                key={image.id || index}
                className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                onClick={() => onImageChange(index)}
              >
                <img
                  src={getThumbnailUrl(image, index)}
                  alt={`Image ${index + 1}`}
                  loading="lazy"
                />
                <div className="thumbnail-overlay">
                  <div className="thumbnail-number">{index + 1}</div>
                  {image.sliceLocation !== undefined && (
                    <div className="thumbnail-location">
                      {image.sliceLocation.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cine Controls (for multi-frame studies) */}
      {totalImages > 1 && (
        <div className="cine-controls">
          <button className="cine-btn" title="Play/Pause cine">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 2l10 6-10 6z" fill="currentColor"/>
            </svg>
          </button>
          
          <div className="cine-speed">
            <label>Speed:</label>
            <input type="range" min="1" max="30" defaultValue="10" />
            <span>10 fps</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageNavigator;