const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const MasterModel = require('../models/masterModel');
const path = require('path');

exports.getUploadForm = async (req, res) => {
    try {
        // Get recent uploads
        const recentUploads = await MasterModel.getRecentUploads(10);

        res.render('upload', {
            layout: 'layouts/main',
            recentUploads,
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Error loading upload form:', error);
        res.status(500).render('error', {
            layout: 'layouts/main',
            message: 'Error loading upload form',
            error: error.message
        });
    }
};

exports.uploadFile = async (req, res) => {
    let uploadRecord = null;

    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        const { vendorName } = req.body;
        if (!vendorName) {
            throw new Error('Vendor name is required');
        }

        // Create upload record
        uploadRecord = await MasterModel.createUploadRecord({
            filename: req.file.filename,
            original_filename: req.file.originalname,
            vendor_name: vendorName,
            file_size: req.file.size,
            file_path: req.file.path,
            uploaded_by: 'system' // TODO: Replace with actual user ID when authentication is implemented
        });

        // Read and parse CSV file
        const fileContent = await fs.readFile(req.file.path, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        if (records.length === 0) {
            throw new Error('CSV file is empty');
        }

        // Update upload record with headers and sample data
        await MasterModel.updateUploadRecord(uploadRecord.id, {
            headers: JSON.stringify(Object.keys(records[0])),
            total_records: records.length
        });

        // Redirect to field mapping page
        res.render('mapFields', {
            layout: 'layouts/main',
            fileId: uploadRecord.id,
            vendorName,
            originalFilename: req.file.originalname,
            totalRows: records.length,
            csvHeaders: Object.keys(records[0]),
            columnNames: await MasterModel.getColumnNames(),
            sampleData: records[0],
            error: null
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        
        // Update upload record with error if it exists
        if (uploadRecord) {
            try {
                await MasterModel.updateUploadRecord(uploadRecord.id, {
                    status: 'failed',
                    error_message: error.message
                });
            } catch (updateError) {
                console.error('Error updating upload record:', updateError);
            }
        }

        // Clean up uploaded file
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }

        res.status(500).render('upload', {
            layout: 'layouts/main',
            recentUploads: await MasterModel.getRecentUploads(10),
            error: `Error uploading file: ${error.message}`,
            success: null
        });
    }
};

exports.mapFields = async (req, res) => {
    const { fileId, vendorName, mapping } = req.body;
    let uploadRecord = null;

    try {
        uploadRecord = await MasterModel.getUploadById(fileId);
        if (!uploadRecord) {
            throw new Error('Upload record not found');
        }

        // Read and parse CSV file
        const fileContent = await fs.readFile(uploadRecord.file_path, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        // Process records in batches
        const batchSize = 1000;
        let processedCount = 0;
        let duplicatesCount = 0;
        let failedCount = 0;
        let successCount = 0;

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            // Check for duplicates
            const phoneNumbers = batch.reduce((numbers, record) => {
                const mappedPhones = ['phone1', 'phone2', 'phone3', 'phone4']
                    .map(field => {
                        const csvField = Object.entries(mapping).find(([_, val]) => val === field)?.[0];
                        return csvField ? record[csvField] : null;
                    })
                    .filter(Boolean);
                return [...numbers, ...mappedPhones];
            }, []);

            const duplicates = await MasterModel.checkDuplicatePhones(phoneNumbers);
            
            // Process each record
            for (const record of batch) {
                try {
                    // Map fields according to user's mapping
                    const mappedRecord = {};
                    for (const [csvField, dbField] of Object.entries(mapping)) {
                        if (dbField && record[csvField]) {
                            mappedRecord[dbField] = record[csvField];
                        }
                    }

                    // Check if this record is a duplicate
                    const isDuplicate = duplicates.some(dup => 
                        mappedRecord.phone1 === dup ||
                        mappedRecord.phone2 === dup ||
                        mappedRecord.phone3 === dup ||
                        mappedRecord.phone4 === dup
                    );

                    if (isDuplicate) {
                        duplicatesCount++;
                        continue;
                    }

                    // Insert record
                    await MasterModel.insertMasterRecord(mappedRecord, vendorName);
                    successCount++;
                } catch (error) {
                    console.error('Error processing record:', error);
                    failedCount++;
                }
                processedCount++;

                // Update progress every 100 records
                if (processedCount % 100 === 0) {
                    await MasterModel.updateUploadRecord(uploadRecord.id, {
                        duplicates_count: duplicatesCount,
                        successful_records: successCount,
                        failed_records: failedCount
                    });
                }
            }
        }

        // Final update
        await MasterModel.updateUploadRecord(uploadRecord.id, {
            status: 'completed',
            duplicates_count: duplicatesCount,
            successful_records: successCount,
            failed_records: failedCount,
            mapping: JSON.stringify(mapping)
        });

        // Get updated recent uploads
        const recentUploads = await MasterModel.getRecentUploads(10);

        res.render('upload', {
            layout: 'layouts/main',
            recentUploads,
            error: null,
            success: `File processed successfully. ${successCount} records added, ${duplicatesCount} duplicates found, ${failedCount} records failed.`
        });
    } catch (error) {
        console.error('Error mapping fields:', error);
        
        // Update upload record with error if it exists
        if (uploadRecord) {
            try {
                await MasterModel.updateUploadRecord(uploadRecord.id, {
                    status: 'failed',
                    error_message: error.message
                });
            } catch (updateError) {
                console.error('Error updating upload record:', updateError);
            }
        }

        res.status(500).render('mapFields', {
            layout: 'layouts/main',
            fileId,
            vendorName,
            originalFilename: uploadRecord?.original_filename,
            totalRows: uploadRecord?.total_records || 0,
            csvHeaders: JSON.parse(uploadRecord?.headers || '[]'),
            columnNames: await MasterModel.getColumnNames(),
            sampleData: null,
            error: `Error mapping fields: ${error.message}`
        });
    }
};

exports.deleteUpload = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await MasterModel.deleteUpload(id);
        
        if (!success) {
            throw new Error('Upload record not found');
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting upload:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
