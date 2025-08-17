// Ultra-minimal server for Azure App Service
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'Azure App Service Ultra Simple',
    version: '1.0.0'
  });
});

app.get('/api/dashboard', (req, res) => {
  res.json({
    patient: { name: 'John Doe', id: 'P001', email: 'test@axisimaging.com.au' },
    stats: { totalScans: 1, pendingResults: 0, recentScans: 1, upcomingAppointments: 0 },
    recentStudies: [{
      id: 'STD001', date: '2025-08-17', modality: 'XR',
      description: 'Chest X-Ray', status: 'COMPLETED',
      reportAvailable: true, imageCount: 2, bodyPart: 'CHEST'
    }]
  });
});

app.get('/api/studies', (req, res) => {
  res.json({
    studies: [{
      id: 'STD001', modality: 'XR', studyDescription: 'Chest X-Ray',
      status: 'COMPLETED', reportStatus: 'FINAL', imageCount: 2,
      report: {
        impression: 'Normal chest radiograph. No significant abnormality detected.',
        findings: 'Clear lungs, normal heart size and configuration.',
        radiologist: 'Dr. Farhan Ahmed, Axis Imaging'
      }
    }]
  });
});

app.post('/api/voyager/webhook', (req, res) => {
  console.log('Voyager webhook:', req.body);
  res.json({ success: true, message: 'Webhook received', integration: 'voyager-ris' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Axis Imaging API', status: 'running', integrations: 'ready' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;