import React, { useState } from 'react';
import { Modality } from '../../../../shared/src/types';
import { WindowLevelPreset } from '../../services/cornerstoneService';
import './ViewerToolbar.css';

interface ViewerToolbarProps {
  modality: Modality;
  activeTool: string;
  onToolChange: (toolName: string) => void;
  onWindowLevelPreset: (preset: WindowLevelPreset) => void;
  onReset: () => void;
  onInvert: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  onExport: () => void;
  windowLevelPresets: WindowLevelPreset[];
}

const ViewerToolbar: React.FC<ViewerToolbarProps> = ({
  modality,
  activeTool,
  onToolChange,
  onWindowLevelPreset,
  onReset,
  onInvert,
  onFlipH,
  onFlipV,
  onExport,
  windowLevelPresets
}) => {
  const [showPresets, setShowPresets] = useState(false);

  const tools = [
    {
      name: 'WindowLevel',
      icon: '🔧',
      title: 'Window/Level (Left Click + Drag)',
      shortcut: 'W'
    },
    {
      name: 'Pan',
      icon: '✋',
      title: 'Pan (Middle Click + Drag)',
      shortcut: 'P'
    },
    {
      name: 'Zoom',
      icon: '🔍',
      title: 'Zoom (Right Click + Drag)',
      shortcut: 'Z'
    },
    {
      name: 'Length',
      icon: '📏',
      title: 'Length Measurement',
      shortcut: 'L'
    },
    {
      name: 'Angle',
      icon: '📐',
      title: 'Angle Measurement',
      shortcut: 'A'
    },
    {
      name: 'RectangleROI',
      icon: '▭',
      title: 'Rectangle ROI',
      shortcut: 'R'
    },
    {
      name: 'EllipticalROI',
      icon: '⭕',
      title: 'Elliptical ROI',
      shortcut: 'E'
    },
    {
      name: 'Probe',
      icon: '🎯',
      title: 'Probe Tool',
      shortcut: 'T'
    },
    {
      name: 'Magnify',
      icon: '🔬',
      title: 'Magnifying Glass',
      shortcut: 'M'
    }
  ];

  const transformTools = [
    {
      action: onReset,
      icon: '🔄',
      title: 'Reset View',
      shortcut: 'R'
    },
    {
      action: onInvert,
      icon: '🔳',
      title: 'Invert Colors',
      shortcut: 'I'
    },
    {
      action: onFlipH,
      icon: '↔️',
      title: 'Flip Horizontal',
      shortcut: 'H'
    },
    {
      action: onFlipV,
      icon: '↕️',
      title: 'Flip Vertical',
      shortcut: 'V'
    }
  ];

  return (
    <div className="viewer-toolbar">
      {/* Main Tools */}
      <div className="toolbar-group">
        <div className="group-label">Tools</div>
        <div className="tool-buttons">
          {tools.map(tool => (
            <button
              key={tool.name}
              className={`tool-btn ${activeTool === tool.name ? 'active' : ''}`}
              onClick={() => onToolChange(tool.name)}
              title={`${tool.title} (${tool.shortcut})`}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.name.replace(/([A-Z])/g, ' $1').trim()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Window/Level Presets */}
      {windowLevelPresets.length > 0 && (
        <div className="toolbar-group">
          <div className="group-label">Window/Level</div>
          <div className="preset-dropdown">
            <button
              className="preset-toggle"
              onClick={() => setShowPresets(!showPresets)}
            >
              <span>Presets</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            
            {showPresets && (
              <div className="preset-menu">
                {windowLevelPresets.map((preset, index) => (
                  <button
                    key={index}
                    className="preset-item"
                    onClick={() => {
                      onWindowLevelPreset(preset);
                      setShowPresets(false);
                    }}
                    title={preset.description}
                  >
                    <div className="preset-name">{preset.name}</div>
                    <div className="preset-values">
                      W: {preset.windowWidth} / L: {preset.windowCenter}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transform Tools */}
      <div className="toolbar-group">
        <div className="group-label">Transform</div>
        <div className="tool-buttons">
          {transformTools.map((tool, index) => (
            <button
              key={index}
              className="tool-btn transform-btn"
              onClick={tool.action}
              title={`${tool.title} (${tool.shortcut})`}
            >
              <span className="tool-icon">{tool.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="toolbar-group">
        <div className="group-label">Export</div>
        <button
          className="tool-btn export-btn"
          onClick={onExport}
          title="Export Image (Ctrl+S)"
        >
          <span className="tool-icon">💾</span>
          <span className="tool-label">Export</span>
        </button>
      </div>
    </div>
  );
};

export default ViewerToolbar;