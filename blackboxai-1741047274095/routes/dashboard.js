const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const db = require('../config/db');

// Dashboard routes
router.get('/dashboard', dashboardController.getDashboardStats);
router.get('/analytics', dashboardController.getAnalytics);
router.get('/records', dashboardController.getRecords);

// API routes for records
router.get('/api/records/:id', async (req, res) => {
    try {
        const [records] = await db.execute('SELECT * FROM master WHERE id = ?', [req.params.id]);
        if (records.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json(records[0]);
    } catch (error) {
        console.error('Error fetching record:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/api/records/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM master WHERE id = ?', [req.params.id]);
        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export routes
router.get('/export/:format', async (req, res) => {
    try {
        const { search, vendor, region, state } = req.query;
        let query = 'SELECT * FROM master WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone1 LIKE ? OR address1 LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }
        if (vendor) {
            query += ' AND vendor_name = ?';
            params.push(vendor);
        }
        if (region) {
            query += ' AND region = ?';
            params.push(region);
        }
        if (state) {
            query += ' AND state = ?';
            params.push(state);
        }

        const [records] = await db.execute(query, params);

        // Format data based on requested format
        switch (req.params.format) {
            case 'csv':
                // Send CSV
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=records.csv');
                // Convert records to CSV and send
                break;
            case 'excel':
                // Send Excel
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
                // Convert records to Excel and send
                break;
            case 'pdf':
                // Send PDF
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename=records.pdf');
                // Convert records to PDF and send
                break;
            default:
                res.status(400).json({ error: 'Unsupported format' });
        }
    } catch (error) {
        console.error('Error exporting records:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
