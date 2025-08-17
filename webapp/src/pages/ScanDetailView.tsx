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
import { useStudy } from '../hooks/useApi';
import LoadingSpinner from '../components/common/LoadingSpinner';

const ScanDetailView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scanId } = useParams<{ scanId: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showFullViewer, setShowFullViewer] = useState(false);


  // Use real API data for production
  const { data: study, isLoading, error } = useStudy(scanId || '');

  // Scroll to report section if hash is present
  useEffect(() => {
    if (location.hash === '#report') {
      setTimeout(() => {
        const reportElement = document.getElementById('medical-report');
        if (reportElement) {
          reportElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.hash]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Study Not Found</h2>
          <p className="text-gray-600 mb-4">The requested study could not be found.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Transform study data for component use
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-AU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get images from study series
  const images = study.series?.[0]?.images?.map((image, index) => ({
    id: index + 1,
    thumbnail: image.thumbnailUrl || 'https://via.placeholder.com/256x256/1a1a1a/666666?text=Medical+Image',
    fullSize: image.imageUrl || 'https://via.placeholder.com/512x512/1a1a1a/666666?text=Medical+Image',
    description: `${study.modality} Image ${index + 1}`
  })) || [];

  const hasReport = !!study.report;
  const reportStatus = study.report?.status || 'Pending';

  // Create scanData object to match existing component structure
  const scanData = {
    id: study.id,
    title: study.studyDescription,
    modality: study.modality,
    date: formatDate(study.studyDate),
    studyDate: new Date(study.studyDate).toISOString().split('T')[0],
    accessionNumber: study.accessionNumber,
    patientInfo: {
      name: `${study.patient?.user?.firstName} ${study.patient?.user?.lastName}`,
      dob: study.patient?.dateOfBirth ? new Date(study.patient.dateOfBirth).toLocaleDateString('en-AU') : '',
      mrn: study.patient?.patientNumber || ''
    },
    technician: study.institutionName || 'Axis Imaging',
    images,
    hasReport,
    reportStatus,
    report: study.report ? {
      technique: study.report.technique || '',
      clinicalHistory: study.report.clinicalHistory || '',
      findings: study.report.findings || '',
      impression: study.report.impression || '',
      radiologist: 'Axis Imaging Radiologist',
      reportDate: study.report.approvedAt ? formatDate(study.report.approvedAt) : '',
      status: study.report.status
    } : undefined
  };

  const handleDownload = () => {
    console.log('Downloading scan images...');
  };

  const handleShare = () => {
    console.log('Sharing scan...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Scan Details</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownload}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
              <button
                onClick={handleShare}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Study Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Study Details Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Study Information</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Study Description</h3>
                  <p className="text-gray-900">{scanData.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Modality</h3>
                    <p className="text-gray-900">{scanData.modality}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Date</h3>
                    <p className="text-gray-900">{scanData.date}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Institution</h3>
                  <p className="text-gray-900">{scanData.technician}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Accession Number</h3>
                    <p className="text-gray-900">{scanData.accessionNumber}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Study Date</h3>
                    <p className="text-gray-900">{scanData.studyDate}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Report Status</h3>
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      scanData.hasReport 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {scanData.hasReport ? scanData.report?.status : scanData.reportStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Images and Report */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Medical Images</h2>
                <button
                  onClick={() => setShowFullViewer(true)}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100"
                >
                  <ZoomIn className="w-4 h-4 mr-1" />
                  Full Viewer
                </button>
              </div>

              {scanData.images.length > 0 ? (
                <>
                  {/* Main Image */}
                  <div className="mb-4">
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                      <img
                        src={scanData.images[selectedImage]?.fullSize} 
                        alt={scanData.images[selectedImage]?.description}
                        className="w-full h-full object-contain"
                        style={{ background: '#1a1a1a' }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      {scanData.images[selectedImage]?.description}
                    </p>
                  </div>

                  {/* Thumbnail Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {scanData.images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setSelectedImage(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === index
                            ? 'border-purple-500 ring-2 ring-purple-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image.thumbnail}
                          alt={image.description}
                          className="w-full h-full object-cover"
                        />
                        {selectedImage === index && (
                          <div className="absolute inset-0 bg-purple-500 bg-opacity-20" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No images available for this study
                </div>
              )}
            </div>

            {/* Report Section */}
            <div id="medical-report" className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical Report</h2>
              
              {scanData.hasReport ? (
                <div className="space-y-6">
                  {/* Technique */}
                  {scanData.report?.technique && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">TECHNIQUE</h3>
                      <p className="text-gray-700 leading-relaxed">{scanData.report.technique}</p>
                    </div>
                  )}

                  {/* Clinical History */}
                  {scanData.report?.clinicalHistory && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">CLINICAL HISTORY</h3>
                      <p className="text-gray-700 leading-relaxed">{scanData.report.clinicalHistory}</p>
                    </div>
                  )}

                  {/* Findings */}
                  {scanData.report?.findings && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">FINDINGS</h3>
                      <p className="text-gray-700 leading-relaxed">{scanData.report.findings}</p>
                    </div>
                  )}

                  {/* Impression */}
                  {scanData.report?.impression && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">IMPRESSION</h3>
                      <p className="text-blue-800 leading-relaxed">{scanData.report.impression}</p>
                    </div>
                  )}

                  {/* Report Details */}
                  <div className="border-t pt-4 mt-6">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Radiologist:</span><br/>
                        <span className="text-gray-900 font-medium">{scanData.report?.radiologist}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Report Date:</span><br/>
                        <span className="text-gray-900">{scanData.report?.reportDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span><br/>
                        <span className="text-green-600 font-medium">{scanData.report?.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Pending Report UI */
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Report Pending</h3>
                  <p className="text-gray-600 mb-6">
                    Your scan has been completed and images are available for viewing. 
                    The radiologist report is currently being prepared.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-gray-500">Scan Completed:</span><br/>
                        <span className="text-gray-900 font-medium">{scanData.date}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span><br/>
                        <span className="text-yellow-600 font-medium">{scanData.reportStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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