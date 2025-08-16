import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, ChevronLeft, ChevronRight, Maximize2, Move } from 'lucide-react';

interface ImageViewerProps {
  images: Array<{
    id: number;
    thumbnail: string;
    fullSize: string;
    description: string;
  }>;
  initialIndex?: number;
  onClose: () => void;
  patientName?: string;
  studyDate?: string;
  modality?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  initialIndex = 0,
  onClose,
  patientName = 'Patient',
  studyDate = '',
  modality = 'Medical Image'
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const imageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hide controls after 3 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimeout = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };
    
    resetTimeout();
    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keydown', resetTimeout);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keydown', resetTimeout);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigatePrevious();
          break;
        case 'ArrowRight':
          navigateNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotate();
          break;
        case '0':
          resetView();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, zoom, rotation]);

  const currentImage = images[currentIndex];

  const navigatePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetView();
    }
  };

  const navigateNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetView();
    }
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentImage.fullSize;
    link.download = `${modality}_${studyDate}_${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black" ref={containerRef}>
      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex justify-between items-start">
          <div className="text-white">
            <h3 className="text-lg font-semibold">{patientName}</h3>
            <p className="text-sm opacity-80">{modality} • {studyDate}</p>
            <p className="text-xs opacity-60 mt-1">{currentImage.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Close (ESC)"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div 
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default') }}
      >
        <div
          ref={imageRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <img
            src={currentImage.fullSize}
            alt={currentImage.description}
            className="max-w-none h-auto"
            style={{
              maxHeight: '90vh',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={navigatePrevious}
            disabled={currentIndex === 0}
            className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-all ${showControls ? 'opacity-100' : 'opacity-0'} ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={navigateNext}
            disabled={currentIndex === images.length - 1}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-all ${showControls ? 'opacity-100' : 'opacity-0'} ${currentIndex === images.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Control Bar */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 mb-4 overflow-x-auto">
            {images.map((img, index) => (
              <button
                key={img.id}
                onClick={() => {
                  setCurrentIndex(index);
                  resetView();
                }}
                className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all ${
                  index === currentIndex 
                    ? 'border-blue-500 scale-110' 
                    : 'border-gray-600 hover:border-gray-400'
                }`}
              >
                <img
                  src={img.thumbnail}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex justify-center items-center gap-4">
          <div className="flex items-center gap-2 bg-black/50 rounded-full px-4 py-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-sm font-medium min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
          </div>

          <button
            onClick={handleRotate}
            className="p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            title="Rotate (R)"
          >
            <RotateCw className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={resetView}
            className="p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            title="Reset View (0)"
          >
            <Maximize2 className="w-5 h-5 text-white" />
          </button>

          {zoom > 1 && (
            <div className="p-3 bg-black/50 rounded-full">
              <Move className="w-5 h-5 text-white opacity-60" />
            </div>
          )}

          <button
            onClick={handleDownload}
            className="p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="text-center mt-3">
            <span className="text-white text-sm opacity-80">
              {currentIndex + 1} / {images.length}
            </span>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="text-center mt-2">
          <p className="text-white text-xs opacity-60">
            Use arrow keys to navigate • +/- to zoom • R to rotate • ESC to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;