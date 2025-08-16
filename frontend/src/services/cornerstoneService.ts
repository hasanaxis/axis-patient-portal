import {
  RenderingEngine,
  Enums,
  init as csRender3DInit,
  volumeLoader,
  setVolumesForViewports,
  cache,
  imageLoader,
  metaData,
  utilities,
  CONSTANTS
} from '@cornerstonejs/core';

import {
  addTool,
  addToolForElement,
  ToolGroupManager,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  ProbeTool,
  RectangleROITool,
  LengthTool,
  AngleTool,
  EllipticalROITool,
  MagnifyTool,
  StackScrollMouseWheelTool,
  init as csToolsInit,
  Enums as ToolEnums,
  annotation,
  utilities as toolUtilities
} from '@cornerstonejs/tools';

import dicomImageLoader from '@cornerstonejs/dicom-image-loader';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

const { ViewportType } = Enums;
const { MouseBindings } = ToolEnums;

export interface ViewerConfig {
  container: HTMLDivElement;
  renderingEngineId: string;
  viewportId: string;
  element?: HTMLDivElement;
}

export interface WindowLevelPreset {
  name: string;
  windowCenter: number;
  windowWidth: number;
  description: string;
}

export class CornerstoneService {
  private renderingEngine: RenderingEngine | null = null;
  private toolGroupId = 'axis-imaging-tool-group';
  private isInitialized = false;

  // Window/Level presets for different anatomies
  public readonly windowLevelPresets: Record<string, WindowLevelPreset[]> = {
    CT: [
      { name: 'Soft Tissue', windowCenter: 50, windowWidth: 350, description: 'General soft tissue viewing' },
      { name: 'Lung', windowCenter: -600, windowWidth: 1600, description: 'Pulmonary parenchyma' },
      { name: 'Bone', windowCenter: 400, windowWidth: 1800, description: 'Bone and calcium' },
      { name: 'Brain', windowCenter: 35, windowWidth: 80, description: 'Brain tissue' },
      { name: 'Abdomen', windowCenter: 60, windowWidth: 400, description: 'Abdominal organs' },
      { name: 'Mediastinum', windowCenter: 50, windowWidth: 350, description: 'Chest mediastinum' }
    ],
    MR: [
      { name: 'T1', windowCenter: 600, windowWidth: 1200, description: 'T1-weighted images' },
      { name: 'T2', windowCenter: 1000, windowWidth: 2000, description: 'T2-weighted images' },
      { name: 'FLAIR', windowCenter: 800, windowWidth: 1600, description: 'FLAIR sequences' },
      { name: 'DWI', windowCenter: 500, windowWidth: 1000, description: 'Diffusion-weighted imaging' }
    ],
    DX: [
      { name: 'Chest', windowCenter: 2048, windowWidth: 4096, description: 'Chest radiography' },
      { name: 'Abdomen', windowCenter: 2048, windowWidth: 4096, description: 'Abdominal X-rays' },
      { name: 'Extremity', windowCenter: 2048, windowWidth: 4096, description: 'Bone and joint imaging' }
    ],
    MG: [
      { name: 'Standard', windowCenter: 2000, windowWidth: 4000, description: 'Standard mammography' },
      { name: 'Dense', windowCenter: 1500, windowWidth: 3000, description: 'Dense breast tissue' }
    ],
    US: [
      { name: 'Standard', windowCenter: 128, windowWidth: 256, description: 'Standard ultrasound' },
      { name: 'Doppler', windowCenter: 128, windowWidth: 256, description: 'Doppler imaging' }
    ]
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Cornerstone3D
      await csRender3DInit();
      await csToolsInit();

      // Configure DICOM image loader
      this.configureDicomImageLoader();

      // Add tools
      this.addTools();

      this.isInitialized = true;
      console.log('Cornerstone3D initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Cornerstone3D:', error);
      throw error;
    }
  }

  private configureDicomImageLoader(): void {
    // Configure dicom image loader
    const config = {
      maxWebWorkers: navigator.hardwareConcurrency || 1,
      startWebWorkersOnDemand: true,
      taskConfiguration: {
        decodeTask: {
          initializeCodecsOnStartup: false,
          usePDFJS: false,
          strict: false,
        },
      },
      // Configure for WADO-RS
      beforeSend: (xhr: XMLHttpRequest) => {
        // Add authentication headers if needed
        const token = localStorage.getItem('accessToken');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      }
    };

    dicomImageLoader.external.cornerstone = require('@cornerstonejs/core');
    dicomImageLoader.external.dicomParser = dicomParser;
    dicomImageLoader.configure(config);

    // Configure WADO image loader
    cornerstoneWADOImageLoader.external.cornerstone = require('@cornerstonejs/core');
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    cornerstoneWADOImageLoader.configure({
      beforeSend: (xhr: XMLHttpRequest) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      }
    });
  }

  private addTools(): void {
    // Add tools to Cornerstone3D
    addTool(PanTool);
    addTool(ZoomTool);
    addTool(WindowLevelTool);
    addTool(ProbeTool);
    addTool(RectangleROITool);
    addTool(LengthTool);
    addTool(AngleTool);
    addTool(EllipticalROITool);
    addTool(MagnifyTool);
    addTool(StackScrollMouseWheelTool);
  }

  async createViewer(config: ViewerConfig): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Create rendering engine
      this.renderingEngine = new RenderingEngine(config.renderingEngineId);

      // Create viewport
      const viewportInput = {
        viewportId: config.viewportId,
        type: ViewportType.STACK,
        element: config.container,
        defaultOptions: {
          background: [0, 0, 0] as [number, number, number],
        },
      };

      this.renderingEngine.enableElement(viewportInput);

      // Create and set up tool group
      await this.setupToolGroup(config.viewportId);

      console.log('DICOM viewer created successfully');
    } catch (error) {
      console.error('Failed to create DICOM viewer:', error);
      throw error;
    }
  }

  private async setupToolGroup(viewportId: string): Promise<void> {
    // Create tool group if it doesn't exist
    let toolGroup = ToolGroupManager.getToolGroup(this.toolGroupId);
    
    if (!toolGroup) {
      toolGroup = ToolGroupManager.createToolGroup(this.toolGroupId);
    }

    // Add tools to the tool group
    toolGroup.addTool(PanTool.toolName);
    toolGroup.addTool(ZoomTool.toolName);
    toolGroup.addTool(WindowLevelTool.toolName);
    toolGroup.addTool(ProbeTool.toolName);
    toolGroup.addTool(RectangleROITool.toolName);
    toolGroup.addTool(LengthTool.toolName);
    toolGroup.addTool(AngleTool.toolName);
    toolGroup.addTool(EllipticalROITool.toolName);
    toolGroup.addTool(MagnifyTool.toolName);
    toolGroup.addTool(StackScrollMouseWheelTool.toolName);

    // Set tool modes
    toolGroup.setToolActive(WindowLevelTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Primary }],
    });

    toolGroup.setToolActive(PanTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Auxiliary }],
    });

    toolGroup.setToolActive(ZoomTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Secondary }],
    });

    toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

    // Set tools as passive initially
    toolGroup.setToolPassive(ProbeTool.toolName);
    toolGroup.setToolPassive(LengthTool.toolName);
    toolGroup.setToolPassive(AngleTool.toolName);
    toolGroup.setToolPassive(RectangleROITool.toolName);
    toolGroup.setToolPassive(EllipticalROITool.toolName);
    toolGroup.setToolPassive(MagnifyTool.toolName);

    // Add viewport to tool group
    toolGroup.addViewport(viewportId, config.renderingEngineId);
  }

  async loadImages(imageIds: string[], viewportId: string): Promise<void> {
    if (!this.renderingEngine) {
      throw new Error('Rendering engine not initialized');
    }

    try {
      const viewport = this.renderingEngine.getViewport(viewportId);
      
      if (!viewport) {
        throw new Error(`Viewport ${viewportId} not found`);
      }

      // Set the stack of images
      await viewport.setStack(imageIds);
      
      // Render
      viewport.render();

      console.log(`Loaded ${imageIds.length} images into viewport`);
    } catch (error) {
      console.error('Failed to load images:', error);
      throw error;
    }
  }

  setWindowLevel(viewportId: string, windowCenter: number, windowWidth: number): void {
    if (!this.renderingEngine) return;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return;

    const properties = viewport.getProperties();
    properties.voiRange = {
      upper: windowCenter + windowWidth / 2,
      lower: windowCenter - windowWidth / 2,
    };

    viewport.setProperties(properties);
    viewport.render();
  }

  activateTool(toolName: string): void {
    const toolGroup = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (!toolGroup) return;

    // Deactivate all annotation tools first
    const annotationTools = [
      ProbeTool.toolName,
      LengthTool.toolName,
      AngleTool.toolName,
      RectangleROITool.toolName,
      EllipticalROITool.toolName,
      MagnifyTool.toolName
    ];

    annotationTools.forEach(tool => {
      toolGroup.setToolPassive(tool);
    });

    // Activate the selected tool
    toolGroup.setToolActive(toolName, {
      bindings: [{ mouseButton: MouseBindings.Primary }],
    });
  }

  resetToDefaultTools(): void {
    const toolGroup = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (!toolGroup) return;

    // Reset to default window/level tool
    toolGroup.setToolActive(WindowLevelTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Primary }],
    });

    // Set other tools as passive
    const annotationTools = [
      ProbeTool.toolName,
      LengthTool.toolName,
      AngleTool.toolName,
      RectangleROITool.toolName,
      EllipticalROITool.toolName,
      MagnifyTool.toolName
    ];

    annotationTools.forEach(tool => {
      toolGroup.setToolPassive(tool);
    });
  }

  getCurrentImage(viewportId: string): any {
    if (!this.renderingEngine) return null;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return null;

    return viewport.getCurrentImageId();
  }

  getImageIndex(viewportId: string): number {
    if (!this.renderingEngine) return 0;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return 0;

    return viewport.getCurrentImageIdIndex();
  }

  setImageIndex(viewportId: string, index: number): void {
    if (!this.renderingEngine) return;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return;

    viewport.setImageIdIndex(index);
    viewport.render();
  }

  getNumImages(viewportId: string): number {
    if (!this.renderingEngine) return 0;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return 0;

    return viewport.getImageIds().length;
  }

  zoom(viewportId: string, factor: number): void {
    if (!this.renderingEngine) return;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return;

    const camera = viewport.getCamera();
    const newZoom = Math.max(0.1, Math.min(10, camera.zoom * factor));
    
    viewport.setCamera({ zoom: newZoom });
    viewport.render();
  }

  reset(viewportId: string): void {
    if (!this.renderingEngine) return;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return;

    viewport.resetCamera();
    viewport.resetProperties();
    viewport.render();
  }

  flipHorizontal(viewportId: string): void {
    if (!this.renderingEngine) return;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return;

    const camera = viewport.getCamera();
    viewport.setCamera({ 
      flipHorizontal: !camera.flipHorizontal 
    });
    viewport.render();
  }

  flipVertical(viewportId: string): void {
    if (!this.renderingEngine) return;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return;

    const camera = viewport.getCamera();
    viewport.setCamera({ 
      flipVertical: !camera.flipVertical 
    });
    viewport.render();
  }

  rotate(viewportId: string, angle: number): void {
    if (!this.renderingEngine) return;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return;

    const camera = viewport.getCamera();
    const newRotation = (camera.rotation + angle) % 360;
    
    viewport.setCamera({ rotation: newRotation });
    viewport.render();
  }

  invert(viewportId: string): void {
    if (!this.renderingEngine) return;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return;

    const properties = viewport.getProperties();
    properties.invert = !properties.invert;
    
    viewport.setProperties(properties);
    viewport.render();
  }

  exportImage(viewportId: string): string | null {
    if (!this.renderingEngine) return null;

    const viewport = this.renderingEngine.getViewport(viewportId);
    if (!viewport) return null;

    const canvas = viewport.getCanvas();
    return canvas.toDataURL('image/png');
  }

  destroy(): void {
    if (this.renderingEngine) {
      this.renderingEngine.destroy();
      this.renderingEngine = null;
    }

    // Clean up tool group
    const toolGroup = ToolGroupManager.getToolGroup(this.toolGroupId);
    if (toolGroup) {
      toolGroup.destroy();
    }

    // Clear cache
    cache.purgeCache();
  }
}

// Singleton instance
export const cornerstoneService = new CornerstoneService();