#!/usr/bin/env node

/**
 * Test script for RTF parsing
 */

const fs = require('fs');
const path = require('path');

// Import the compiled JavaScript version
const { RTFReportParser } = require('./src/services/rtf-parser.js');

async function testRTFParsing() {
  try {
    console.log('🩺 Testing RTF Report Parser with actual test data...\n');
    
    // Read the actual RTF file
    const rtfPath = '/Users/bilalahmed/Downloads/Test Report.rtf';
    
    if (!fs.existsSync(rtfPath)) {
      console.error('❌ Test RTF file not found at:', rtfPath);
      return;
    }
    
    console.log('📄 Reading RTF file:', rtfPath);
    const rtfContent = fs.readFileSync(rtfPath, 'utf-8');
    console.log('📊 RTF file size:', Math.round(rtfContent.length / 1024), 'KB\n');
    
    // Parse the RTF report
    console.log('🔄 Parsing RTF report...');
    const parsedReport = RTFReportParser.parseReport(rtfContent);
    
    console.log('✅ RTF parsing completed!\n');
    console.log('📋 Parsed Report Structure:');
    console.log('================================');
    
    console.log('🏥 Radiologist:', parsedReport.radiologist || 'Not found');
    console.log('📅 Report Date:', parsedReport.reportDate || 'Not found');
    console.log('');
    
    if (parsedReport.technique) {
      console.log('🔬 Technique:');
      console.log(parsedReport.technique);
      console.log('');
    }
    
    if (parsedReport.clinicalHistory) {
      console.log('🩹 Clinical History:');
      console.log(parsedReport.clinicalHistory);
      console.log('');
    }
    
    console.log('🔍 Findings:');
    console.log(parsedReport.findings || 'None extracted');
    console.log('');
    
    console.log('🎯 Impression:');
    console.log(parsedReport.impression || 'None extracted');
    console.log('');
    
    console.log('📄 Raw Text Preview (first 500 chars):');
    console.log('----------------------------------------');
    console.log(parsedReport.rawText.substring(0, 500) + '...');
    console.log('');
    
    // Validate that we correctly identify Dr. Farhan Ahmed
    console.log('🧑‍⚕️ Radiologist Attribution Test:');
    if (parsedReport.radiologist?.includes('Farhan Ahmed')) {
      console.log('✅ PASS: Correctly attributed to Dr. Farhan Ahmed');
    } else if (parsedReport.radiologist === 'Dr. Farhan Ahmed, Axis Imaging') {
      console.log('✅ PASS: Using default Axis Imaging radiologist');
    } else {
      console.log('⚠️  WARNING: Radiologist attribution may need adjustment');
      console.log('   Found:', parsedReport.radiologist);
      console.log('   Expected: Dr. Farhan Ahmed, Axis Imaging');
    }
    
    // Test section extraction
    console.log('\n📊 Section Extraction Results:');
    console.log('- Technique extracted:', !!parsedReport.technique);
    console.log('- Clinical History extracted:', !!parsedReport.clinicalHistory);
    console.log('- Findings extracted:', !!parsedReport.findings);
    console.log('- Impression extracted:', !!parsedReport.impression);
    
  } catch (error) {
    console.error('❌ RTF parsing test failed:', error.message);
    console.error('\n Stack trace:', error.stack);
  }
}

// Run the test
testRTFParsing();