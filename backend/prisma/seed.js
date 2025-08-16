"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const patients_1 = require("./seedData/patients");
const studies_1 = require("./seedData/studies");
const reports_1 = require("./seedData/reports");
const appointments_1 = require("./seedData/appointments");
const prisma = new client_1.PrismaClient();
// Seed data for radiologists and technologists
const radiologistSeedData = [
    {
        user: {
            phoneNumber: '+61387650001',
            email: 'amanda.richards@axisimaging.com.au',
            firstName: 'Amanda',
            lastName: 'Richards',
            dateOfBirth: new Date('1975-08-14'),
            gender: client_1.Gender.FEMALE,
            role: client_1.UserRole.RADIOLOGIST,
            isVerified: true,
            isActive: true,
        },
        employeeNumber: 'RAD001',
        licenseNumber: 'MED0001234500',
        specializations: ['Diagnostic Radiology', 'Chest Imaging'],
        qualifications: ['MBBS', 'FRANZCR', 'DDR'],
        yearsExperience: 18,
        subspecialties: ['Thoracic Imaging', 'Emergency Radiology'],
        consultingRooms: ['RAD-ROOM-01', 'RAD-ROOM-02'],
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '07:00',
        endTime: '15:00',
        isActive: true,
        joinedDate: new Date('2015-03-01'),
    },
    {
        user: {
            phoneNumber: '+61387650002',
            email: 'michael.roberts@axisimaging.com.au',
            firstName: 'Michael',
            lastName: 'Roberts',
            dateOfBirth: new Date('1968-12-22'),
            gender: client_1.Gender.MALE,
            role: client_1.UserRole.RADIOLOGIST,
            isVerified: true,
            isActive: true,
        },
        employeeNumber: 'RAD002',
        licenseNumber: 'MED0001234501',
        specializations: ['Diagnostic Radiology', 'Musculoskeletal Imaging'],
        qualifications: ['MBBS', 'FRANZCR', 'MSK Fellowship'],
        yearsExperience: 25,
        subspecialties: ['Musculoskeletal', 'Spine Imaging', 'Sports Medicine'],
        consultingRooms: ['RAD-ROOM-03'],
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '08:00',
        endTime: '17:00',
        isActive: true,
        joinedDate: new Date('2010-01-15'),
    },
    {
        user: {
            phoneNumber: '+61387650003',
            email: 'jennifer.park@axisimaging.com.au',
            firstName: 'Jennifer',
            lastName: 'Park',
            dateOfBirth: new Date('1982-05-03'),
            gender: client_1.Gender.FEMALE,
            role: client_1.UserRole.RADIOLOGIST,
            isVerified: true,
            isActive: true,
        },
        employeeNumber: 'RAD003',
        licenseNumber: 'MED0001234502',
        specializations: ['Diagnostic Radiology', 'Abdominal Imaging'],
        qualifications: ['MBBS', 'FRANZCR', 'Abdominal Fellowship'],
        yearsExperience: 12,
        subspecialties: ['Abdominal Imaging', 'GI Radiology', 'Hepatobiliary'],
        consultingRooms: ['RAD-ROOM-04'],
        workDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
        joinedDate: new Date('2018-07-01'),
    },
    {
        user: {
            phoneNumber: '+61387650004',
            email: 'rachel.stone@axisimaging.com.au',
            firstName: 'Rachel',
            lastName: 'Stone',
            dateOfBirth: new Date('1979-10-18'),
            gender: client_1.Gender.FEMALE,
            role: client_1.UserRole.RADIOLOGIST,
            isVerified: true,
            isActive: true,
        },
        employeeNumber: 'RAD004',
        licenseNumber: 'MED0001234503',
        specializations: ['Diagnostic Radiology', 'Breast Imaging'],
        qualifications: ['MBBS', 'FRANZCR', 'Breast Fellowship'],
        yearsExperience: 15,
        subspecialties: ['Breast Imaging', 'Mammography', 'Breast Ultrasound'],
        consultingRooms: ['BREAST-ROOM-01'],
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '08:00',
        endTime: '16:00',
        isActive: true,
        joinedDate: new Date('2016-09-01'),
    },
    {
        user: {
            phoneNumber: '+61387650005',
            email: 'sarah.mitchell.rad@axisimaging.com.au',
            firstName: 'Sarah',
            lastName: 'Mitchell',
            middleName: 'Louise',
            dateOfBirth: new Date('1971-02-28'),
            gender: client_1.Gender.FEMALE,
            role: client_1.UserRole.RADIOLOGIST,
            isVerified: true,
            isActive: true,
        },
        employeeNumber: 'RAD005',
        licenseNumber: 'MED0001234504',
        specializations: ['Diagnostic Radiology', 'Emergency Radiology'],
        qualifications: ['MBBS', 'FRANZCR', 'Emergency Fellowship'],
        yearsExperience: 22,
        subspecialties: ['Emergency Radiology', 'Trauma Imaging', 'Neuroradiology'],
        consultingRooms: ['RAD-ROOM-05'],
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        startTime: '00:00',
        endTime: '23:59',
        isActive: true,
        joinedDate: new Date('2012-04-01'),
    },
    {
        user: {
            phoneNumber: '+61387650006',
            email: 'paul.anderson@axisimaging.com.au',
            firstName: 'Paul',
            lastName: 'Anderson',
            dateOfBirth: new Date('1973-07-11'),
            gender: client_1.Gender.MALE,
            role: client_1.UserRole.RADIOLOGIST,
            isVerified: true,
            isActive: true,
        },
        employeeNumber: 'RAD006',
        licenseNumber: 'MED0001234505',
        specializations: ['Nuclear Medicine', 'PET-CT'],
        qualifications: ['MBBS', 'FRACNM', 'Nuclear Medicine Fellowship'],
        yearsExperience: 20,
        subspecialties: ['Nuclear Medicine', 'PET Imaging', 'Thyroid Imaging'],
        consultingRooms: ['NM-ROOM-01'],
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '07:30',
        endTime: '16:30',
        isActive: true,
        joinedDate: new Date('2014-11-01'),
    },
];
const technologistSeedData = [
    {
        user: {
            phoneNumber: '+61387651001',
            email: 'mark.stevens@axisimaging.com.au',
            firstName: 'Mark',
            lastName: 'Stevens',
            dateOfBirth: new Date('1985-06-15'),
            gender: client_1.Gender.MALE,
            role: client_1.UserRole.TECHNOLOGIST,
            isVerified: true,
            isActive: true,
        },
        employeeNumber: 'TECH001',
        licenseNumber: 'RT123456',
        modalities: ['DX', 'CR', 'Fluoroscopy'],
        certifications: ['ASMIRT Registration', 'Radiation Safety'],
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '07:00',
        endTime: '15:00',
        isActive: true,
        joinedDate: new Date('2018-02-01'),
    },
    {
        user: {
            phoneNumber: '+61387651002',
            email: 'lisa.cooper@axisimaging.com.au',
            firstName: 'Lisa',
            lastName: 'Cooper',
            dateOfBirth: new Date('1979-11-08'),
            gender: client_1.Gender.FEMALE,
            role: client_1.UserRole.TECHNOLOGIST,
            isVerified: true,
            isActive: true,
        },
        employeeNumber: 'TECH002',
        licenseNumber: 'MR789012',
        modalities: ['MR'],
        certifications: ['MRI Safety Level 2', 'ASMIRT Registration'],
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        startTime: '08:00',
        endTime: '16:00',
        isActive: true,
        joinedDate: new Date('2016-05-15'),
    },
    {
        user: {
            phoneNumber: '+61387651003',
            email: 'david.kim@axisimaging.com.au',
            firstName: 'David',
            lastName: 'Kim',
            dateOfBirth: new Date('1983-04-22'),
            gender: client_1.Gender.MALE,
            role: client_1.UserRole.TECHNOLOGIST,
            isVerified: true,
            isActive: true,
        },
        employeeNumber: 'TECH003',
        licenseNumber: 'CT345678',
        modalities: ['CT'],
        certifications: ['CT Advanced Imaging', 'Contrast Administration', 'ASMIRT Registration'],
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '07:30',
        endTime: '15:30',
        isActive: true,
        joinedDate: new Date('2017-08-01'),
    },
];
// System settings seed data
const systemSettingSeedData = [
    {
        key: 'FACILITY_NAME',
        value: 'Axis Imaging Mickleham',
        dataType: client_1.SettingDataType.STRING,
        name: 'Facility Name',
        description: 'Official name of the imaging facility',
        category: 'GENERAL',
        isRequired: true,
    },
    {
        key: 'FACILITY_ADDRESS',
        value: {
            street: '123 Imaging Drive',
            suburb: 'Mickleham',
            state: 'VIC',
            postcode: '3064',
            country: 'Australia'
        },
        dataType: client_1.SettingDataType.JSON,
        name: 'Facility Address',
        description: 'Physical address of the imaging facility',
        category: 'GENERAL',
        isRequired: true,
    },
    {
        key: 'FACILITY_PHONE',
        value: '+61 3 8765 1000',
        dataType: client_1.SettingDataType.STRING,
        name: 'Facility Phone',
        description: 'Main contact phone number',
        category: 'GENERAL',
        isRequired: true,
    },
    {
        key: 'FACILITY_EMAIL',
        value: 'info@axisimaging.com.au',
        dataType: client_1.SettingDataType.STRING,
        name: 'Facility Email',
        description: 'Main contact email address',
        category: 'GENERAL',
        isRequired: true,
    },
    {
        key: 'DICOM_AE_TITLE',
        value: 'AXIS_MICKLEHAM',
        dataType: client_1.SettingDataType.STRING,
        name: 'DICOM AE Title',
        description: 'DICOM Application Entity Title for the facility',
        category: 'DICOM',
        isRequired: true,
    },
    {
        key: 'APPOINTMENT_REMINDER_HOURS',
        value: 24,
        dataType: client_1.SettingDataType.NUMBER,
        name: 'Appointment Reminder Hours',
        description: 'Hours before appointment to send reminder',
        category: 'NOTIFICATIONS',
        isRequired: false,
    },
    {
        key: 'CRITICAL_RESULT_NOTIFICATION',
        value: true,
        dataType: client_1.SettingDataType.BOOLEAN,
        name: 'Critical Result Notification',
        description: 'Enable automatic notification for critical results',
        category: 'NOTIFICATIONS',
        isRequired: true,
    },
    {
        key: 'DATA_RETENTION_YEARS',
        value: 7,
        dataType: client_1.SettingDataType.NUMBER,
        name: 'Data Retention Period',
        description: 'Years to retain patient data as per Australian requirements',
        category: 'SECURITY',
        isRequired: true,
    },
];
async function main() {
    console.log('🌱 Starting seed process...');
    try {
        // Clean existing data (in reverse order of dependencies)
        console.log('🧹 Cleaning existing data...');
        await prisma.auditLog.deleteMany();
        await prisma.systemSetting.deleteMany();
        await prisma.session.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.invitation.deleteMany();
        await prisma.report.deleteMany();
        await prisma.image.deleteMany();
        await prisma.series.deleteMany();
        await prisma.study.deleteMany();
        await prisma.appointment.deleteMany();
        await prisma.referral.deleteMany();
        await prisma.patient.deleteMany();
        await prisma.radiologist.deleteMany();
        await prisma.technologist.deleteMany();
        await prisma.referringGP.deleteMany();
        await prisma.user.deleteMany();
        console.log('✅ Existing data cleaned');
        // 1. Create System Settings
        console.log('⚙️ Creating system settings...');
        for (const setting of systemSettingSeedData) {
            await prisma.systemSetting.create({
                data: {
                    ...setting,
                    updatedBy: 'SYSTEM_SEED',
                    changeReason: 'Initial system setup'
                }
            });
        }
        console.log('✅ System settings created');
        // 2. Create Referring GPs
        console.log('👨‍⚕️ Creating referring GPs...');
        for (const gp of patients_1.referringGPSeedData) {
            await prisma.referringGP.create({
                data: gp
            });
        }
        console.log('✅ Referring GPs created');
        // 3. Create Users, Patients, and Healthcare Professionals
        console.log('👥 Creating users and patients...');
        // Create patient users and patient records
        for (const patientData of patients_1.patientSeedData) {
            const user = await prisma.user.create({
                data: patientData.user
            });
            await prisma.patient.create({
                data: {
                    ...patientData.patient,
                    userId: user.id,
                    referringGpId: null, // Will be linked after GP creation if needed
                }
            });
        }
        // Create radiologist users and radiologist records
        for (const radiologistData of radiologistSeedData) {
            const user = await prisma.user.create({
                data: radiologistData.user
            });
            await prisma.radiologist.create({
                data: {
                    userId: user.id,
                    employeeNumber: radiologistData.employeeNumber,
                    licenseNumber: radiologistData.licenseNumber,
                    specializations: radiologistData.specializations,
                    qualifications: radiologistData.qualifications,
                    yearsExperience: radiologistData.yearsExperience,
                    subspecialties: radiologistData.subspecialties,
                    consultingRooms: radiologistData.consultingRooms,
                    workDays: radiologistData.workDays,
                    startTime: radiologistData.startTime,
                    endTime: radiologistData.endTime,
                    isActive: radiologistData.isActive,
                    joinedDate: radiologistData.joinedDate,
                }
            });
        }
        // Create technologist users and technologist records
        for (const techData of technologistSeedData) {
            const user = await prisma.user.create({
                data: techData.user
            });
            await prisma.technologist.create({
                data: {
                    userId: user.id,
                    employeeNumber: techData.employeeNumber,
                    licenseNumber: techData.licenseNumber,
                    modalities: techData.modalities,
                    certifications: techData.certifications,
                    workDays: techData.workDays,
                    startTime: techData.startTime,
                    endTime: techData.endTime,
                    isActive: techData.isActive,
                    joinedDate: techData.joinedDate,
                }
            });
        }
        console.log('✅ Users and patients created');
        // 4. Create Referrals
        console.log('📋 Creating referrals...');
        for (const referralData of appointments_1.referralSeedData) {
            const referringGP = await prisma.referringGP.findFirst({
                where: { providerNumber: referralData.referringGpProviderNumber }
            });
            if (referringGP) {
                const { referringGpProviderNumber, ...referralCreateData } = referralData;
                await prisma.referral.create({
                    data: {
                        ...referralCreateData,
                        referringGpId: referringGP.id,
                    }
                });
            }
        }
        console.log('✅ Referrals created');
        // 5. Create Appointments
        console.log('📅 Creating appointments...');
        for (const appointmentData of appointments_1.appointmentSeedData) {
            const patient = await prisma.patient.findFirst({
                where: { patientNumber: appointmentData.patientNumber }
            });
            const referral = appointmentData.referralNumber ?
                await prisma.referral.findFirst({
                    where: { referralNumber: appointmentData.referralNumber }
                }) : null;
            if (patient) {
                const { patientNumber, referralNumber, ...appointmentCreateData } = appointmentData;
                await prisma.appointment.create({
                    data: {
                        ...appointmentCreateData,
                        patientId: patient.id,
                        referralId: referral?.id,
                    }
                });
            }
        }
        console.log('✅ Appointments created');
        // 6. Create Studies with Series and Images
        console.log('🏥 Creating studies, series, and images...');
        for (const studyData of studies_1.studySeedData) {
            const patient = await prisma.patient.findFirst({
                where: { patientNumber: studyData.patientNumber }
            });
            if (patient) {
                const appointment = await prisma.appointment.findFirst({
                    where: {
                        patientId: patient.id,
                        scheduledAt: { lte: studyData.studyDate }
                    },
                    orderBy: { scheduledAt: 'desc' }
                });
                // Get radiologist and technologist IDs if specified
                const radiologist = studyData.radiologistId ?
                    await prisma.radiologist.findFirst({
                        where: { employeeNumber: studyData.radiologistId }
                    }) : null;
                const technologist = studyData.technologistId ?
                    await prisma.technologist.findFirst({
                        where: { employeeNumber: studyData.technologistId }
                    }) : null;
                const { patientNumber, series, ...studyCreateData } = studyData;
                const study = await prisma.study.create({
                    data: {
                        ...studyCreateData,
                        patientId: patient.id,
                        appointmentId: appointment?.id,
                        radiologistId: radiologist?.id,
                        technologistId: technologist?.id,
                    }
                });
                // Create series and images
                for (const seriesData of studyData.series) {
                    const { images, ...seriesCreateData } = seriesData;
                    const series = await prisma.series.create({
                        data: {
                            ...seriesCreateData,
                            studyId: study.id,
                        }
                    });
                    // Create images for this series
                    for (const imageData of seriesData.images) {
                        await prisma.image.create({
                            data: {
                                ...imageData,
                                seriesId: series.id,
                            }
                        });
                    }
                }
            }
        }
        // Create additional studies without full series/image data
        for (const additionalStudy of studies_1.additionalStudySeedData) {
            const patient = await prisma.patient.findFirst({
                where: { patientNumber: additionalStudy.patientNumber }
            });
            if (patient && additionalStudy.accessionNumber) {
                await prisma.study.create({
                    data: {
                        studyInstanceUID: additionalStudy.studyInstanceUID,
                        accessionNumber: additionalStudy.accessionNumber,
                        studyDate: additionalStudy.studyDate,
                        studyDescription: additionalStudy.studyDescription,
                        modality: additionalStudy.modality,
                        bodyPartExamined: additionalStudy.bodyPartExamined,
                        clinicalHistory: additionalStudy.clinicalHistory,
                        requestedProcedure: additionalStudy.requestedProcedure,
                        priority: additionalStudy.priority,
                        status: additionalStudy.status,
                        numberOfSeries: additionalStudy.numberOfSeries,
                        numberOfInstances: additionalStudy.numberOfInstances,
                        studySize: additionalStudy.studySize,
                        patientId: patient.id,
                    }
                });
            }
        }
        console.log('✅ Studies, series, and images created');
        // 7. Create Reports
        console.log('📄 Creating reports...');
        for (const reportData of reports_1.reportSeedData) {
            const study = await prisma.study.findFirst({
                where: { accessionNumber: reportData.accessionNumber }
            });
            const patient = await prisma.patient.findFirst({
                where: { patientNumber: reportData.patientNumber }
            });
            const radiologist = reportData.radiologistEmployeeNumber ?
                await prisma.radiologist.findFirst({
                    where: { employeeNumber: reportData.radiologistEmployeeNumber }
                }) : null;
            if (study && patient && radiologist) {
                const { accessionNumber, patientNumber, radiologistEmployeeNumber, ...reportCreateData } = reportData;
                await prisma.report.create({
                    data: {
                        ...reportCreateData,
                        studyId: study.id,
                        patientId: patient.id,
                        radiologistId: radiologist.id,
                    }
                });
            }
        }
        console.log('✅ Reports created');
        // 8. Create sample notifications
        console.log('🔔 Creating sample notifications...');
        const allUsers = await prisma.user.findMany();
        const patientUsers = allUsers.filter(user => user.role === 'PATIENT');
        // Create appointment reminders for upcoming appointments
        const upcomingAppointments = await prisma.appointment.findMany({
            where: {
                scheduledAt: {
                    gte: new Date()
                },
                status: {
                    in: ['SCHEDULED', 'CONFIRMED']
                }
            },
            include: {
                patient: {
                    include: {
                        user: true
                    }
                }
            }
        });
        for (const appointment of upcomingAppointments.slice(0, 5)) {
            await prisma.notification.create({
                data: {
                    userId: appointment.patient.user.id,
                    type: client_1.NotificationType.APPOINTMENT_REMINDER,
                    category: client_1.NotificationCategory.APPOINTMENT,
                    title: 'Upcoming Appointment Reminder',
                    message: `You have an appointment scheduled for ${appointment.scheduledAt.toLocaleDateString()} at ${appointment.scheduledAt.toLocaleTimeString()}. Please arrive 15 minutes early.`,
                    actionUrl: `/appointments/${appointment.id}`,
                    actionText: 'View Details',
                    sentVia: [client_1.ContactMethod.SMS, client_1.ContactMethod.EMAIL],
                    relatedEntityType: 'APPOINTMENT',
                    relatedEntityId: appointment.id,
                }
            });
        }
        // Create report available notifications for completed studies
        const completedReports = await prisma.report.findMany({
            where: {
                status: 'FINAL'
            },
            include: {
                patient: {
                    include: {
                        user: true
                    }
                }
            },
            take: 5
        });
        for (const report of completedReports) {
            await prisma.notification.create({
                data: {
                    userId: report.patient.user.id,
                    type: client_1.NotificationType.REPORT_AVAILABLE,
                    category: client_1.NotificationCategory.REPORT,
                    title: 'Your Imaging Results Are Available',
                    message: `The results for your recent imaging study are now available in your patient portal.`,
                    actionUrl: `/reports/${report.id}`,
                    actionText: 'View Report',
                    sentVia: [client_1.ContactMethod.EMAIL],
                    relatedEntityType: 'REPORT',
                    relatedEntityId: report.id,
                }
            });
        }
        console.log('✅ Sample notifications created');
        // 9. Create sample consent records
        console.log('📝 Creating sample consent records...');
        for (const user of patientUsers.slice(0, 8)) {
            // Privacy consent
            await prisma.consent.create({
                data: {
                    userId: user.id,
                    consentType: client_1.ConsentType.PRIVACY,
                    consentVersion: 'v2.1',
                    consentText: 'I consent to the collection, use and disclosure of my personal health information in accordance with the Privacy Act 1988 and Australian Privacy Principles.',
                    isConsented: true,
                    consentMethod: client_1.ConsentMethod.ONLINE,
                    consentedAt: new Date(),
                    legalBasis: 'Consent under Privacy Act 1988',
                    jurisdiction: 'Australia',
                }
            });
            // Communication consent
            await prisma.consent.create({
                data: {
                    userId: user.id,
                    consentType: client_1.ConsentType.COMMUNICATION,
                    consentVersion: 'v1.0',
                    consentText: 'I consent to receive appointment reminders, results notifications, and other communications via SMS and email.',
                    isConsented: true,
                    consentMethod: client_1.ConsentMethod.ONLINE,
                    consentedAt: new Date(),
                    legalBasis: 'Consent for healthcare communications',
                    jurisdiction: 'Australia',
                }
            });
        }
        console.log('✅ Sample consent records created');
        // 10. Create sample audit logs
        console.log('📊 Creating sample audit logs...');
        const sampleAuditLogs = [
            {
                userId: patientUsers[0]?.id,
                action: client_1.AuditAction.LOGIN,
                entity: client_1.AuditEntity.USER,
                entityId: patientUsers[0]?.id,
                entityName: `${patientUsers[0]?.firstName} ${patientUsers[0]?.lastName}`,
                description: 'User logged into patient portal',
                category: client_1.AuditCategory.SECURITY,
                severity: client_1.LogSeverity.INFO,
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            {
                userId: patientUsers[1]?.id,
                action: client_1.AuditAction.VIEW,
                entity: client_1.AuditEntity.REPORT,
                entityId: 'report-id-1',
                entityName: 'Chest X-Ray Report',
                description: 'Patient viewed imaging report',
                category: client_1.AuditCategory.DATA_ACCESS,
                severity: client_1.LogSeverity.INFO,
                ipAddress: '192.168.1.101',
            },
            {
                userId: null,
                action: client_1.AuditAction.CREATE,
                entity: client_1.AuditEntity.STUDY,
                entityId: 'study-id-1',
                entityName: 'CT Abdomen Study',
                description: 'New imaging study created',
                category: client_1.AuditCategory.ADMINISTRATIVE,
                severity: client_1.LogSeverity.INFO,
                ipAddress: '10.0.0.50',
            },
        ];
        for (const auditLog of sampleAuditLogs) {
            if (auditLog.userId || auditLog.action === 'CREATE') {
                await prisma.auditLog.create({
                    data: auditLog
                });
            }
        }
        console.log('✅ Sample audit logs created');
        // Summary
        const counts = {
            users: await prisma.user.count(),
            patients: await prisma.patient.count(),
            referringGPs: await prisma.referringGP.count(),
            radiologists: await prisma.radiologist.count(),
            technologists: await prisma.technologist.count(),
            referrals: await prisma.referral.count(),
            appointments: await prisma.appointment.count(),
            studies: await prisma.study.count(),
            series: await prisma.series.count(),
            images: await prisma.image.count(),
            reports: await prisma.report.count(),
            notifications: await prisma.notification.count(),
            consents: await prisma.consent.count(),
            auditLogs: await prisma.auditLog.count(),
            systemSettings: await prisma.systemSetting.count(),
        };
        console.log('\n🎉 Seed completed successfully!');
        console.log('📈 Summary of created records:');
        console.table(counts);
        console.log('\n📋 Sample login credentials:');
        console.log('Patient Portal Access:');
        console.log('- Sarah Mitchell: +61412345001');
        console.log('- James Thompson: +61412345003');
        console.log('- Robert Wilson: +61412345007');
        console.log('\nRadiologist Access:');
        console.log('- Dr. Amanda Richards: +61387650001');
        console.log('- Dr. Michael Roberts: +61387650002');
        console.log('\nTechnologist Access:');
        console.log('- Mark Stevens: +61387651001');
        console.log('- Lisa Cooper: +61387651002');
        console.log('\n📍 Facility Information:');
        console.log('- Name: Axis Imaging Mickleham');
        console.log('- Address: 123 Imaging Drive, Mickleham VIC 3064');
        console.log('- Phone: +61 3 8765 1000');
        console.log('- Email: info@axisimaging.com.au');
    }
    catch (error) {
        console.error('❌ Error during seed:', error);
        throw error;
    }
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map