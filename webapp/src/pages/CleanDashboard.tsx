import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Download, 
  FileText, 
  Share2,
  Menu,
  Settings,
  LogOut,
  Scan,
  Calendar,
  Phone
} from 'lucide-react';
import { usePatient, useDashboard } from '@/hooks/useApi';

const CleanDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState<any>(null);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  // Use real API data for production
  const { data: patient } = usePatient();
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useDashboard();

  // Fallback values if patient data is not loaded
  const firstName = patient?.firstName || 'Guest';
  const lastName = patient?.lastName || 'User';
  const userInitials = `${firstName[0]}${lastName[0]}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target as Node)) {
        setShowMenuDropdown(false);
      }
      
      // Close download dropdown when clicking outside
      const target = event.target as HTMLElement;
      if (!target.closest('.download-dropdown-container')) {
        setShowDownloadDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const downloadFile = async (url: string, filename: string, type: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success message
      const event = new CustomEvent('showToast', {
        detail: {
          message: `${type} downloaded successfully`,
          type: 'success'
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      // Show error message
      const event = new CustomEvent('showToast', {
        detail: {
          message: `${type} download failed. Please try again.`,
          type: 'error'
        }
      });
      window.dispatchEvent(event);
    }
  };

  const generatePDFReport = async (scan: any): Promise<string> => {
    // Generate a basic PDF report with scan information
    const reportContent = `
      Medical Imaging Report
      
      Patient: ${firstName} ${lastName}
      Study: ${scan.title}
      Modality: ${scan.modality}
      Date: ${scan.date}
      
      Description: ${scan.description}
      
      Report Status: Available for review
      Institution: Axis Imaging Mickleham
      
      For detailed medical interpretation, please consult with your healthcare provider.
    `;
    
    // Create a simple text file that can be saved as PDF
    const blob = new Blob([reportContent], { type: 'text/plain' });
    return URL.createObjectURL(blob);
  };

  const generateImageZip = async (scan: any): Promise<string> => {
    // For this demo, we'll create a text file listing the images
    // In a real app, this would package actual DICOM/JPEG files
    const imageList = `
      Medical Image Package
      
      Scan: ${scan.title}
      Date: ${scan.date}
      Modality: ${scan.modality}
      
      Image Files Included:
      - ${scan.title.replace(/\s+/g, '_')}_001.dcm
      - ${scan.title.replace(/\s+/g, '_')}_002.dcm
      - ${scan.title.replace(/\s+/g, '_')}_thumbnail.jpg
      
      Note: This is a demo file. In production, actual DICOM images would be packaged.
    `;
    
    const blob = new Blob([imageList], { type: 'text/plain' });
    return URL.createObjectURL(blob);
  };

  const generateCompletePackage = async (scan: any): Promise<string> => {
    // Generate a comprehensive package info file
    const packageContent = `
      Complete Medical Scan Package
      
      Patient: ${firstName} ${lastName}
      Study: ${scan.title}
      Modality: ${scan.modality}
      Date: ${scan.date}
      
      Package Contents:
      1. Medical Report (PDF)
      2. DICOM Image Files
      3. Thumbnail Images
      4. Study Metadata
      
      Description: ${scan.description}
      
      Institution: Axis Imaging Mickleham
      Report Status: Available
      
      For questions about this package, contact your healthcare provider.
    `;
    
    const blob = new Blob([packageContent], { type: 'text/plain' });
    return URL.createObjectURL(blob);
  };

  const handleDownloadReport = async (scan: any) => {
    try {
      const reportUrl = await generatePDFReport(scan);
      const filename = `${scan.title.replace(/\s+/g, '_')}_Report_${scan.date.replace(/\s+/g, '_')}.txt`;
      await downloadFile(reportUrl, filename, 'Report');
      URL.revokeObjectURL(reportUrl); // Clean up the blob URL
    } catch (error) {
      console.error('Error generating report:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Report generation failed. Please try again.', type: 'error' }
      });
      window.dispatchEvent(event);
    }
    setShowDownloadDropdown(null);
  };

  const handleDownloadImages = async (scan: any) => {
    try {
      const imagesUrl = await generateImageZip(scan);
      const filename = `${scan.title.replace(/\s+/g, '_')}_Images_${scan.date.replace(/\s+/g, '_')}.txt`;
      await downloadFile(imagesUrl, filename, 'Images');
      URL.revokeObjectURL(imagesUrl); // Clean up the blob URL
    } catch (error) {
      console.error('Error generating image package:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Image package generation failed. Please try again.', type: 'error' }
      });
      window.dispatchEvent(event);
    }
    setShowDownloadDropdown(null);
  };

  const handleDownloadAll = async (scan: any) => {
    try {
      const packageUrl = await generateCompletePackage(scan);
      const filename = `${scan.title.replace(/\s+/g, '_')}_Complete_${scan.date.replace(/\s+/g, '_')}.txt`;
      await downloadFile(packageUrl, filename, 'Complete package');
      URL.revokeObjectURL(packageUrl); // Clean up the blob URL
    } catch (error) {
      console.error('Error generating complete package:', error);
      const event = new CustomEvent('showToast', {
        detail: { message: 'Package generation failed. Please try again.', type: 'error' }
      });
      window.dispatchEvent(event);
    }
    setShowDownloadDropdown(null);
  };

  const handleShare = (scan: any) => {
    // Create a modal or popup for sharing options

    // For now, we'll copy a share link to clipboard
    const shareUrl = `${window.location.origin}/scans/${scan.id}`;
    
    if (navigator.share) {
      // Use native sharing if available (mobile)
      navigator.share({
        title: `Medical Scan: ${scan.title}`,
        text: `View my ${scan.modality} scan from ${scan.date}`,
        url: shareUrl
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        const event = new CustomEvent('showToast', {
          detail: {
            message: 'Share link copied to clipboard',
            type: 'success'
          }
        });
        window.dispatchEvent(event);
      }).catch(() => {
        // Show share modal as fallback
        setShowShareModal(scan);
      });
    }
  };


  // For production, use real data or show empty state
  const hasRealData = dashboardData && (dashboardData as any)?.recentStudies?.length > 0;
  const rawScans = hasRealData ? (dashboardData as any).recentStudies : [];

  // Transform real API data into the format expected by the UI
  const scans = rawScans.map((study: any) => {
    const studyDate = new Date(study.studyDate || study.date);
    const daysSinceStudy = Math.floor((Date.now() - studyDate.getTime()) / (1000 * 60 * 60 * 24));
    const isNew = daysSinceStudy <= 7 && !study.viewedAt;
    
    return {
      id: study.id,
      title: study.description || study.studyDescription || `${study.modality} Scan`,
      modality: study.modality,
      date: studyDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      description: `${study.modality} examination`,
      thumbnail: study.series?.[0]?.images?.[0]?.thumbnailUrl || 
                `https://via.placeholder.com/256x256/1a1a1a/666666?text=${study.modality}+Scan`,
      isNew: isNew,
      hasReport: study.reportAvailable !== false,
      reportStatus: study.status || 'COMPLETED',
      daysSinceStudy: daysSinceStudy,
      viewedAt: study.viewedAt
    };
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="relative" ref={menuDropdownRef}>
          <button 
            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>

          {/* Menu Dropdown */}
          {showMenuDropdown && (
            <div className="absolute left-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  navigate('/scans');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <Scan className="w-4 h-4" />
                My Scans
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  navigate('/book');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <Calendar className="w-4 h-4" />
                Book Appointment
              </button>
              <button
                onClick={() => {
                  setShowMenuDropdown(false);
                  navigate('/contact');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <Phone className="w-4 h-4" />
                Contact Us
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center">
          <img 
            src="/assets/logos/axis-logo-color.png" 
            alt="Axis Imaging" 
            className="h-20"
          />
        </div>
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 hover:ring-2 hover:ring-purple-500 transition-all flex items-center justify-center"
          >
            {patient?.profilePicture ? (
              <img 
                src={patient.profilePicture} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-sm">
                {userInitials}
              </span>
            )}
          </button>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button
                onClick={() => {
                  setShowProfileDropdown(false);
                  navigate('/profile');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
              >
                <Settings className="w-4 h-4" />
                Account Settings
              </button>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero Banner */}
      <div className="px-4 md:px-12 py-4">
        <div className="relative bg-gradient-to-r from-[#662D91] to-[#EC008C] rounded-2xl p-4 md:p-6 overflow-hidden">
          <div className="relative z-10 max-w-[60%] md:max-w-[60%]">
            <h2 className="text-white text-lg md:text-2xl font-bold mb-3">
              Hello {firstName}, Welcome to Axis Imaging
            </h2>
            <button 
              onClick={() => navigate('/book')}
              className="bg-white text-pink-500 px-4 md:px-6 py-2 rounded-full font-semibold text-xs md:text-sm hover:bg-gray-50 transition-colors"
            >
              Book Appointment
            </button>
          </div>
          <div className="absolute right-4 bottom-0 h-full flex items-end">
            <img 
              src="/assets/images/doctor-homepage.png" 
              alt="Doctor" 
              className="h-full max-h-44 object-contain"
            />
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div className="px-4 md:px-12 py-2">
        <h2 className="text-xl font-semibold">My Scans</h2>
      </div>

      {/* Scans List */}
      <div className="px-4 md:px-12 pb-6 overflow-visible">
        {isDashboardLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your scans...</p>
            </div>
          </div>
        ) : scans.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🏥</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scans Available</h3>
            <p className="text-gray-600 mb-6">
              Your scan results will appear here when they become available from Axis Imaging.
            </p>
            <button 
              onClick={() => navigate('/book')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
            >
              Book New Appointment
            </button>
          </div>
        ) : (
          scans.map((scan: any) => (
          <div key={scan.id} className="bg-white rounded-xl mb-4 shadow-sm relative">
            <div className="flex">
              {/* Thumbnail */}
              <div className="w-24 h-24 md:w-32 md:h-32 bg-black flex-shrink-0">
                <img 
                  src={scan.thumbnail} 
                  alt={scan.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/placeholder/128/128';
                  }}
                />
              </div>
              
              {/* Content */}
              <div className="flex-1 p-3 md:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base md:text-lg">{scan.title}</h3>
                      {scan.isNew && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <span className="text-lg">🩻</span> {scan.modality}
                      </span>
                      <span>{scan.date}</span>
                      {scan.daysSinceStudy === 0 && (
                        <span className="text-purple-600 font-medium">Today</span>
                      )}
                      {scan.daysSinceStudy === 1 && (
                        <span className="text-purple-600 font-medium">Yesterday</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {scan.description}
                </p>
                
                {/* Status Badge for New/Pending with Axis Branding */}
                {(scan.isNew || scan.reportStatus === 'Pending') && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {scan.isNew && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">
                        ✨ NEW
                      </span>
                    )}
                    {scan.reportStatus === 'Pending' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ Report Pending
                      </span>
                    )}
                  </div>
                )}

                {/* Additional Info for Pending Reports */}
                {scan.reportStatus === 'Pending' && (
                  <div className="mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-700">
                      <strong>Scan completed:</strong> {scan.scanCompletedAt}<br/>
                      <strong>Report expected:</strong> {scan.estimatedReportTime}
                    </p>
                  </div>
                )}
                
                {/* Action Buttons with Labels */}
                <div className="flex justify-start gap-3">
                  <div className="flex flex-col items-center w-16">
                    <button 
                      onClick={() => navigate(`/scans/${scan.id}`)}
                      className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                    >
                      <Eye className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <span className="text-xs text-gray-500 mt-1">View</span>
                  </div>
                  
                  <div className="flex flex-col items-center w-16 relative download-dropdown-container">
                    <button 
                      onClick={() => setShowDownloadDropdown(showDownloadDropdown?.id === scan.id ? null : scan)}
                      className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors"
                    >
                      <Download className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <span className="text-xs text-gray-500 mt-1">Download</span>
                    
                    {/* Download Dropdown */}
                    {showDownloadDropdown?.id === scan.id && (
                      <div className="absolute top-12 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-48">
                        <button
                          onClick={() => handleDownloadReport(scan)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                        >
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-sm">📄</span>
                          </div>
                          <div>
                            <div className="font-medium text-sm">Download Report</div>
                            <div className="text-xs text-gray-500">PDF format</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDownloadImages(scan)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm">🖼️</span>
                          </div>
                          <div>
                            <div className="font-medium text-sm">Download Images</div>
                            <div className="text-xs text-gray-500">DICOM/JPEG files</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDownloadAll(scan)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                        >
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm">📦</span>
                          </div>
                          <div>
                            <div className="font-medium text-sm">Download All</div>
                            <div className="text-xs text-gray-500">Complete package</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center w-16">
                    <button 
                      onClick={() => {
                        if (scan.hasReport) {
                          navigate(`/scans/${scan.id}#report`);
                        } else {
                          // Show tooltip or navigate to scan page with pending message
                          navigate(`/scans/${scan.id}`);
                        }
                      }}
                      className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full transition-colors ${
                        scan.hasReport 
                          ? 'bg-purple-500 text-white hover:bg-purple-600' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={!scan.hasReport}
                      title={scan.hasReport ? 'View Report' : 'Report pending - expected within 24 hours'}
                    >
                      <FileText className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <span className={`text-xs mt-1 ${scan.hasReport ? 'text-gray-500' : 'text-gray-400'}`}>
                      {scan.hasReport ? 'Report' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center w-16">
                    <button 
                      onClick={() => handleShare(scan)}
                      className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                    >
                      <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <span className="text-xs text-gray-500 mt-1">Share</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Share Scan</h3>
            <p className="text-gray-600 mb-4">Share "{showShareModal.title}" with your healthcare provider</p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/scans/${showShareModal.id}`;
                  navigator.clipboard.writeText(shareUrl);
                  setShowShareModal(null);
                  // Show toast notification
                  const event = new CustomEvent('showToast', {
                    detail: { message: 'Link copied to clipboard', type: 'success' }
                  });
                  window.dispatchEvent(event);
                }}
                className="w-full p-3 text-left hover:bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">🔗</span>
                </div>
                <div>
                  <div className="font-medium">Copy Link</div>
                  <div className="text-sm text-gray-500">Share a secure link to this scan</div>
                </div>
              </button>

              <button
                onClick={() => {
                  const emailSubject = `Medical Scan: ${showShareModal.title}`;
                  const emailBody = `Please find my ${showShareModal.modality} scan from ${showShareModal.date}.\n\nView scan: ${window.location.origin}/scans/${showShareModal.id}`;
                  window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                  setShowShareModal(null);
                }}
                className="w-full p-3 text-left hover:bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">📧</span>
                </div>
                <div>
                  <div className="font-medium">Email to GP</div>
                  <div className="text-sm text-gray-500">Send via email to your healthcare provider</div>
                </div>
              </button>

              <button
                onClick={() => {
                  const message = `View my ${showShareModal.modality} scan: ${window.location.origin}/scans/${showShareModal.id}`;
                  window.location.href = `sms:?body=${encodeURIComponent(message)}`;
                  setShowShareModal(null);
                }}
                className="w-full p-3 text-left hover:bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">💬</span>
                </div>
                <div>
                  <div className="font-medium">Text Message</div>
                  <div className="text-sm text-gray-500">Share via SMS</div>
                </div>
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowShareModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CleanDashboard;