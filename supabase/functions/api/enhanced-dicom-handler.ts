// Enhanced DICOM Handler for Supabase Edge Function
// This replaces the basic DICOM webhook in the main API

export async function handleDICOMWebhook(req: Request, supabase: any) {
  try {
    const dicomData = await req.json()
    console.log('Enhanced DICOM webhook received:', {
      source: dicomData.source,
      server: dicomData.server,
      patientId: dicomData.metadata?.patientId,
      modality: dicomData.metadata?.modality,
      studyUID: dicomData.metadata?.studyInstanceUID
    })

    // Extract metadata
    const metadata = dicomData.metadata || {}
    const {
      patientId,
      patientName,
      studyInstanceUID,
      seriesInstanceUID,
      sopInstanceUID,
      modality,
      studyDate,
      studyTime,
      accessionNumber,
      bodyPartExamined,
      studyDescription,
      seriesDescription,
      instanceNumber
    } = metadata

    // Generate IDs if missing
    const studyId = studyInstanceUID || `STUDY_${Date.now()}`
    const seriesId = seriesInstanceUID || `${studyId}.1`
    const imageId = sopInstanceUID || `${seriesId}.${instanceNumber || 1}`

    // Format study date
    let formattedStudyDate = new Date().toISOString()
    if (studyDate && studyDate.length >= 8) {
      try {
        const year = studyDate.substring(0, 4)
        const month = studyDate.substring(4, 6)
        const day = studyDate.substring(6, 8)
        formattedStudyDate = new Date(`${year}-${month}-${day}`).toISOString()
      } catch (e) {
        console.warn('Invalid study date format:', studyDate)
      }
    }

    // 1. Find or create patient
    let patient = null
    if (patientId) {
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('*')
        .eq('mrn', patientId)
        .single()

      if (existingPatient) {
        patient = existingPatient
        console.log('Found existing patient:', patientId)
      } else {
        // Create new patient
        const patientNameParts = (patientName || 'UNKNOWN^PATIENT').split('^')
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            mrn: patientId,
            first_name: patientNameParts[1] || 'Unknown',
            last_name: patientNameParts[0] || 'Patient',
            phone_number: '+61400000000', // Default placeholder
            date_of_birth: '1900-01-01', // Default placeholder
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (patientError) {
          console.error('Error creating patient:', patientError)
          throw new Error('Failed to create patient: ' + patientError.message)
        }

        patient = newPatient
        console.log('Created new patient:', patientId)
      }
    }

    // 2. Find or create study
    let study = null
    const { data: existingStudy } = await supabase
      .from('studies')
      .select('*')
      .eq('study_instance_uid', studyId)
      .single()

    if (existingStudy) {
      study = existingStudy
      console.log('Found existing study:', studyId)
    } else {
      // Create new study
      const { data: newStudy, error: studyError } = await supabase
        .from('studies')
        .insert({
          study_instance_uid: studyId,
          patient_id: patient?.id,
          accession_number: accessionNumber || null,
          study_date: formattedStudyDate,
          modality: modality || 'OT',
          study_description: studyDescription || `${modality} Study`,
          body_part_examined: bodyPartExamined || null,
          status: 'COMPLETED',
          priority: 'ROUTINE',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (studyError) {
        console.error('Error creating study:', studyError)
        throw new Error('Failed to create study: ' + studyError.message)
      }

      study = newStudy
      console.log('Created new study:', studyId)
    }

    // 3. Find or create series
    let series = null
    const { data: existingSeries } = await supabase
      .from('series')
      .select('*')
      .eq('series_instance_uid', seriesId)
      .single()

    if (existingSeries) {
      series = existingSeries
      console.log('Found existing series:', seriesId)
    } else {
      // Create new series
      const { data: newSeries, error: seriesError } = await supabase
        .from('series')
        .insert({
          series_instance_uid: seriesId,
          study_id: study.id,
          modality: modality || 'OT',
          series_description: seriesDescription || `${modality} Series`,
          series_number: 1,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (seriesError) {
        console.error('Error creating series:', seriesError)
        throw new Error('Failed to create series: ' + seriesError.message)
      }

      series = newSeries
      console.log('Created new series:', seriesId)
    }

    // 4. Create DICOM image record
    const { data: newImage, error: imageError } = await supabase
      .from('images')
      .insert({
        sop_instance_uid: imageId,
        series_id: series.id,
        instance_number: instanceNumber || 1,
        image_url: dicomData.storageUrl || dicomData.filePath,
        thumbnail_url: null, // TODO: Generate thumbnail
        file_size: dicomData.fileSize || 0,
        transfer_syntax_uid: '1.2.840.10008.1.2.1', // Explicit VR Little Endian
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (imageError) {
      console.error('Error creating image:', imageError)
      throw new Error('Failed to create image: ' + imageError.message)
    }

    console.log('Created new image:', imageId)

    // 5. Update study image count
    const { data: imageCount } = await supabase
      .from('images')
      .select('id', { count: 'exact' })
      .eq('series_id', series.id)

    await supabase
      .from('studies')
      .update({ 
        image_count: imageCount?.length || 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', study.id)

    // 6. Generate report placeholder if needed
    const { data: existingReport } = await supabase
      .from('reports')
      .select('*')
      .eq('study_id', study.id)
      .single()

    if (!existingReport) {
      await supabase
        .from('reports')
        .insert({
          study_id: study.id,
          radiologist_id: null,
          impression: 'Report pending',
          findings: 'Images received, awaiting radiologist review',
          technique: `${modality} imaging performed`,
          clinical_history: 'Clinical history not provided',
          status: 'PENDING',
          created_at: new Date().toISOString()
        })

      console.log('Created placeholder report for study:', studyId)
    }

    // 7. TODO: Trigger SMS notification to patient (if new study)
    // This would integrate with the SMS service when reports are ready

    return {
      success: true,
      message: 'DICOM image processed and stored successfully',
      data: {
        patient: { id: patient?.id, mrn: patientId },
        study: { id: study.id, studyInstanceUID: studyId },
        series: { id: series.id, seriesInstanceUID: seriesId },
        image: { id: newImage.id, sopInstanceUID: imageId },
        imageCount: imageCount?.length || 1
      },
      integration: 'modality-dicom-enhanced',
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error processing DICOM webhook:', error)
    
    return {
      success: false,
      error: 'DICOM processing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }
  }
}