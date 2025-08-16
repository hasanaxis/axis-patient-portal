"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportTemplates = exports.reportSeedData = void 0;
const client_1 = require("@prisma/client");
exports.reportSeedData = [
    // Report 1: Chest X-Ray for Sarah Mitchell
    {
        accessionNumber: 'ACC20240101001',
        patientNumber: 'AXI001001',
        radiologistEmployeeNumber: 'RAD001',
        clinicalHistory: 'Annual health check, no respiratory symptoms',
        technique: 'PA and lateral chest radiographs were obtained in the radiology department using standard technique.',
        findings: `LUNGS: Both lungs are clear. No focal consolidation, pleural effusion, or pneumothorax is identified. The lung volumes are normal.

HEART: The cardiac silhouette is normal in size and contour. The mediastinal contours are within normal limits.

BONES: No acute bony abnormality is identified. The visualized ribs, clavicles, and spine appear normal.

SOFT TISSUES: The soft tissues are unremarkable.`,
        impression: 'Normal chest radiograph.',
        recommendations: 'No further imaging required at this time.',
        comparison: 'No prior studies available for comparison.',
        limitations: 'None.',
        reportNumber: 'RPT20240101001',
        templateUsed: 'CHEST_XRAY_TEMPLATE',
        priority: client_1.Priority.ROUTINE,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: false,
        dictatedAt: new Date('2024-01-15T10:15:00'),
        transcribedAt: new Date('2024-01-15T10:20:00'),
        verifiedAt: new Date('2024-01-15T10:25:00'),
        approvedAt: new Date('2024-01-15T10:30:00'),
        sentToReferrerAt: new Date('2024-01-15T10:35:00'),
        pdfUrl: '/reports/pdf/RPT20240101001.pdf',
        xmlUrl: '/reports/xml/RPT20240101001.xml',
        wordCount: 85,
        complexityScore: 1.2,
        qaRequired: false,
    },
    // Report 2: Lumbar Spine MRI for James Thompson
    {
        accessionNumber: 'ACC20240102001',
        patientNumber: 'AXI001002',
        radiologistEmployeeNumber: 'RAD002',
        clinicalHistory: 'Chronic lower back pain, previous L4-L5 surgery, ongoing symptoms',
        technique: 'MRI of the lumbar spine was performed on a 3.0 Tesla magnet. Sagittal T1-weighted, T2-weighted, and STIR sequences were obtained. Axial T2-weighted images were acquired through the L3-S1 levels.',
        findings: `VERTEBRAL BODIES: Normal vertebral body height and signal intensity. No compression fractures or infiltrative lesions.

ALIGNMENT: Normal lumbar lordosis. No spondylolisthesis.

INTERVERTEBRAL DISCS:
L1-L2: Normal disc height and signal intensity.
L2-L3: Normal disc height and signal intensity.
L3-L4: Mild disc desiccation with small posterior disc bulge. No significant spinal canal or foraminal stenosis.
L4-L5: Post-surgical changes consistent with prior discectomy. Moderate loss of disc height with posterior annular scarring. Mild central spinal canal narrowing. Bilateral moderate foraminal stenosis.
L5-S1: Mild disc desiccation with small central disc protrusion. Mild central spinal canal narrowing.

SPINAL CANAL: Moderate central spinal canal narrowing at L4-L5 level. Otherwise normal caliber.

NEURAL FORAMINA: Bilateral moderate foraminal stenosis at L4-L5. Otherwise patent.

FACET JOINTS: Mild degenerative changes at L4-L5 and L5-S1 levels.

PARASPINAL SOFT TISSUES: Post-surgical scarring in the posterior paraspinal muscles at L4-L5 level. Otherwise unremarkable.`,
        impression: `1. Post-surgical changes at L4-L5 level consistent with prior discectomy.
2. Moderate central spinal canal narrowing and bilateral foraminal stenosis at L4-L5.
3. Mild degenerative disc disease at L3-L4 and L5-S1 levels.
4. Findings correlate with patient's ongoing back pain symptoms.`,
        recommendations: 'Consider neurosurgical consultation for evaluation of recurrent stenosis at the L4-L5 level. Physical therapy and pain management may be beneficial.',
        comparison: 'Comparison with post-operative imaging from 2020 shows interval development of moderate stenosis at the surgical site.',
        limitations: 'Patient motion artifact minimally limits evaluation of fine detail.',
        reportNumber: 'RPT20240102001',
        templateUsed: 'LUMBAR_SPINE_MRI_TEMPLATE',
        priority: client_1.Priority.ROUTINE,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: false,
        dictatedAt: new Date('2024-01-16T15:30:00'),
        transcribedAt: new Date('2024-01-16T15:45:00'),
        verifiedAt: new Date('2024-01-16T16:00:00'),
        approvedAt: new Date('2024-01-16T16:15:00'),
        sentToReferrerAt: new Date('2024-01-16T16:20:00'),
        pdfUrl: '/reports/pdf/RPT20240102001.pdf',
        xmlUrl: '/reports/xml/RPT20240102001.xml',
        wordCount: 285,
        complexityScore: 3.8,
        qaRequired: true,
        qaCompletedAt: new Date('2024-01-16T16:10:00'),
        qaCompletedBy: 'QA_RADIOLOGIST_001',
    },
    // Report 3: CT Abdomen Pelvis for Robert Wilson
    {
        accessionNumber: 'ACC20240103001',
        patientNumber: 'AXI001004',
        radiologistEmployeeNumber: 'RAD003',
        clinicalHistory: 'Atrial fibrillation, checking for any abdominal pathology',
        technique: 'CT of the abdomen and pelvis was performed before and after the administration of intravenous contrast material. Oral contrast was also administered. Axial images were obtained with coronal and sagittal reformats.',
        findings: `LIVER: Normal size, contour, and attenuation. No focal lesions. Portal and hepatic veins are patent.

GALLBLADDER: Normal distention and wall thickness. No cholelithiasis.

PANCREAS: Normal size and attenuation. Main pancreatic duct is not dilated.

SPLEEN: Normal size and attenuation. No focal lesions.

KIDNEYS: Both kidneys are normal in size and attenuation. No hydronephrosis or nephrolithiasis. Multiple small bilateral cortical cysts, largest measuring 8mm on the right.

ADRENALS: Normal bilaterally.

BOWEL: Normal enhancement and wall thickness of the visualized bowel loops. No obstruction or inflammatory changes.

PELVIS: Bladder is normally distended. Prostate is mildly enlarged consistent with benign prostatic hyperplasia.

LYMPH NODES: No pathologically enlarged lymph nodes.

VESSELS: Aorta and IVC are normal in caliber. No aneurysm or dissection.

BONES: Mild degenerative changes in the lumbar spine. No aggressive osseous lesions.`,
        impression: `1. Normal CT abdomen and pelvis.
2. Multiple small bilateral renal cysts.
3. Mild benign prostatic enlargement.
4. Mild lumbar spine degenerative changes.`,
        recommendations: 'No follow-up imaging required for the incidental renal cysts. Continue routine care with primary physician.',
        comparison: 'No prior cross-sectional imaging available for comparison.',
        limitations: 'None.',
        reportNumber: 'RPT20240103001',
        templateUsed: 'CT_ABDOMEN_PELVIS_TEMPLATE',
        priority: client_1.Priority.ROUTINE,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: false,
        dictatedAt: new Date('2024-01-17T12:30:00'),
        transcribedAt: new Date('2024-01-17T12:45:00'),
        verifiedAt: new Date('2024-01-17T13:00:00'),
        approvedAt: new Date('2024-01-17T13:15:00'),
        sentToReferrerAt: new Date('2024-01-17T13:20:00'),
        pdfUrl: '/reports/pdf/RPT20240103001.pdf',
        xmlUrl: '/reports/xml/RPT20240103001.xml',
        wordCount: 235,
        complexityScore: 2.8,
        qaRequired: false,
    },
    // Report 4: Breast Ultrasound for Jennifer Brown
    {
        accessionNumber: 'ACC20240104001',
        patientNumber: 'AXI001005',
        radiologistEmployeeNumber: 'RAD004',
        clinicalHistory: 'Family history of breast cancer, routine screening',
        technique: 'Bilateral breast ultrasound was performed using a high-frequency linear transducer. Both breasts were systematically evaluated in the radial and anti-radial planes.',
        findings: `RIGHT BREAST: Normal echogenic breast tissue. No focal masses, cysts, or areas of architectural distortion. Normal vascularity on color Doppler imaging.

LEFT BREAST: Normal echogenic breast tissue. No focal masses, cysts, or areas of architectural distortion. Normal vascularity on color Doppler imaging.

LYMPH NODES: Normal-appearing bilateral axillary lymph nodes with preserved fatty hila.`,
        impression: 'BI-RADS Category 1: Negative bilateral breast ultrasound.',
        recommendations: 'Continue routine breast screening as per guidelines. Next mammogram due in 2 years (age-appropriate screening).',
        comparison: 'No prior breast imaging available for comparison.',
        limitations: 'Ultrasound is complementary to mammography and should not replace mammographic screening.',
        reportNumber: 'RPT20240104001',
        templateUsed: 'BREAST_ULTRASOUND_TEMPLATE',
        priority: client_1.Priority.ROUTINE,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: false,
        dictatedAt: new Date('2024-01-18T16:15:00'),
        transcribedAt: new Date('2024-01-18T16:25:00'),
        verifiedAt: new Date('2024-01-18T16:35:00'),
        approvedAt: new Date('2024-01-18T16:40:00'),
        sentToReferrerAt: new Date('2024-01-18T16:45:00'),
        pdfUrl: '/reports/pdf/RPT20240104001.pdf',
        xmlUrl: '/reports/xml/RPT20240104001.xml',
        wordCount: 125,
        complexityScore: 1.8,
        qaRequired: false,
    },
    // Report 5: Knee X-Ray for Lisa Anderson (URGENT)
    {
        accessionNumber: 'ACC20240105001',
        patientNumber: 'AXI001007',
        radiologistEmployeeNumber: 'RAD001',
        clinicalHistory: 'Left knee pain after fall, rule out fracture',
        technique: 'AP and lateral radiographs of the left knee were obtained.',
        findings: `BONES: No acute fracture is identified. The femur, tibia, and fibula appear intact. No dislocation.

JOINT SPACES: The tibiofemoral and patellofemoral joint spaces are preserved.

SOFT TISSUES: Mild soft tissue swelling about the knee. No joint effusion is definitively identified on this radiographic examination.

ALIGNMENT: Normal alignment of the bones about the knee joint.`,
        impression: 'No acute fracture or dislocation of the left knee. Mild soft tissue swelling.',
        recommendations: 'Clinical correlation recommended. If there is concern for internal derangement or if symptoms persist, MRI may be considered.',
        comparison: 'No prior imaging of the left knee available for comparison.',
        limitations: 'Radiographs have limited sensitivity for soft tissue injuries including ligament and meniscal tears.',
        reportNumber: 'RPT20240105001',
        templateUsed: 'KNEE_XRAY_TEMPLATE',
        priority: client_1.Priority.URGENT,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: false,
        dictatedAt: new Date('2024-01-19T10:45:00'),
        transcribedAt: new Date('2024-01-19T10:50:00'),
        verifiedAt: new Date('2024-01-19T10:55:00'),
        approvedAt: new Date('2024-01-19T11:00:00'),
        sentToReferrerAt: new Date('2024-01-19T11:05:00'),
        pdfUrl: '/reports/pdf/RPT20240105001.pdf',
        xmlUrl: '/reports/xml/RPT20240105001.xml',
        wordCount: 115,
        complexityScore: 1.5,
        qaRequired: false,
    },
    // Report 6: Head CT for William Davis (EMERGENCY - CRITICAL)
    {
        accessionNumber: 'ACC20240106001',
        patientNumber: 'AXI001006',
        radiologistEmployeeNumber: 'RAD005',
        clinicalHistory: 'Fall at home, confusion, rule out intracranial bleed',
        technique: 'Non-contrast CT of the head was performed with axial images obtained from the skull base to the vertex.',
        findings: `BRAIN PARENCHYMA: Small acute intraparenchymal hemorrhage in the right frontal lobe measuring approximately 1.5 cm in maximum diameter. No significant mass effect or midline shift. No evidence of herniation.

VENTRICULAR SYSTEM: The ventricular system is normal in size and configuration. No hydrocephalus.

SUBARACHNOID SPACE: No subarachnoid hemorrhage identified.

SKULL: No acute skull fracture.

SOFT TISSUES: Mild soft tissue swelling of the right temporal scalp, likely related to trauma.`,
        impression: `ACUTE RIGHT FRONTAL INTRAPARENCHYMAL HEMORRHAGE measuring 1.5 cm. No significant mass effect.

***CRITICAL RESULT NOTIFICATION***
This report was called to Dr. Emergency Physician at 02:45 AM on 20/01/2024.`,
        recommendations: 'URGENT neurosurgical consultation recommended. Serial neurological assessments and repeat CT in 6-12 hours to assess for expansion of hemorrhage. Blood pressure control as clinically appropriate.',
        comparison: 'No prior head imaging available for comparison.',
        limitations: 'None.',
        reportNumber: 'RPT20240106001',
        templateUsed: 'HEAD_CT_EMERGENCY_TEMPLATE',
        priority: client_1.Priority.EMERGENCY,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: true,
        criticalFinding: 'Acute right frontal intraparenchymal hemorrhage measuring 1.5 cm',
        criticalNotifiedAt: new Date('2024-01-20T02:45:00'),
        criticalNotifiedBy: 'Dr. Sarah Mitchell',
        criticalNotifiedTo: 'Dr. Emergency Physician - Emergency Department',
        dictatedAt: new Date('2024-01-20T02:35:00'),
        transcribedAt: new Date('2024-01-20T02:38:00'),
        verifiedAt: new Date('2024-01-20T02:42:00'),
        approvedAt: new Date('2024-01-20T02:44:00'),
        sentToReferrerAt: new Date('2024-01-20T02:46:00'),
        pdfUrl: '/reports/pdf/RPT20240106001.pdf',
        xmlUrl: '/reports/xml/RPT20240106001.xml',
        wordCount: 185,
        complexityScore: 4.5,
        qaRequired: true,
        qaCompletedAt: new Date('2024-01-20T02:43:00'),
        qaCompletedBy: 'QA_RADIOLOGIST_002',
    },
    // Report 7: Mammography for Maria Rodriguez
    {
        accessionNumber: 'ACC20240107001',
        patientNumber: 'AXI001003',
        radiologistEmployeeNumber: 'RAD004',
        clinicalHistory: 'No current breast symptoms, family history of breast cancer',
        technique: 'Digital screening mammography was performed with standard craniocaudal (CC) and mediolateral oblique (MLO) projections of both breasts.',
        findings: `BREAST COMPOSITION: The breasts are composed of scattered areas of fibroglandular density (ACR Category B).

RIGHT BREAST: No masses, architectural distortions, or suspicious microcalcifications are identified.

LEFT BREAST: No masses, architectural distortions, or suspicious microcalcifications are identified.

LYMPH NODES: No abnormally enlarged axillary lymph nodes are identified.

COMPARISON: No prior mammograms available for comparison.`,
        impression: 'BI-RADS Category 1: Negative bilateral screening mammography.',
        recommendations: 'Continue annual screening mammography. Given family history of breast cancer, consider discussing genetic counseling and risk assessment with primary care physician.',
        comparison: 'No prior mammographic examinations available for comparison.',
        limitations: 'Mammographic sensitivity may be reduced in dense breast tissue.',
        reportNumber: 'RPT20240107001',
        templateUsed: 'SCREENING_MAMMOGRAPHY_TEMPLATE',
        priority: client_1.Priority.ROUTINE,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: false,
        dictatedAt: new Date('2024-01-21T14:15:00'),
        transcribedAt: new Date('2024-01-21T14:25:00'),
        verifiedAt: new Date('2024-01-21T14:35:00'),
        approvedAt: new Date('2024-01-21T14:40:00'),
        sentToReferrerAt: new Date('2024-01-21T14:45:00'),
        pdfUrl: '/reports/pdf/RPT20240107001.pdf',
        xmlUrl: '/reports/xml/RPT20240107001.xml',
        wordCount: 145,
        complexityScore: 2.1,
        qaRequired: false,
    },
    // Report 8: Abdominal Ultrasound for Antonio Giuseppe
    {
        accessionNumber: 'ACC20240108001',
        patientNumber: 'AXI001008',
        radiologistEmployeeNumber: 'RAD003',
        clinicalHistory: 'Type 2 diabetes, peripheral vascular disease, check for complications',
        technique: 'Real-time ultrasound examination of the abdomen was performed using curved and linear array transducers. Gray-scale and color Doppler imaging were utilized.',
        findings: `LIVER: The liver is normal in size with a smooth contour. Echogenicity is mildly increased consistent with mild hepatic steatosis (fatty infiltration). No focal lesions identified. Portal vein is patent with normal flow direction.

GALLBLADDER: Normal wall thickness. No cholelithiasis or cholecystic changes.

PANCREAS: The visualized portions of the pancreas appear normal. No focal abnormalities or ductal dilatation.

RIGHT KIDNEY: Normal size and echogenicity. No hydronephrosis or nephrolithiasis. Cortical thickness is normal.

LEFT KIDNEY: Normal size and echogenicity. No hydronephrosis or nephrolithiasis. Cortical thickness is normal.

SPLEEN: Normal size and echogenicity.

AORTA: Normal caliber. No aneurysmal dilatation.

BLADDER: Normal wall thickness when adequately distended.`,
        impression: `1. Mild hepatic steatosis (fatty liver).
2. Otherwise normal abdominal ultrasound examination.
3. No evidence of diabetic nephropathy on ultrasound.`,
        recommendations: 'Fatty liver changes are often associated with diabetes and metabolic syndrome. Continue diabetes management with primary care physician. Lifestyle modifications including diet and exercise may help reduce hepatic steatosis.',
        comparison: 'No prior abdominal imaging available for comparison.',
        limitations: 'Bowel gas partially limits visualization of some retroperitoneal structures.',
        reportNumber: 'RPT20240108001',
        templateUsed: 'ABDOMINAL_ULTRASOUND_TEMPLATE',
        priority: client_1.Priority.ROUTINE,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: false,
        dictatedAt: new Date('2024-01-22T13:00:00'),
        transcribedAt: new Date('2024-01-22T13:15:00'),
        verifiedAt: new Date('2024-01-22T13:30:00'),
        approvedAt: new Date('2024-01-22T13:35:00'),
        sentToReferrerAt: new Date('2024-01-22T13:40:00'),
        pdfUrl: '/reports/pdf/RPT20240108001.pdf',
        xmlUrl: '/reports/xml/RPT20240108001.xml',
        wordCount: 225,
        complexityScore: 2.6,
        qaRequired: false,
    },
    // Additional reports for other studies
    {
        accessionNumber: 'ACC20240109001',
        patientNumber: 'AXI001009',
        radiologistEmployeeNumber: 'RAD002',
        clinicalHistory: 'Headaches, rule out mass lesion',
        technique: 'MRI of the brain was performed with and without gadolinium contrast on a 3.0 Tesla scanner.',
        findings: `BRAIN PARENCHYMA: No focal abnormality. Normal gray and white matter differentiation. No evidence of mass lesion, hemorrhage, or infarction.

VENTRICULAR SYSTEM: Normal size and configuration.

EXTRA-AXIAL SPACES: No extra-axial collections.

VASCULAR STRUCTURES: Normal flow voids in the major intracranial arteries and venous structures.

ENHANCEMENT: No abnormal enhancement following contrast administration.

SELLA/PITUITARY: Normal appearance.

ORBITS: Normal bilateral globe and optic nerve appearance.

PARANASAL SINUSES: Clear.`,
        impression: 'Normal MRI brain with and without contrast.',
        recommendations: 'No evidence of structural cause for headaches. Clinical correlation and consideration of non-structural causes recommended.',
        reportNumber: 'RPT20240109001',
        priority: client_1.Priority.ROUTINE,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: false,
        wordCount: 125,
        complexityScore: 2.3,
        qaRequired: false,
    },
    {
        accessionNumber: 'ACC20240110001',
        patientNumber: 'AXI001010',
        radiologistEmployeeNumber: 'RAD006', // Nuclear medicine specialist
        clinicalHistory: 'Staging study',
        technique: 'Whole body FDG PET-CT was performed following administration of 18F-FDG. Images were acquired from skull vertex to mid-thigh.',
        findings: `FDG UPTAKE: Physiologic FDG uptake is seen in the brain, myocardium, liver, spleen, kidneys, and bladder. Some uptake noted in brown fat deposits.

LYMPH NODES: No pathologically enlarged or hypermetabolic lymph nodes identified.

ORGANS: No focal hypermetabolic lesions in the chest, abdomen, or pelvis.

BONES: No osseous metastatic disease.

CT COMPONENT: No significant abnormalities on the low-dose CT component.`,
        impression: 'No evidence of hypermetabolic disease. Study is within normal limits.',
        recommendations: 'Results to be correlated with clinical findings and other imaging studies.',
        reportNumber: 'RPT20240110001',
        priority: client_1.Priority.URGENT,
        status: client_1.ReportStatus.PRELIMINARY,
        isAmended: false,
        isCritical: false,
        wordCount: 95,
        complexityScore: 3.2,
        qaRequired: true,
    },
    {
        accessionNumber: 'ACC20240111001',
        patientNumber: 'AXI001011',
        radiologistEmployeeNumber: 'RAD001',
        clinicalHistory: 'Shortness of breath, rule out pulmonary embolism',
        technique: 'CT pulmonary angiogram was performed following administration of intravenous contrast material.',
        findings: `PULMONARY ARTERIES: No filling defects to suggest pulmonary embolism. Main, left, and right pulmonary arteries are patent. Segmental and subsegmental vessels are well opacified without filling defects.

LUNGS: Clear lungs bilaterally. No consolidation, nodules, or masses.

HEART: Normal cardiac size and contour.

PLEURA: No pleural effusion or pneumothorax.

BONES: No acute abnormalities.`,
        impression: 'Negative CT pulmonary angiogram. No evidence of pulmonary embolism.',
        recommendations: 'Consider other causes of shortness of breath. Clinical correlation recommended.',
        reportNumber: 'RPT20240111001',
        priority: client_1.Priority.URGENT,
        status: client_1.ReportStatus.FINAL,
        isAmended: false,
        isCritical: false,
        dictatedAt: new Date('2024-01-25T16:45:00'),
        verifiedAt: new Date('2024-01-25T17:00:00'),
        approvedAt: new Date('2024-01-25T17:05:00'),
        wordCount: 115,
        complexityScore: 2.1,
        qaRequired: false,
    }
];
// Report templates for common examinations
exports.reportTemplates = {
    CHEST_XRAY_TEMPLATE: {
        name: 'Chest X-Ray Template',
        sections: ['LUNGS', 'HEART', 'BONES', 'SOFT TISSUES'],
        defaultText: {
            technique: 'PA and lateral chest radiographs were obtained in the radiology department using standard technique.',
            normal_findings: 'Both lungs are clear. The cardiac silhouette is normal in size and contour. No acute bony abnormality is identified.',
            normal_impression: 'Normal chest radiograph.'
        }
    },
    LUMBAR_SPINE_MRI_TEMPLATE: {
        name: 'Lumbar Spine MRI Template',
        sections: ['VERTEBRAL BODIES', 'ALIGNMENT', 'INTERVERTEBRAL DISCS', 'SPINAL CANAL', 'NEURAL FORAMINA', 'FACET JOINTS', 'PARASPINAL SOFT TISSUES'],
        defaultText: {
            technique: 'MRI of the lumbar spine was performed on a 3.0 Tesla magnet. Multiple sequences were obtained including T1, T2, and STIR in sagittal and axial planes.'
        }
    },
    CT_ABDOMEN_PELVIS_TEMPLATE: {
        name: 'CT Abdomen Pelvis Template',
        sections: ['LIVER', 'GALLBLADDER', 'PANCREAS', 'SPLEEN', 'KIDNEYS', 'ADRENALS', 'BOWEL', 'PELVIS', 'LYMPH NODES', 'VESSELS', 'BONES'],
        defaultText: {
            technique: 'CT of the abdomen and pelvis was performed before and after the administration of intravenous contrast material.'
        }
    },
    BREAST_ULTRASOUND_TEMPLATE: {
        name: 'Breast Ultrasound Template',
        sections: ['RIGHT BREAST', 'LEFT BREAST', 'LYMPH NODES'],
        defaultText: {
            technique: 'Bilateral breast ultrasound was performed using a high-frequency linear transducer.',
            birads_categories: {
                1: 'BI-RADS Category 1: Negative',
                2: 'BI-RADS Category 2: Benign',
                3: 'BI-RADS Category 3: Probably benign',
                4: 'BI-RADS Category 4: Suspicious abnormality',
                5: 'BI-RADS Category 5: Highly suggestive of malignancy'
            }
        }
    }
};
//# sourceMappingURL=reports.js.map