# Axis Imaging Patient Portal

A comprehensive healthcare patient portal for Axis Imaging radiology clinic in Mickleham, Victoria, Australia.

## 🏥 Overview

The Axis Imaging Patient Portal enables patients to:
- View their radiology scan images and reports
- Receive SMS notifications when results are ready
- Book appointments for radiology services (X-ray, CT, Ultrasound, DEXA)
- Access their medical imaging history
- Communicate with their healthcare providers

## 🚀 Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Mobile**: React Native, TypeScript, Expo
- **Shared**: Common types and utilities
- **Infrastructure**: Docker, Redis, Nginx

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Twilio account (for SMS)
- AWS S3 account (for file storage)

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/axis-imaging/patient-portal.git
cd patient-portal
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Copy the example environment files and configure them:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp mobile/.env.example mobile/.env
```

### 4. Database Setup
```bash
cd backend
npm run prisma:migrate
npm run prisma:generate
```

## 🐳 Docker Setup

Start all services with Docker Compose:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Backend API
- Frontend web app
- Nginx reverse proxy

## 🏃‍♂️ Running the Application

### Development Mode

Run all services concurrently:
```bash
npm run dev
```

Or run services individually:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**Mobile:**
```bash
cd mobile
npm run start
```

### Production Mode

Build all services:
```bash
npm run build
```

Start production servers:
```bash
docker-compose -f docker-compose.prod.yml up
```

## 📱 Mobile App

### iOS
```bash
cd mobile
npm run ios
```

### Android
```bash
cd mobile
npm run android
```

## 🧪 Testing

Run tests for all workspaces:
```bash
npm run test
```

## 📚 API Documentation

The API documentation is available at:
- Development: `http://localhost:5000/api-docs`
- Production: `https://api.axisimaging.com.au/api-docs`

## 🔐 Security Features

- JWT-based authentication
- Phone number verification via SMS
- Role-based access control (RBAC)
- Data encryption at rest and in transit
- HIPAA-compliant infrastructure
- Australian healthcare compliance

## 🏗️ Project Structure

```
axis-imaging-patient-portal/
├── backend/               # Node.js/Express API
│   ├── src/
│   ├── prisma/
│   └── tests/
├── frontend/             # React web application
│   ├── src/
│   └── public/
├── mobile/               # React Native app
│   ├── src/
│   └── assets/
├── shared/               # Shared types and utilities
│   └── src/
├── mock-data/           # Sample data for development
├── nginx/               # Nginx configuration
└── docker-compose.yml   # Docker configuration
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by Nexus Imaging Pty Ltd.

## 📞 Support

For support, email merrifield@axisimaging.com.au or call +61 3 7036 1709.

## 🏥 About Axis Imaging

Axis Imaging is a leading radiology clinic in Mickleham, Victoria, providing high-quality medical imaging services including X-ray, CT, MRI, Ultrasound, and DEXA scans.

---

© 2024 Nexus Imaging Pty Ltd. All rights reserved.