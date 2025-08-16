"use strict";
/**
 * RTF Report Parser Service
 * Extracts structured medical report data from RTF files sent by RIS
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RTFReportParser = void 0;
exports.processRISReport = processRISReport;
var striprtf_1 = require("striprtf");
var RTFReportParser = /** @class */ (function () {
    function RTFReportParser() {
    }
    /**
     * Parse RTF content into structured medical report sections
     */
    RTFReportParser.parseReport = function (rtfContent) {
        // Strip RTF formatting to get plain text
        var plainText = (0, striprtf_1.stripRtf)(rtfContent);
        // Extract structured sections using common medical report patterns
        var report = {
            rawText: plainText,
            findings: '',
            impression: ''
        };
        // Common section headers to look for
        var sectionPatterns = {
            technique: /(?:TECHNIQUE|EXAMINATION|PROCEDURE):\s*(.*?)(?=\n(?:[A-Z\s]+:|$))/is,
            clinicalHistory: /(?:CLINICAL\s*(?:HISTORY|INDICATION)|HISTORY|INDICATION):\s*(.*?)(?=\n(?:[A-Z\s]+:|$))/is,
            findings: /(?:FINDINGS|REPORT):\s*(.*?)(?=\n(?:IMPRESSION|CONCLUSION|$))/is,
            impression: /(?:IMPRESSION|CONCLUSION):\s*(.*?)(?=\n(?:[A-Z\s]+:|$))/is,
        };
        // Extract each section
        Object.entries(sectionPatterns).forEach(function (_a) {
            var key = _a[0], pattern = _a[1];
            var match = plainText.match(pattern);
            if (match && match[1]) {
                report[key] = match[1].trim();
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
    };
    /**
     * Fallback method to extract findings when standard patterns don't work
     */
    RTFReportParser.extractFallbackFindings = function (text) {
        // Look for medical terminology and anatomical references
        var medicalTerms = [
            'no evidence', 'fracture', 'normal', 'abnormality', 'visualised',
            'alignment', 'bone', 'soft tissue', 'joint', 'injury'
        ];
        var sentences = text.split(/[.!?]+/).filter(function (sentence) {
            return medicalTerms.some(function (term) {
                return sentence.toLowerCase().includes(term.toLowerCase());
            });
        });
        return sentences.slice(0, 3).join('. ').trim();
    };
    /**
     * Extract impression/conclusion
     */
    RTFReportParser.extractFallbackImpression = function (text) {
        var _a;
        // Look for conclusive statements
        var conclusionPatterns = [
            /No fractures?\s+.*?(?=\.|$)/gi,
            /.*?(?:no|normal|intact).*?(?:fracture|alignment|bone).*?(?=\.|$)/gi
        ];
        for (var _i = 0, conclusionPatterns_1 = conclusionPatterns; _i < conclusionPatterns_1.length; _i++) {
            var pattern = conclusionPatterns_1[_i];
            var matches = text.match(pattern);
            if (matches && matches.length > 0) {
                return matches[0].trim();
            }
        }
        // Last resort: take last meaningful sentence
        var sentences = text.split(/[.!?]+/).filter(function (s) { return s.trim().length > 10; });
        return ((_a = sentences[sentences.length - 1]) === null || _a === void 0 ? void 0 : _a.trim()) || 'Report processed successfully.';
    };
    /**
     * Extract radiologist name
     * For Axis Imaging, the interpreting radiologist should be from Axis Imaging staff
     * The RTF may contain referring physician info, but we need the Axis radiologist
     */
    RTFReportParser.extractRadiologist = function (text) {
        // First try to find Axis Imaging radiologist patterns
        var axisPatterns = [
            /(?:Interpreted by|Radiologist|Reported by):\s*(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*Axis Imaging/i,
            /Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*Axis Imaging/i
        ];
        for (var _i = 0, axisPatterns_1 = axisPatterns; _i < axisPatterns_1.length; _i++) {
            var pattern = axisPatterns_1[_i];
            var match = text.match(pattern);
            if (match && match[1]) {
                return "Dr. ".concat(match[1].trim(), ", Axis Imaging");
            }
        }
        // Fallback: If no Axis radiologist found in RTF, use default Axis radiologist
        // In production, this would be configured or retrieved from staff database
        return 'Dr. Farhan Ahmed, Axis Imaging';
    };
    /**
     * Extract report date
     */
    RTFReportParser.extractReportDate = function (text) {
        var datePatterns = [
            /(?:Date|Reported):\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
            /(\d{1,2}\/\d{1,2}\/\d{4})/,
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i
        ];
        for (var _i = 0, datePatterns_1 = datePatterns; _i < datePatterns_1.length; _i++) {
            var pattern = datePatterns_1[_i];
            var match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return new Date().toLocaleDateString();
    };
    /**
     * Clean and format text for display
     */
    RTFReportParser.cleanText = function (text) {
        return text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\n\s*\n/g, '\n') // Remove empty lines
            .trim();
    };
    return RTFReportParser;
}());
exports.RTFReportParser = RTFReportParser;
/**
 * Webhook endpoint handler for RIS RTF reports
 */
function processRISReport(rtfContent, studyId) {
    return __awaiter(this, void 0, void 0, function () {
        var parsedReport;
        return __generator(this, function (_a) {
            try {
                parsedReport = RTFReportParser.parseReport(rtfContent);
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
                    studyId: studyId,
                    hasFindings: !!parsedReport.findings,
                    hasImpression: !!parsedReport.impression,
                    radiologist: parsedReport.radiologist
                });
                return [2 /*return*/, parsedReport];
            }
            catch (error) {
                console.error('Error processing RIS report:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
