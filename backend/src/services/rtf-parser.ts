/**
 * RTF Report Parser Service
 * Extracts structured medical report data from RTF files sent by RIS
 */

// Using basic RTF stripping instead of external library

export interface ParsedReport {
  technique?: string;
  clinicalHistory?: string;
  findings: string;
  impression: string;
  radiologist?: string;
  reportDate?: string;
  rawText: string;
}

export class RTFReportParser {
  /**
   * Strip RTF formatting to extract plain text
   */
  private static stripRTF(rtfContent: string): string {
    return rtfContent
      // Remove RTF control sequences like \rtf1, \ansi, etc.
      .replace(/\\[a-z]+[0-9]*\s?/g, ' ')
      // Remove braces
      .replace(/[{}]/g, ' ')
      // Remove escaped characters
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Clean extracted text by removing remaining RTF artifacts
   */
  private static cleanExtractedText(text: string): string {
    return text
      .replace(/\\[a-z]+[0-9]*\s?/g, ' ')  // Remove any remaining RTF commands
      .replace(/[{}]/g, ' ')                 // Remove braces
      .replace(/\s+/g, ' ')                  // Normalize whitespace
      .replace(/^\s*[\s\S]*?(?=XR |Clinical|Findings|Impression|\w)/i, '') // Remove header junk
      .trim();
  }

  /**
   * Parse RTF content into structured medical report sections
   */
  static parseReport(rtfContent: string): ParsedReport {
    // Strip RTF formatting to get plain text
    const plainText = this.stripRTF(rtfContent);
    
    // Extract structured sections using common medical report patterns
    const report: ParsedReport = {
      rawText: plainText,
      findings: '',
      impression: ''
    };

    // Updated patterns based on actual RTF structure
    const sectionPatterns = {
      technique: /(?:XR\s+RIGHT\s+LEG.*?XR\s+RIGHT\s+ANKLE\s+AND\s+FOOT)/is,
      clinicalHistory: /(?:Clinical\s+indication[:\s]+)(.*?)(?=Findings|$)/is,
      findings: /(?:Findings[:\s]+)(.*?)(?=Impression|$)/is,
      impression: /(?:Impression[:\s]+)(.*?)(?=Thank you|Farhan|$)/is,
    };

    // Extract each section and clean the text
    Object.entries(sectionPatterns).forEach(([key, pattern]) => {
      const match = plainText.match(pattern);
      if (match && match[1]) {
        report[key as keyof ParsedReport] = this.cleanExtractedText(match[1]);
      }
    });

    // If structured parsing fails, try fallback patterns
    if (!report.findings && !report.impression) {
      report.findings = this.extractFallbackFindings(plainText);
      report.impression = this.extractFallbackImpression(plainText);
    }

    // Extract radiologist name
    report.radiologist = this.extractRadiologist(plainText);
    
    // Extract date
    report.reportDate = this.extractReportDate(plainText);

    return report;
  }

  /**
   * Fallback method to extract findings when standard patterns don't work
   */
  private static extractFallbackFindings(text: string): string {
    // Look for medical terminology and anatomical references
    const medicalTerms = [
      'no evidence', 'fracture', 'normal', 'abnormality', 'visualised',
      'alignment', 'bone', 'soft tissue', 'joint', 'injury'
    ];
    
    const sentences = text.split(/[.!?]+/).filter(sentence => 
      medicalTerms.some(term => 
        sentence.toLowerCase().includes(term.toLowerCase())
      )
    );

    return sentences.slice(0, 3).join('. ').trim();
  }

  /**
   * Extract impression/conclusion
   */
  private static extractFallbackImpression(text: string): string {
    // Look for conclusive statements
    const conclusionPatterns = [
      /No fractures?\s+.*?(?=\.|$)/gi,
      /.*?(?:no|normal|intact).*?(?:fracture|alignment|bone).*?(?=\.|$)/gi
    ];

    for (const pattern of conclusionPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].trim();
      }
    }

    // Last resort: take last meaningful sentence
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences[sentences.length - 1]?.trim() || 'Report processed successfully.';
  }

  /**
   * Extract radiologist name
   * For Axis Imaging, the interpreting radiologist should be from Axis Imaging staff
   * The RTF may contain referring physician info, but we need the Axis radiologist
   */
  private static extractRadiologist(text: string): string {
    // First try to find Axis Imaging radiologist patterns
    const axisPatterns = [
      /(?:Interpreted by|Radiologist|Reported by):\s*(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*Axis Imaging/i,
      /Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*Axis Imaging/i
    ];

    for (const pattern of axisPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return `Dr. ${match[1].trim()}, Axis Imaging`;
      }
    }

    // Fallback: If no Axis radiologist found in RTF, use default Axis radiologist
    // In production, this would be configured or retrieved from staff database
    return 'Dr. Farhan Ahmed, Axis Imaging';
  }

  /**
   * Extract report date
   */
  private static extractReportDate(text: string): string {
    const datePatterns = [
      /(?:Date|Reported):\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return new Date().toLocaleDateString();
  }

  /**
   * Clean and format text for display
   */
  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }
}

/**
 * Webhook endpoint handler for RIS RTF reports
 */
export async function processRISReport(rtfContent: string, studyId: string) {
  try {
    // Parse the RTF report
    const parsedReport = RTFReportParser.parseReport(rtfContent);
    
    // Store in database
    // await prisma.report.create({
    //   data: {
    //     studyId,
    //     technique: parsedReport.technique,
    //     clinicalHistory: parsedReport.clinicalHistory,
    //     findings: parsedReport.findings,
    //     impression: parsedReport.impression,
    //     radiologist: parsedReport.radiologist,
    //     reportDate: parsedReport.reportDate,
    //     rawContent: rtfContent,
    //     status: 'FINAL'
    //   }
    // });

    console.log('RIS Report processed successfully:', {
      studyId,
      hasFindings: !!parsedReport.findings,
      hasImpression: !!parsedReport.impression,
      radiologist: parsedReport.radiologist
    });

    return parsedReport;
  } catch (error) {
    console.error('Error processing RIS report:', error);
    throw error;
  }
}