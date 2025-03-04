const fs = require('fs').promises;
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const DownloadModel = require('../models/downloadModel');
const DispositionModel = require('../models/dispositionModel');

exports.getDownloadForm = async (req, res) => {
    try {
        // Get disposition types for filtering
        const dispositionTypes = await DispositionModel.getDispositionTypes();
        
        // Get recent downloads history
        const downloadHistory = await DownloadModel.getDownloadHistory(10);

        res.render('download', {
            layout: 'layouts/main',
            dispositionTypes,
            downloadHistory,
            error: null
        });
    } catch (error) {
        console.error('Error loading download form:', error);
        res.status(500).render('error', {
            layout: 'layouts/main',
            message: 'Error loading download form',
            error: error.message
        });
    }
};

exports.downloadData = async (req, res) => {
    try {
        const {
            fileName,
            zipCodes,
            dispositionAction,
            dispositions,
            startDate,
            endDate
        } = req.body;

        // Validate required fields
        if (!fileName) {
            throw new Error('File name is required');
        }

        // Process zip codes
        const processedZipCodes = zipCodes ? zipCodes.split(',').map(zip => zip.trim()) : [];

        // Process dispositions based on action
        const includeDispositions = dispositionAction === 'include' ? dispositions || [] : [];
        const excludeDispositions = dispositionAction === 'exclude' ? dispositions || [] : [];

        // Get filtered data
        const records = await DownloadModel.getFilteredData({
            zipCodes: processedZipCodes,
            includeDispositions,
            excludeDispositions,
            startDate,
            endDate
        });

        if (records.length === 0) {
            throw new Error('No records found matching the specified criteria');
        }

        // Convert records to CSV
        const csv = stringify(records, {
            header: true,
            columns: [
                'first_name',
                'last_name',
                'phone1',
                'phone2',
                'phone3',
                'phone4',
                'address1',
                'address2',
                'city',
                'state',
                'region',
                'zipcode',
                'lat',
                'lon'
            ]
        });

        // Save download history
        await DownloadModel.createDownloadRecord(
            fileName,
            records.length,
            {
                zipCodes: processedZipCodes,
                dispositionAction,
                dispositions,
                startDate,
                endDate
            },
            'system' // TODO: Replace with actual user ID when authentication is implemented
        );

        // Set response headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);

        // Send the CSV file
        res.send(csv);
    } catch (error) {
        console.error('Error downloading data:', error);
        res.status(500).render('error', {
            layout: 'layouts/main',
            message: 'Error downloading data',
            error: error.message
        });
    }
};

exports.redownload = async (req, res) => {
    try {
        const { id } = req.params;

        // Get download record
        const download = await DownloadModel.getDownloadById(id);
        if (!download) {
            throw new Error('Download record not found');
        }

        // Get filtered data using saved filters
        const records = await DownloadModel.getFilteredData({
            zipCodes: download.filters.zipCodes,
            includeDispositions: download.filters.dispositionAction === 'include' ? download.filters.dispositions : [],
            excludeDispositions: download.filters.dispositionAction === 'exclude' ? download.filters.dispositions : [],
            startDate: download.filters.startDate,
            endDate: download.filters.endDate
        });

        if (records.length === 0) {
            throw new Error('No records found matching the saved criteria');
        }

        // Convert records to CSV
        const csv = stringify(records, {
            header: true,
            columns: [
                'first_name',
                'last_name',
                'phone1',
                'phone2',
                'phone3',
                'phone4',
                'address1',
                'address2',
                'city',
                'state',
                'region',
                'zipcode',
                'lat',
                'lon'
            ]
        });

        // Set response headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${download.file_name}.csv"`);

        // Send the CSV file
        res.send(csv);
    } catch (error) {
        console.error('Error re-downloading data:', error);
        res.status(500).render('error', {
            layout: 'layouts/main',
            message: 'Error re-downloading data',
            error: error.message
        });
    }
};

exports.deleteDownload = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await DownloadModel.deleteDownload(id);
        
        if (!success) {
            throw new Error('Download record not found');
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting download:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
