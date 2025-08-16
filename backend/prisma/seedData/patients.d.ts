import { Gender, UserRole, AustralianState, ContactMethod } from '@prisma/client';
export interface PatientSeedData {
    user: {
        phoneNumber: string;
        email?: string;
        firstName: string;
        lastName: string;
        middleName?: string;
        dateOfBirth: Date;
        gender: Gender;
        medicareNumber?: string;
        medicareExpiryDate?: Date;
        ihiNumber?: string;
        dvaNumber?: string;
        pensionNumber?: string;
        healthcareCardNumber?: string;
        role: UserRole;
        culturalBackground?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        emergencyContactRelationship?: string;
    };
    patient: {
        patientNumber: string;
        mrn?: string;
        streetAddress?: string;
        suburb?: string;
        state?: AustralianState;
        postcode?: string;
        country: string;
        homePhone?: string;
        workPhone?: string;
        preferredContactMethod: ContactMethod;
        allergies?: string[];
        medicalConditions?: string[];
        currentMedications?: string[];
        medicalHistory?: any;
        familyHistory?: string;
        socialHistory?: string;
        privateHealthInsurer?: string;
        privateHealthNumber?: string;
        workersCompClaim?: string;
        nextOfKinName?: string;
        nextOfKinPhone?: string;
        nextOfKinRelationship?: string;
        nextOfKinAddress?: string;
        allowSmsReminders: boolean;
        allowEmailReminders: boolean;
        allowPostalMail: boolean;
        shareWithFamilyGp: boolean;
        allowResearch: boolean;
    };
}
export declare const patientSeedData: PatientSeedData[];
export interface ReferringGPSeedData {
    firstName: string;
    lastName: string;
    title?: string;
    practiceName: string;
    providerNumber: string;
    prescriberId?: string;
    ahpraNumber?: string;
    phoneNumber: string;
    faxNumber?: string;
    email: string;
    streetAddress: string;
    suburb: string;
    state: AustralianState;
    postcode: string;
    specializations?: string[];
    preferredContactMethod: ContactMethod;
}
export declare const referringGPSeedData: ReferringGPSeedData[];
//# sourceMappingURL=patients.d.ts.map