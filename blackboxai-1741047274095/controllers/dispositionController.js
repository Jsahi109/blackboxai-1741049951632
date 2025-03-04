const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const DispositionModel = require('../models/dispositionModel');

exports.getDispositionForm = async (req, res) => {
    try {
        // Get disposition types and stats
        const dispositionTypes = await DispositionModel.getDispositionTypes();
        const stats = await DispositionModel.getDispositionStats();

        res.render('dispositions', {
            layout: 'layouts/main',
            dispositionTypes,
            stats,
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Error loading disposition form:', error);
        res.status(500).render('error', {
            layout: 'layouts/main',
            message: 'Error loading disposition form',
            error: error.message
        });
    }
};

exports.uploadDispositions = async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded');
        }

        // Read and parse CSV file
        let fileContent = await fs.readFile(req.file.path, 'utf-8');
        
        // Remove BOM if present
        if (fileContent.charCodeAt(0) === 0xFEFF) {
            fileContent = fileContent.slice(1);
        }

        // Parse CSV content
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        if (records.length === 0) {
            throw new Error('CSV file is empty');
        }

        // Validate required columns
        const requiredColumns = ['phone_number', 'disposition_type'];
        const headers = Object.keys(records[0]);
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        // Get valid disposition types
        const dispositionTypes = await DispositionModel.getDispositionTypes();
        const validDispositionTypes = dispositionTypes.map(d => d.name);

        // Validate and format dispositions
        const dispositions = records.map(record => {
            if (!validDispositionTypes.includes(record.disposition_type)) {
                throw new Error(`Invalid disposition type: ${record.disposition_type}`);
            }

            return {
                phone_number: record.phone_number.replace(/\D/g, ''), // Remove non-digits
                disposition_type: record.disposition_type,
                notes: record.notes || null
            };
        });

        // Check for existing dispositions
        const phoneNumbers = dispositions.map(d => d.phone_number);
        const existingDispositions = await DispositionModel.validatePhoneNumbers(phoneNumbers);

        // Add dispositions
        await DispositionModel.addDispositions(
            dispositions,
            'system' // TODO: Replace with actual user ID when authentication is implemented
        );

        // Clean up uploaded file
        await fs.unlink(req.file.path);

        // Get updated stats
        const stats = await DispositionModel.getDispositionStats();

        // Render with success message
        const message = existingDispositions.length > 0
            ? `Dispositions updated successfully. ${existingDispositions.length} numbers were already dispositioned.`
            : 'Dispositions added successfully.';

        res.render('dispositions', {
            layout: 'layouts/main',
            dispositionTypes,
            stats,
            error: null,
            success: message
        });
    } catch (error) {
        console.error('Error uploading dispositions:', error);
        
        // Clean up uploaded file if it exists
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }

        // Get disposition types and stats for re-rendering the form
        const dispositionTypes = await DispositionModel.getDispositionTypes();
        const stats = await DispositionModel.getDispositionStats();

        res.status(400).render('dispositions', {
            layout: 'layouts/main',
            error: error.message,
            success: null,
            dispositionTypes,
            stats
        });
    }
};

exports.deleteDispositions = async (req, res) => {
    try {
        const { phoneNumbers } = req.body;
        if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
            throw new Error('No phone numbers provided');
        }

        const deletedCount = await DispositionModel.deleteDispositions(phoneNumbers);
        res.json({
            success: true,
            message: `Successfully deleted ${deletedCount} disposition(s)`
        });
    } catch (error) {
        console.error('Error deleting dispositions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getDispositionStats = async (req, res) => {
    try {
        const stats = await DispositionModel.getDispositionStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting disposition stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
