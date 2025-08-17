# 🏥 Modality Integration Architecture - Axis Imaging Patient Portal

## **How Modalities Send Images to the Patient Portal**

### **📡 DICOM Image Flow from Modalities**

```
X-ray/CT/Ultrasound Modality → DICOM C-STORE → Patient Portal → Database + File Storage
```

---

## 🔌 **DIRECT MODALITY INTEGRATION**

### **Method 1: DICOM C-STORE (Primary)**
**Modalities send DICOM images directly to the patient portal**

**Configuration on Modality:**
- **Destination IP**: [Patient Portal Server IP]
- **Port**: 104 (DICOM standard) or custom port
- **AE Title**: AXIS_PORTAL
- **Protocol**: DICOM C-STORE over TCP/IP

**Endpoint**: `POST /api/modality/dicom`

### **Method 2: HTTP/HTTPS Upload (Alternative)**
**For modalities that don't support DICOM C-STORE**

**Configuration:**
- **Webhook URL**: `https://yageczmzfuuhlklctojc.supabase.co/functions/v1/api/modality/dicom`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Authentication**: API key or certificate

---

## 🔍 **PATIENT MATCHING ARCHITECTURE**

### **Primary Key: ACCESSION NUMBER**
**YES - Accession Number is the primary linking mechanism between RIS, PACS, and Patient Portal**

```
Voyager RIS → Generates Accession Number → Used across all systems
```

### **Patient Identification Hierarchy:**
1. **Accession Number** (Primary) - Links studies across systems
2. **Patient ID** (Secondary) - Internal RIS identifier  
3. **Study Instance UID** (DICOM) - Unique DICOM identifier

---

## 📋 **COMPLETE INTEGRATION WORKFLOW**

### **Step 1: Patient Scheduled in RIS**
```
Voyager RIS → ORM^O01 HL7 Message → Patient Portal
```
**Creates:**
- Patient record with demographics
- Study record with **ACCESSION NUMBER**
- Links patient phone number for SMS

### **Step 2: Scan Performed - Images Sent**
```
X-ray/CT/Ultrasound → DICOM C-STORE → Patient Portal
```
**DICOM Headers Used for Matching:**
- `(0008,0050)` - **Accession Number** ⭐ **PRIMARY MATCHING KEY**
- `(0010,0020)` - Patient ID
- `(0020,000D)` - Study Instance UID
- `(0010,0010)` - Patient Name
- `(0008,0060)` - Modality (XR, CT, US, etc.)

### **Step 3: Report Completed**
```
Voyager RIS → ORU^R01 HL7 Message → Patient Portal → SMS Sent
```
**Uses Accession Number to:**
- Find existing study
- Update with report data
- Trigger SMS notification

---

## 🗄️ **DATABASE SCHEMA LINKING**

### **Key Tables and Relationships:**
```sql
patients
├── id (Primary Key)
├── external_id (From RIS)
└── phone_number (For SMS)

studies  
├── id (Primary Key)
├── patient_id (Foreign Key → patients.id)
├── accession_number ⭐ (UNIQUE - Links RIS/PACS/Portal)
├── external_id (Study ID from RIS)
└── study_instance_uid (DICOM UID)

series
├── id (Primary Key)
├── study_id (Foreign Key → studies.id)
└── series_instance_uid (DICOM UID)

images
├── id (Primary Key)  
├── series_id (Foreign Key → series.id)
├── sop_instance_uid (DICOM UID)
├── image_url (File storage path)
└── thumbnail_url (Thumbnail path)
```

---

## 🔄 **PATIENT MATCHING LOGIC**

### **When DICOM Image Arrives:**
```javascript
// 1. Extract accession number from DICOM header
const accessionNumber = dicomMetadata.accessionNumber;

// 2. Find existing study
const study = await database.study.findUnique({
  where: { accession_number: accessionNumber },
  include: { patient: true }
});

// 3. If study exists, link image to study
if (study) {
  // Link to existing patient/study
  await linkImageToStudy(dicomImage, study.id);
} else {
  // Create new patient/study from DICOM metadata
  const newStudy = await createStudyFromDICOM(dicomMetadata);
  await linkImageToStudy(dicomImage, newStudy.id);
}
```

### **Fallback Matching (if no accession number):**
1. **Patient ID + Study Date**
2. **Patient Name + DOB + Modality**
3. **Study Instance UID** (create new study)

---

## 📱 **NOTIFICATION WORKFLOW**

### **Complete Patient Journey:**
```
1. RIS Creates Order (ORM^O01) 
   → Patient + Study created with Accession Number

2. Modality Sends Images (DICOM C-STORE)
   → Images linked to Study via Accession Number
   
3. Report Finalized (ORU^R01)
   → Study updated + SMS sent via Accession Number lookup
```

### **SMS Notification Logic:**
```javascript
// When ORU^R01 received
const accessionNumber = hl7Message.OBR.accessionNumber;
const study = await findStudyByAccession(accessionNumber);
const patient = study.patient;

// Send SMS to patient.phone_number
await sendSMS(patient.phone_number, 
  `Your ${study.modality} results are ready! View: ${portalURL}?ref=${accessionNumber}`);
```

---

## 🛠️ **PRODUCTION SETUP REQUIREMENTS**

### **Modality Configuration:**
Each X-ray, CT, Ultrasound machine needs:
- **DICOM Destination**: Patient Portal Server IP
- **Port**: 104 or custom DICOM port
- **AE Title**: AXIS_PORTAL
- **Transfer Syntax**: Explicit VR Little Endian

### **Network Requirements:**
- **Firewall Rules**: Allow DICOM port (104) from modality subnet
- **VPN/Secure Network**: Ensure encrypted transmission
- **Bandwidth**: Adequate for DICOM file sizes (1-100MB per image)

### **Storage Requirements:**
- **File Storage**: Azure Blob Storage or AWS S3
- **Database**: PostgreSQL with DICOM metadata indexing
- **Backup**: Automated backups of images and database

---

## 🔧 **IMPLEMENTATION STATUS**

### **✅ COMPLETED:**
- [x] DICOM C-STORE listener endpoint
- [x] Accession number matching logic  
- [x] Patient/Study/Series/Image database schema
- [x] File storage for DICOM images
- [x] Thumbnail generation
- [x] HL7 integration for patient data
- [x] SMS notification system

### **🔄 PRODUCTION SETUP NEEDED:**
- [ ] Configure modality DICOM destinations
- [ ] Set up production DICOM port (104)
- [ ] Test end-to-end with real modalities
- [ ] Configure Voyager RIS HL7 destinations
- [ ] Set up production file storage
- [ ] Configure SMS service credentials

---

## 🎯 **ANSWER TO YOUR QUESTION:**

### **How Modalities Send Images:**
1. **DICOM C-STORE** - Direct DICOM protocol (preferred)
2. **HTTP Upload** - Webhook for non-DICOM systems

### **Patient Matching:**
- **PRIMARY**: **Accession Number** links RIS → PACS → Portal
- **SECONDARY**: Patient ID, Study Instance UID
- **FALLBACK**: Patient demographics matching

### **Accession Number Usage:**
- ✅ **YES** - Accession Number is the universal key
- ✅ Links patient data across RIS, PACS, and Portal  
- ✅ Used for SMS notifications and patient access
- ✅ Ensures data consistency across all systems

**The architecture is designed for seamless integration using industry-standard DICOM and HL7 protocols with accession numbers as the primary linking mechanism.** 🏥✨