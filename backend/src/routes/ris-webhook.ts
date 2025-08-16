/**
 * RIS Webhook Endpoints
 * Handles incoming RTF reports from your RIS system
 */

import express from 'express';
import multer from 'multer';
import { RTFReportParser, processRISReport } from '../services/rtf-parser';
import { smsService } from '../services/simple-sms';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept RTF files and text files
    if (file.mimetype === 'application/rtf' || 
        file.mimetype === 'text/rtf' || 
        file.originalname.toLowerCase().endsWith('.rtf')) {
      cb(null, true);
    } else {
      cb(new Error('Only RTF files are allowed'), false);
    }
  }
});

/**
 * Webhook endpoint for RIS to send completed reports
 * POST /api/ris/webhook/report
 */
router.post('/webhook/report', upload.single('report'), async (req, res) => {
  try {
    const { studyId, patientId, accessionNumber } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No RTF report file provided' 
      });
    }

    if (!studyId || !patientId) {
      return res.status(400).json({ 
        error: 'studyId and patientId are required' 
      });
    }

    // Convert buffer to string
    const rtfContent = req.file.buffer.toString('utf-8');
    
    // Process the RTF report
    const parsedReport = await processRISReport(rtfContent, studyId);
    
    // TODO: Save to database
    // const report = await prisma.report.create({...});
    
    // Send SMS notification to patient
    // const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    // if (patient?.phoneNumber) {
    //   await smsService.sendReportReadyNotification(
    //     patient.phoneNumber,
    //     patient.firstName,
    //     accessionNumber
    //   );
    // }

    console.log(`RIS Report processed for study ${studyId}:`, {
      accessionNumber,
      patientId,
      reportLength: rtfContent.length,
      hasStructuredData: !!(parsedReport.findings && parsedReport.impression)
    });

    res.json({
      success: true,
      message: 'Report processed successfully',
      studyId,
      accessionNumber,
      reportId: `RPT_${Date.now()}` // Would be actual DB ID
    });

  } catch (error) {
    console.error('RIS webhook error:', error);
    res.status(500).json({
      error: 'Failed to process report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Alternative endpoint for RIS systems that send RTF as text in JSON
 * POST /api/ris/webhook/report-json
 */
router.post('/webhook/report-json', async (req, res) => {
  try {
    const { studyId, patientId, accessionNumber, rtfContent } = req.body;
    
    if (!rtfContent || !studyId || !patientId) {
      return res.status(400).json({ 
        error: 'rtfContent, studyId, and patientId are required' 
      });
    }

    // Process the RTF report
    const parsedReport = await processRISReport(rtfContent, studyId);
    
    res.json({
      success: true,
      message: 'Report processed successfully',
      studyId,
      accessionNumber,
      parsedSections: {
        hasFindings: !!parsedReport.findings,
        hasImpression: !!parsedReport.impression,
        hasClinicHistory: !!parsedReport.clinicalHistory,
        radiologist: parsedReport.radiologist
      }
    });

  } catch (error) {
    console.error('RIS webhook JSON error:', error);
    res.status(500).json({
      error: 'Failed to process report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test endpoint to validate RTF parsing
 * POST /api/ris/test-parse
 */
router.post('/test-parse', upload.single('report'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No RTF file provided' });
    }

    const rtfContent = req.file.buffer.toString('utf-8');
    const parsedReport = RTFReportParser.parseReport(rtfContent);
    
    res.json({
      success: true,
      originalSize: rtfContent.length,
      parsedReport: {
        technique: parsedReport.technique,
        clinicalHistory: parsedReport.clinicalHistory,
        findings: parsedReport.findings,
        impression: parsedReport.impression,
        radiologist: parsedReport.radiologist,
        reportDate: parsedReport.reportDate
      },
      rawTextPreview: parsedReport.rawText.substring(0, 500) + '...'
    });

  } catch (error) {
    console.error('Test parse error:', error);
    res.status(500).json({
      error: 'Failed to parse RTF',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;