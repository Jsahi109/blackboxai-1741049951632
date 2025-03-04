const fs = require('fs').promises;
const { parse } = require('csv-parse/sync'); // Using sync version for simpler code
const masterModel = require('../models/masterModel');

exports.getUploadForm = (req, res) => {
    res.render('index', { 
        layout: 'layouts/main',
        error: null
    });
};

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        const vendorName = req.body.vendorName;
        if (!vendorName) {
            throw new Error('Vendor name is required');
        }

        // Read file content
        const fileContent = await fs.readFile(req.file.path, 'utf-8');

        // Parse CSV content
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        if (records.length === 0) {
            throw new Error('CSV file is empty');
        }

        // Get headers from the first record
        const headers = Object.keys(records[0]);
        console.log('CSV Headers:', headers); // Debug log

        // Get available column names from the model
        const columnNames = await masterModel.getColumnNames();
        console.log('Column Names:', columnNames); // Debug log

        res.render('mapFields', {
            layout: 'layouts/main',
            headers: headers,
            columnNames: columnNames,
            filePath: req.file.path,
            vendorName,
            error: null
        });
    } catch (error) {
        console.error('Upload Error:', error);
        // Clean up uploaded file if it exists
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        res.status(400).render('index', {
            layout: 'layouts/main',
            error: error.message
        });
    }
};

exports.processFile = async (req, res) => {
    const { filePath, vendorName, ...fieldMapping } = req.body;

    try {
        // Validate inputs
        if (!filePath || !vendorName) {
            throw new Error('Missing required fields');
        }

        // Read and parse CSV file
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log('Field Mapping:', fieldMapping); // Debug log
        console.log('First Record:', records[0]); // Debug log

        // Process each record
        for (const record of records) {
            const mappedRecord = {};
            
            // Map fields according to user's selection
            Object.entries(fieldMapping).forEach(([dbField, csvField]) => {
                if (csvField && csvField !== '') {
                    mappedRecord[dbField] = record[csvField];
                }
            });

            if (Object.keys(mappedRecord).length === 0) {
                throw new Error('No fields were mapped');
            }

            console.log('Mapped Record:', mappedRecord); // Debug log

            // Insert record into database
            await masterModel.insertMasterRecord(mappedRecord, vendorName);
        }

        // Clean up uploaded file
        await fs.unlink(filePath);

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Processing Error:', error);
        res.status(500).render('error', {
            layout: 'layouts/main',
            message: 'Error processing file',
            error: error.message
        });
    }
};
