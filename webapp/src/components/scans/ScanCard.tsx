import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ScanCardProps {
  scan: {
    id: string;
    title: string;
    date: string;
    type: string;
    bodyPart: string;
    status: 'completed' | 'pending' | 'urgent';
    thumbnail?: string;
    hasReport: boolean;
  };
}

const ScanCard: React.FC<ScanCardProps> = ({ scan }) => {
  const navigate = useNavigate();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'urgent':
        return '🔴';
      case 'pending':
        return '🟡';
      case 'completed':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div 
      onClick={() => navigate(`/scans/${scan.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start space-x-4">
        {/* Scan Thumbnail */}
        <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
          {scan.thumbnail ? (
            <img 
              src={scan.thumbnail} 
              alt={scan.title}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="text-gray-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        {/* Scan Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                {scan.title}
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                {scan.type} • {scan.bodyPart}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {scan.date}
              </p>
            </div>

            {/* Status and Actions */}
            <div className="flex flex-col items-end space-y-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(scan.status)}`}>
                <span className="mr-1">{getStatusIcon(scan.status)}</span>
                {scan.status}
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button className="p-2 text-green-600 hover:bg-green-50 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button className="p-2 text-pink-600 hover:bg-pink-50 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Status */}
      {scan.hasReport && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center text-sm text-green-600">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Report Available
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanCard;