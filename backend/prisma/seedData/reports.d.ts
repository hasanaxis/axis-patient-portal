import { ReportStatus, Priority } from '@prisma/client';
export interface ReportSeedData {
    accessionNumber: string;
    patientNumber: string;
    radiologistEmployeeNumber?: string;
    clinicalHistory?: string;
    technique?: string;
    findings: string;
    impression: string;
    recommendations?: string;
    comparison?: string;
    limitations?: string;
    reportNumber: string;
    templateUsed?: string;
    priority: Priority;
    status: ReportStatus;
    isAmended: boolean;
    amendmentReason?: string;
    isCritical: boolean;
    criticalFinding?: string;
    criticalNotifiedAt?: Date;
    criticalNotifiedBy?: string;
    criticalNotifiedTo?: string;
    dictatedAt?: Date;
    transcribedAt?: Date;
    verifiedAt?: Date;
    approvedAt?: Date;
    sentToReferrerAt?: Date;
    pdfUrl?: string;
    xmlUrl?: string;
    wordCount?: number;
    complexityScore?: number;
    qaRequired: boolean;
    qaCompletedAt?: Date;
    qaCompletedBy?: string;
}
export declare const reportSeedData: ReportSeedData[];
export declare const reportTemplates: {
    CHEST_XRAY_TEMPLATE: {
        name: string;
        sections: string[];
        defaultText: {
            technique: string;
            normal_findings: string;
            normal_impression: string;
        };
    };
    LUMBAR_SPINE_MRI_TEMPLATE: {
        name: string;
        sections: string[];
        defaultText: {
            technique: string;
        };
    };
    CT_ABDOMEN_PELVIS_TEMPLATE: {
        name: string;
        sections: string[];
        defaultText: {
            technique: string;
        };
    };
    BREAST_ULTRASOUND_TEMPLATE: {
        name: string;
        sections: string[];
        defaultText: {
            technique: string;
            birads_categories: {
                1: string;
                2: string;
                3: string;
                4: string;
                5: string;
            };
        };
    };
};
//# sourceMappingURL=reports.d.ts.map