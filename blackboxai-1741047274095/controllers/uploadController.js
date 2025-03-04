const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const MasterModel = require('../models/masterModel');
const path = require('path');

exports.getUploadForm = async (req, res) => {
    try {
        // Get column names for field mapping
        const columnNames = await MasterModel.getColumnNames();
        
        // Get recent uploads
        const recentUploads = await MasterModel.getRecentUploads(10);

        res.render('upload', {
            layout: 'layouts/main',
            columnNames,
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

        // Update upload record with headers
        await MasterModel.updateUploadRecord(uploadRecord.id, {
            headers: JSON.stringify(Object.keys(records[0])),
            total_records: records.length
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
                if (record.phone1) numbers.push(record.phone1);
                if (record.phone2) numbers.push(record.phone2);
                if (record.phone3) numbers.push(record.phone3);
                if (record.phone4) numbers.push(record.phone4);
                return numbers;
            }, []);

            const duplicates = await MasterModel.checkDuplicatePhones(phoneNumbers);
            
            // Process each record
            for (const record of batch) {
                try {
                    const isDuplicate = duplicates.some(dup => 
                        dup === record.phone1 || 
                        dup === record.phone2 || 
                        dup === record.phone3 || 
                        dup === record.phone4
                    );

                    if (isDuplicate) {
                        duplicatesCount++;
                        continue;
                    }

                    // Insert record
                    await MasterModel.insertMasterRecord(record, vendorName);
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
            failed_records: failedCount
        });

        // Get updated recent uploads
        const recentUploads = await MasterModel.getRecentUploads(10);

        res.render('upload', {
            layout: 'layouts/main',
            columnNames: await MasterModel.getColumnNames(),
            recentUploads,
            error: null,
            success: `File uploaded successfully. ${successCount} records added, ${duplicatesCount} duplicates found, ${failedCount} records failed.`
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
            columnNames: await MasterModel.getColumnNames(),
            recentUploads: await MasterModel.getRecentUploads(10),
            error: `Error uploading file: ${error.message}`,
            success: null
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
