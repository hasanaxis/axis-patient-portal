import React from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, Shield, Heart } from 'lucide-react'
import AxisLogo from '@/components/common/AxisLogo'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  const quickLinks = [
    { name: 'Dashboard', href: '/' },
    { name: 'My Scans', href: '/scans' },
    { name: 'Book Appointment', href: '/book' },
    { name: 'My Profile', href: '/profile' },
  ]

  const supportLinks = [
    { name: 'Help & Support', href: '/help' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
  ]

  const locations = [
    {
      name: 'Mickleham',
      address: 'Level 1, 107/21 Cityside Drive, Mickleham VIC 3064',
      phone: '(03) 8746 4200',
    },
  ]

  return (
    <footer className="bg-white border-t border-neutral-200 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand and mission */}
            <div className="lg:col-span-1">
              <div className="mb-4">
                <AxisLogo size="7rem" />
              </div>
              <p className="text-neutral-600 text-sm leading-relaxed mb-4">
                Radiology that puts your patients first. Advanced imaging technology with compassionate care.
              </p>
              <div className="flex items-center space-x-2 text-sm text-neutral-600">
                <Heart className="w-4 h-4 text-primary-500" />
                <span>Your Health, Our Priority</span>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
                Quick Links
              </h3>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-neutral-600 hover:text-primary-600 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
                Support
              </h3>
              <ul className="space-y-3">
                {supportLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-neutral-600 hover:text-primary-600 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact info */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
                Contact
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Phone className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-neutral-900">24/7 Support</div>
                    <a 
                      href="tel:1800AXIS24" 
                      className="text-sm text-neutral-600 hover:text-primary-600 transition-colors"
                    >
                      1800 AXIS 24
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Mail className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-neutral-900">Email</div>
                    <a 
                      href="mailto:support@axisimaging.com.au" 
                      className="text-sm text-neutral-600 hover:text-primary-600 transition-colors"
                    >
                      support@axisimaging.com.au
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-neutral-900">Hours</div>
                    <div className="text-sm text-neutral-600">
                      Mon-Fri: 7:00 AM - 7:00 PM<br />
                      Sat: 8:00 AM - 4:00 PM
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Locations section */}
        <div className="py-8 border-t border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide mb-4">
            Our Locations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {locations.map((location) => (
              <div key={location.name} className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-primary-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-neutral-900">{location.name}</div>
                  <div className="text-sm text-neutral-600">{location.address}</div>
                  <a 
                    href={`tel:${location.phone.replace(/\D/g, '')}`}
                    className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    {location.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section */}
        <div className="py-6 border-t border-neutral-200">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-neutral-600">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-success-500" />
                <span>ISO 27001 Certified</span>
              </div>
              <div>AHPRA Registered</div>
              <div>Medicare Provider</div>
            </div>
            
            <div className="text-sm text-neutral-600">
              © {currentYear} Axis Imaging. All rights reserved.
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <p className="text-xs text-neutral-500 text-center">
              This system is for authorised use only. All activities are monitored and recorded for security purposes.
              Your medical information is protected under the Privacy Act 1988 and stored securely in Australia.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer