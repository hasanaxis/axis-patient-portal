"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareStatus = exports.ReportStatus = exports.StudyViewStatus = exports.StudyStatus = exports.Priority = exports.Modality = exports.ScanType = exports.AppointmentStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["PATIENT"] = "PATIENT";
    UserRole["RADIOLOGIST"] = "RADIOLOGIST";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["REFERRING_GP"] = "REFERRING_GP";
    UserRole["TECHNOLOGIST"] = "TECHNOLOGIST";
    UserRole["CLERK"] = "CLERK";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
    AppointmentStatus["RESCHEDULED"] = "RESCHEDULED";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
var ScanType;
(function (ScanType) {
    ScanType["XRAY"] = "XRAY";
    ScanType["CT"] = "CT";
    ScanType["MRI"] = "MRI";
    ScanType["ULTRASOUND"] = "ULTRASOUND";
    ScanType["DEXA"] = "DEXA";
    ScanType["MAMMOGRAPHY"] = "MAMMOGRAPHY";
    ScanType["FLUOROSCOPY"] = "FLUOROSCOPY";
    ScanType["NUCLEAR_MEDICINE"] = "NUCLEAR_MEDICINE";
    ScanType["PET_CT"] = "PET_CT";
    ScanType["ANGIOGRAPHY"] = "ANGIOGRAPHY";
    ScanType["CARDIAC_CT"] = "CARDIAC_CT";
    ScanType["CARDIAC_MRI"] = "CARDIAC_MRI";
})(ScanType || (exports.ScanType = ScanType = {}));
var Modality;
(function (Modality) {
    Modality["CR"] = "CR";
    Modality["CT"] = "CT";
    Modality["DX"] = "DX";
    Modality["MG"] = "MG";
    Modality["MR"] = "MR";
    Modality["NM"] = "NM";
    Modality["PT"] = "PT";
    Modality["RF"] = "RF";
    Modality["SC"] = "SC";
    Modality["US"] = "US";
    Modality["XA"] = "XA";
    Modality["XR"] = "XR";
})(Modality || (exports.Modality = Modality = {}));
var Priority;
(function (Priority) {
    Priority["ROUTINE"] = "ROUTINE";
    Priority["URGENT"] = "URGENT";
    Priority["STAT"] = "STAT";
    Priority["EMERGENCY"] = "EMERGENCY";
})(Priority || (exports.Priority = Priority = {}));
var StudyStatus;
(function (StudyStatus) {
    StudyStatus["SCHEDULED"] = "SCHEDULED";
    StudyStatus["ARRIVED"] = "ARRIVED";
    StudyStatus["IN_PROGRESS"] = "IN_PROGRESS";
    StudyStatus["COMPLETED"] = "COMPLETED";
    StudyStatus["PRELIMINARY"] = "PRELIMINARY";
    StudyStatus["FINAL"] = "FINAL";
    StudyStatus["CANCELLED"] = "CANCELLED";
    StudyStatus["ARCHIVED"] = "ARCHIVED";
})(StudyStatus || (exports.StudyStatus = StudyStatus = {}));
var StudyViewStatus;
(function (StudyViewStatus) {
    StudyViewStatus["NEW"] = "NEW";
    StudyViewStatus["VIEWED"] = "VIEWED";
    StudyViewStatus["REVIEWED"] = "REVIEWED";
})(StudyViewStatus || (exports.StudyViewStatus = StudyViewStatus = {}));
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["PENDING"] = "PENDING";
    ReportStatus["DRAFT"] = "DRAFT";
    ReportStatus["IN_REVIEW"] = "IN_REVIEW";
    ReportStatus["PRELIMINARY"] = "PRELIMINARY";
    ReportStatus["FINAL"] = "FINAL";
    ReportStatus["ADDENDUM"] = "ADDENDUM";
    ReportStatus["CORRECTED"] = "CORRECTED";
    ReportStatus["SENT"] = "SENT";
    ReportStatus["ARCHIVED"] = "ARCHIVED";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
var ShareStatus;
(function (ShareStatus) {
    ShareStatus["NOT_SHARED"] = "NOT_SHARED";
    ShareStatus["SHARED_WITH_GP"] = "SHARED_WITH_GP";
    ShareStatus["SHARED_WITH_PATIENT"] = "SHARED_WITH_PATIENT";
    ShareStatus["SHARED_WITH_SPECIALIST"] = "SHARED_WITH_SPECIALIST";
})(ShareStatus || (exports.ShareStatus = ShareStatus = {}));
//# sourceMappingURL=types.js.map