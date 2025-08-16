/**
 * RTF Report Viewer Component
 * Alternative approach: Display RTF reports exactly as received from RIS
 */

import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer } from 'lucide-react';

interface RTFReportViewerProps {
  rtfContent: string;
  reportId: string;
  onDownload?: () => void;
  onPrint?: () => void;
}

const RTFReportViewer: React.FC<RTFReportViewerProps> = ({
  rtfContent,
  reportId,
  onDownload,
  onPrint
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    convertRTFToHTML(rtfContent);
  }, [rtfContent]);

  const convertRTFToHTML = async (rtf: string) => {
    try {
      setIsLoading(true);
      
      // Option 1: Use a client-side RTF parser library
      // npm install rtf-parser
      // import { parseRtf } from 'rtf-parser';
      
      // Option 2: Send to backend for conversion
      const response = await fetch('/api/convert-rtf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rtfContent: rtf })
      });

      if (!response.ok) {
        throw new Error('Failed to convert RTF');
      }

      const { htmlContent } = await response.json();
      setHtmlContent(htmlContent);
      
    } catch (err) {
      console.error('RTF conversion error:', err);
      setError('Failed to display report. Please download the original file.');
      
      // Fallback: Strip basic RTF formatting manually
      const plainText = stripBasicRTF(rtf);
      setHtmlContent(`<pre style="white-space: pre-wrap; font-family: monospace;">${plainText}</pre>`);
      
    } finally {
      setIsLoading(false);
    }
  };

  // Basic RTF stripping fallback
  const stripBasicRTF = (rtf: string): string => {
    return rtf
      .replace(/\\[a-z]+[0-9]*\s?/g, '') // Remove RTF control words
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\\\\/g, '\\') // Unescape backslashes
      .replace(/\\'/g, "'") // Unescape quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const blob = new Blob([rtfContent], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.rtf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading report...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Medical Report</h2>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download RTF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 text-sm">{error}</p>
        </div>
      )}

      {/* Report Content */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: '1.6',
            color: '#374151'
          }}
        />
      </div>

      {/* Report Metadata */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-4">
        <p>Report ID: {reportId}</p>
        <p>Format: RTF (Rich Text Format)</p>
        <p>Size: {Math.round(rtfContent.length / 1024)} KB</p>
      </div>
    </div>
  );
};

export default RTFReportViewer;