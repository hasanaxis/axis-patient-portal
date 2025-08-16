# Axis Imaging Patient Portal

A modern, healthcare-focused web application for Axis Imaging patients to view their medical imaging results, book appointments, and manage their healthcare information.

## Features

### Location Information
- **Single Location**: Level 1, 107/21 Cityside Drive, Mickleham VIC 3064
- **Contact**: (03) 8746 4200 | info@axisimaging.com.au
- **Official Axis Imaging Branding**: Custom SVG logo with gradient purple-to-magenta styling

### Core Functionality
- **Patient Dashboard** - Overview of scans, appointments, and medical information
- **My Scans** - View and manage medical imaging results with advanced filtering
- **Scan Viewer** - Integrated image and report viewer with medical imaging tools
- **Appointment Booking** - Online scheduling with multiple locations and modalities
- **Profile Management** - Comprehensive patient information management
- **Contact & Support** - Multiple contact methods and comprehensive help system

### Technical Highlights
- **Modern React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with custom medical design system
- **React Router** for client-side navigation
- **React Query** for efficient data fetching and caching
- **React Hook Form** for robust form handling
- **Framer Motion** for smooth animations
- **Mobile-first responsive design**
- **WCAG 2.1 accessibility compliance**

### Medical Features
- **Australian Healthcare Integration** - Medicare, IHI, AHPRA numbers
- **DICOM Viewer Integration** - Medical image viewing capabilities
- **Medical Terminology** - Comprehensive medical term highlighting and tooltips
- **Critical Findings Alerts** - Priority handling for urgent medical results
- **Report Sharing** - Direct integration with GP systems
- **Multi-location Support** - Multiple clinic locations with specific services

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (LoadingSpinner, ErrorBoundary)
│   └── layout/          # Layout components (Header, Footer, Breadcrumb)
├── pages/               # Page components
├── hooks/               # Custom React hooks (API calls)
├── api/                 # API client and mock data
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── main.tsx            # Application entry point
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd axis_patient_portal/webapp
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### Tailwind Configuration
The project uses a custom Tailwind configuration with Axis Imaging brand colors:
- Primary: Magenta (#ec0a8c)
- Secondary: Royal Blue (#006cb3) 
- Success: Axis Green (#00a496)
- Accent: Purple gradients

## Development

### Code Style
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Consistent naming conventions

### Component Guidelines
- Use functional components with hooks
- Implement proper TypeScript typing
- Follow accessibility best practices
- Use Tailwind CSS classes with utility-first approach
- Implement loading states and error handling

### API Integration
- React Query for data fetching
- Centralized API client with error handling
- Mock data for development and testing
- Type-safe API responses

## Testing

```bash
npm run test
```

## Deployment

The application can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Azure Static Web Apps

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Contributing

1. Follow the established code style and patterns
2. Write TypeScript types for new features
3. Implement proper error handling and loading states
4. Ensure accessibility compliance
5. Test on multiple devices and browsers

## License

This project is proprietary software developed for Axis Imaging.

## Support

For technical support or questions about the application:
- Email: support@axisimaging.com.au
- Phone: 1800 AXIS 24 (24/7)

## Medical Disclaimer

This application is for viewing medical imaging results and managing healthcare information. It is not intended for medical diagnosis or treatment decisions. Always consult with qualified healthcare professionals for medical advice.