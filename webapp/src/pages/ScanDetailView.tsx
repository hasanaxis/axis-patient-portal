import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar,
  User,
  FileText,
  Download,
  Share2,
  ZoomIn,
  Eye
} from 'lucide-react';
import ImageViewer from '../components/ImageViewer';

const ScanDetailView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scanId } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showFullViewer, setShowFullViewer] = useState(false);

  // Scroll to report section if hash is present
  useEffect(() => {
    if (location.hash === '#report') {
      setTimeout(() => {
        const reportElement = document.getElementById('medical-report');
        if (reportElement) {
          reportElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100); // Small delay to ensure DOM is rendered
    }
  }, [location.hash]);

  // Mock scan data - in real app this would come from API based on scanId
  const getScanData = (id: string) => {
    // Default scan data for existing scans (IDs 1-4)
    const defaultScanData = {
      id: id,
      title: 'Right Ankle X-Ray Examination',
      modality: 'X-Ray',
      date: 'August 12, 2025',
      studyDate: '2025-08-12',
      accessionNumber: 'AX20250812001',
      patientInfo: {
        name: 'Arwa May',
        dob: '1985-06-15',
        mrn: 'MRN123456'
      },
      technician: 'Craigieburn Medical And Dental Centre',
      images: [
        {
          id: 1,
          thumbnail: '/test-images/ankle-xray-1-thumb.jpg',
          fullSize: '/test-images/ankle-xray-1.jpg',
          description: 'Right Ankle AP View'
        },
        {
          id: 2,
          thumbnail: '/test-images/ankle-xray-2-thumb.jpg',
          fullSize: '/test-images/ankle-xray-2.jpg',
          description: 'Right Ankle Lateral View'
        }
      ],
      hasReport: true,
      report: {
        technique: 'XR RIGHT LEG, XR RIGHT FEMUR, XR RIGHT ANKLE AND FOOT examination performed.',
        clinicalHistory: 'Fell and landed on right leg, has been limping still? Fracture',
        findings: 'No definite evidence of a bony injury seen in the right leg. The hip, knee and ankle joints are congruent. No fracture seen in the right foot. Normal alignment. Growth plates are intact to the extent visualised. No gross soft tissue abnormality observed.',
        impression: 'No fractures or malalignment observed in the visualised bones.',
        radiologist: 'Dr. Farhan Ahmed, Axis Imaging',
        reportDate: '15/08/2025',
        status: 'Final'
      }
    };

    // Special case for scan ID 5 (pending report)
    if (id === '5') {
      return {
        id: id,
        title: 'Ultrasound Upper Abdomen',
        modality: 'Ultrasound',
        date: 'August 16, 2025',
        studyDate: '2025-08-16',
        accessionNumber: 'AX20250816001',
        patientInfo: {
          name: 'Arwa May',
          dob: '1985-06-15',
          mrn: 'MRN123456'
        },
        technician: 'Axis Imaging Mickleham',
        scanCompletedAt: '2:30 PM today',
        estimatedReportTime: 'Within 24 hours',
        images: [
          {
            id: 1,
            thumbnail: 'https://via.placeholder.com/256x256/1a1a1a/666666?text=US+Image+1',
            fullSize: 'https://via.placeholder.com/512x512/1a1a1a/666666?text=US+Abdomen+1',
            description: 'Upper Abdomen Transverse View'
          },
          {
            id: 2,
            thumbnail: 'https://via.placeholder.com/256x256/1a1a1a/666666?text=US+Image+2',
            fullSize: 'https://via.placeholder.com/512x512/1a1a1a/666666?text=US+Abdomen+2',
            description: 'Upper Abdomen Sagittal View'
          }
        ],
        hasReport: false,
        reportStatus: 'Pending'
      };
    }

    return defaultScanData;
  };

  const scanData = getScanData(scanId || '1');

  const handleDownload = () => {
    // Mock download functionality
    console.log('Downloading scan images...');
  };

  const handleShare = () => {
    // Mock share functionality
    console.log('Sharing scan...');
  };

  const openImageViewer = (imageIndex: number) => {
    setSelectedImage(imageIndex);
    setShowFullViewer(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex items-center">
          <img 
            src="/assets/logos/axis-logo-color.png" 
            alt="Axis Imaging" 
            className="h-20"
          />
        </div>
        <div className="w-10"></div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Scan Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{scanData.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🩻</span>
                  <span>{scanData.modality}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{scanData.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{scanData.technician}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
          
          {/* Study Info */}
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Accession Number:</span>
              <p className="text-gray-900">{scanData.accessionNumber}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Study Date:</span>
              <p className="text-gray-900">{scanData.studyDate}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <p className={`font-medium ${
                scanData.hasReport 
                  ? 'text-green-600' 
                  : 'text-yellow-600'
              }`}>
                {scanData.hasReport ? scanData.report.status : scanData.reportStatus}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Images Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Images</h2>
            
            {/* Main Image Display */}
            <div className="mb-6">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                <img 
                  src={scanData.images[selectedImage]?.fullSize} 
                  alt={scanData.images[selectedImage]?.description}
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => setShowFullViewer(true)}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center text-gray-600 mt-2">
                {scanData.images[selectedImage]?.description}
              </p>
            </div>

            {/* Thumbnail Navigation */}
            <div className="flex gap-3 overflow-x-auto">
              {scanData.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index 
                      ? 'border-blue-500' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <img 
                    src={image.thumbnail} 
                    alt={image.description}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowFullViewer(true)}
                className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Open Full Viewer
              </button>
            </div>
          </div>

          {/* Report Section */}
          <div id="medical-report" className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Medical Report</h2>
            </div>

            {scanData.hasReport ? (
              <div className="space-y-6">
                {/* Technique */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Technique</h3>
                  <p className="text-gray-700 leading-relaxed">{scanData.report.technique}</p>
                </div>

                {/* Clinical History */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Clinical History</h3>
                  <p className="text-gray-700 leading-relaxed">{scanData.report.clinicalHistory}</p>
                </div>

                {/* Findings */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Findings</h3>
                  <p className="text-gray-700 leading-relaxed">{scanData.report.findings}</p>
                </div>

                {/* Impression */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Impression</h3>
                  <p className="text-blue-800 leading-relaxed">{scanData.report.impression}</p>
                </div>

                {/* Report Info */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Radiologist:</span>
                    <span className="text-gray-900 font-medium">{scanData.report.radiologist}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Report Date:</span>
                    <span className="text-gray-900">{scanData.report.reportDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">{scanData.report.status}</span>
                  </div>
                </div>
              </div>
            ) : (
              // Pending Report State
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">⏳</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">Report Pending</h3>
                  <p className="text-yellow-700 mb-4">
                    Your scan images have been successfully captured and are now being reviewed by our radiologist.
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Scan completed:</span>
                        <span className="text-gray-900 font-medium">{scanData.scanCompletedAt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Report expected:</span>
                        <span className="text-yellow-600 font-medium">{scanData.estimatedReportTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="text-yellow-600 font-medium">{scanData.reportStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {showFullViewer && (
        <ImageViewer
          images={scanData.images}
          initialIndex={selectedImage}
          onClose={() => setShowFullViewer(false)}
          patientName={scanData.patientInfo.name}
          studyDate={scanData.studyDate}
          modality={scanData.modality}
        />
      )}
    </div>
  );
};

export default ScanDetailView;