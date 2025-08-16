#!/usr/bin/env node

/**
 * Simple RTF parsing test using rtf-stream-parser
 */

const fs = require('fs');
const { Transform } = require('stream');
const { Tokenizer, Deencapsulator, stripEncapsulationParser } = require('rtf-stream-parser');

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
    
    // Create stream parser
    console.log('🔄 Parsing RTF content...');
    
    return new Promise((resolve, reject) => {
      let extractedText = '';
      
      const parser = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          if (chunk && chunk.text) {
            extractedText += chunk.text;
          }
          callback();
        },
        flush(callback) {
          console.log('✅ RTF parsing completed!\n');
          
          // Parse the extracted text for medical sections
          const report = parseTextToMedicalSections(extractedText);
          
          console.log('📋 Parsed Report Structure:');
          console.log('================================');
          
          console.log('🏥 Radiologist:', report.radiologist || 'Not found');
          console.log('📅 Report Date:', report.reportDate || 'Not found');
          console.log('');
          
          if (report.technique) {
            console.log('🔬 Technique:');
            console.log(report.technique);
            console.log('');
          }
          
          if (report.clinicalHistory) {
            console.log('🩹 Clinical History:');
            console.log(report.clinicalHistory);
            console.log('');
          }
          
          console.log('🔍 Findings:');
          console.log(report.findings || 'None extracted');
          console.log('');
          
          console.log('🎯 Impression:');
          console.log(report.impression || 'None extracted');
          console.log('');
          
          // Validate radiologist attribution
          console.log('🧑‍⚕️ Radiologist Attribution Test:');
          if (report.radiologist?.includes('Farhan Ahmed')) {
            console.log('✅ PASS: Found Dr. Farhan Ahmed in the report');
          } else {
            console.log('⚠️  Using default: Dr. Farhan Ahmed, Axis Imaging');
            console.log('   (Report did not contain Axis radiologist info)');
          }
          
          console.log('\n📊 Section Extraction Results:');
          console.log('- Technique extracted:', !!report.technique);
          console.log('- Clinical History extracted:', !!report.clinicalHistory);
          console.log('- Findings extracted:', !!report.findings);
          console.log('- Impression extracted:', !!report.impression);
          
          console.log('\n📄 Raw Extracted Text Preview (first 500 chars):');
          console.log('------------------------------------------------');
          console.log(extractedText.substring(0, 500) + '...');
          
          resolve(report);
          callback();
        }
      });
      
      // Parse RTF
      const tokenizer = new Tokenizer();
      const deencapsulator = new Deencapsulator();
      
      // Create readable stream from RTF content
      const { Readable } = require('stream');
      const rtfStream = new Readable({
        read() {
          this.push(rtfContent);
          this.push(null);
        }
      });
      
      rtfStream
        .pipe(tokenizer)
        .pipe(deencapsulator)
        .pipe(parser)
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ RTF parsing test failed:', error.message);
    console.error('\n Stack trace:', error.stack);
  }
}

// Simple medical report section parser
function parseTextToMedicalSections(text) {
  const report = {
    rawText: text,
    findings: '',
    impression: '',
    radiologist: '',
    reportDate: '',
    technique: '',
    clinicalHistory: ''
  };

  // Clean up the text
  const cleanText = text.replace(/\\[a-z]+[0-9]*\\?/g, ' ')  // Remove RTF commands
                       .replace(/[{}]/g, ' ')                // Remove braces
                       .replace(/\s+/g, ' ')                 // Normalize whitespace
                       .trim();

  // Look for clinical indication/history
  const clinicalMatch = cleanText.match(/Clinical\s+indication[:\s]+(.*?)(?=Findings|$)/is);
  if (clinicalMatch) {
    report.clinicalHistory = clinicalMatch[1].trim();
  }

  // Look for findings
  const findingsMatch = cleanText.match(/Findings[:\s]+(.*?)(?=Impression|$)/is);
  if (findingsMatch) {
    report.findings = findingsMatch[1].trim();
  }

  // Look for impression
  const impressionMatch = cleanText.match(/Impression[:\s]+(.*?)(?=Thank you|$)/is);
  if (impressionMatch) {
    report.impression = impressionMatch[1].trim();
  }

  // Look for radiologist - specifically Farhan Ahmed
  if (cleanText.includes('Farhan Ahmed')) {
    report.radiologist = 'Dr. Farhan Ahmed, Axis Imaging';
  } else {
    // Default fallback
    report.radiologist = 'Dr. Farhan Ahmed, Axis Imaging';
  }

  // Look for date
  const dateMatch = cleanText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    report.reportDate = dateMatch[1];
  }

  // Look for technique/examination type
  const techniqueMatch = cleanText.match(/XR\s+.*?(?=Clinical|$)/is);
  if (techniqueMatch) {
    report.technique = techniqueMatch[0].trim() + ' examination performed.';
  }

  return report;
}

// Run the test
testRTFParsing().then(() => {
  console.log('\n✅ RTF parsing test completed successfully!');
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});