import React from 'react'
import AxisLogo from './AxisLogo'

interface ReportHeaderProps {
  className?: string
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ className = '' }) => {
  return (
    <div className={`print-header ${className}`}>
      <div className="flex justify-between items-start">
        {/* Logo and branding */}
        <div className="flex flex-col">
          <AxisLogo size="7rem" className="mb-2" />
          <p className="text-sm text-neutral-600 italic">
            Radiology that puts your patients first
          </p>
        </div>

        {/* Institution details */}
        <div className="text-right text-sm">
          <div className="font-semibold text-neutral-900 text-lg mb-1">
            Axis Imaging Mickleham
          </div>
          <div className="text-neutral-600 space-y-1">
            <div>Level 1, 107/21 Cityside Drive</div>
            <div>Mickleham VIC 3064</div>
            <div>Phone: (03) 8746 4200</div>
            <div>Email: info@axisimaging.com.au</div>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            AHPRA Registered • Medicare Provider
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportHeader