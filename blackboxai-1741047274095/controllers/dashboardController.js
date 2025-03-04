const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    try {
        // Get total records count
        const [totalRecords] = await db.execute('SELECT COUNT(*) as count FROM master');
        
        // Get records by vendor
        const [vendorStats] = await db.execute(`
            SELECT vendor_name, COUNT(*) as count 
            FROM master 
            GROUP BY vendor_name 
            ORDER BY count DESC
        `);

        // Get recent uploads
        const [recentUploads] = await db.execute(`
            SELECT vendor_name, COUNT(*) as count
            FROM master
            GROUP BY vendor_name
        `);

        // Get data quality metrics
        const [dataQuality] = await db.execute(`
            SELECT 
                SUM(CASE WHEN phone1 IS NOT NULL AND phone1 != '' THEN 1 ELSE 0 END) as valid_phone,
                SUM(CASE WHEN address1 IS NOT NULL AND address1 != '' THEN 1 ELSE 0 END) as valid_address,
                SUM(CASE WHEN city IS NOT NULL AND city != '' THEN 1 ELSE 0 END) as valid_city,
                SUM(CASE WHEN state IS NOT NULL AND state != '' THEN 1 ELSE 0 END) as valid_state,
                SUM(CASE WHEN zipcode IS NOT NULL AND zipcode != '' THEN 1 ELSE 0 END) as valid_zipcode,
                COUNT(*) as total
            FROM master
        `);

        // Calculate percentages for data quality
        const qualityMetrics = {
            phoneCompleteness: ((dataQuality[0].valid_phone / dataQuality[0].total) * 100).toFixed(1),
            addressCompleteness: ((dataQuality[0].valid_address / dataQuality[0].total) * 100).toFixed(1),
            cityCompleteness: ((dataQuality[0].valid_city / dataQuality[0].total) * 100).toFixed(1),
            stateCompleteness: ((dataQuality[0].valid_state / dataQuality[0].total) * 100).toFixed(1),
            zipcodeCompleteness: ((dataQuality[0].valid_zipcode / dataQuality[0].total) * 100).toFixed(1)
        };

        // Get geographic distribution
        const [geoData] = await db.execute(`
            SELECT lat, lon, COUNT(*) as count
            FROM master
            WHERE lat IS NOT NULL AND lon IS NOT NULL
            GROUP BY lat, lon
        `);

        // Get state distribution
        const [stateData] = await db.execute(`
            SELECT state, COUNT(*) as count
            FROM master
            WHERE state IS NOT NULL AND state != ''
            GROUP BY state
            ORDER BY count DESC
        `);

        // Get region distribution
        const [regionData] = await db.execute(`
            SELECT region, COUNT(*) as count
            FROM master
            WHERE region IS NOT NULL AND region != ''
            GROUP BY region
            ORDER BY count DESC
        `);

        // Prepare chart data
        const chartData = {
            vendors: vendorStats.map(v => ({ name: v.vendor_name, count: v.count })),
            uploads: recentUploads.reduce((acc, curr) => {
                if (!acc[curr.vendor_name]) acc[curr.vendor_name] = 0;
                acc[curr.vendor_name] += curr.count;
                return acc;
            }, {}),
            states: stateData.map(s => ({ name: s.state, count: s.count })),
            regions: regionData.map(r => ({ name: r.region, count: r.count }))
        };

        res.render('dashboard', {
            layout: 'layouts/main',
            stats: {
                totalRecords: totalRecords[0].count,
                vendorStats,
                recentUploads,
                qualityMetrics,
                geoData,
                chartData,
                stateData,
                regionData
            }
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        res.status(500).render('error', {
            message: 'Error loading dashboard',
            error: error.message
        });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        // Get vendor performance metrics
        const [vendorMetrics] = await db.execute(`
            SELECT 
                vendor_name,
                COUNT(*) as total_records,
                SUM(CASE WHEN phone1 IS NOT NULL AND phone1 != '' THEN 1 ELSE 0 END) as valid_phone,
                SUM(CASE WHEN address1 IS NOT NULL AND address1 != '' THEN 1 ELSE 0 END) as valid_address,
                SUM(CASE WHEN city IS NOT NULL AND city != '' THEN 1 ELSE 0 END) as valid_city,
                SUM(CASE WHEN state IS NOT NULL AND state != '' THEN 1 ELSE 0 END) as valid_state,
                SUM(CASE WHEN zipcode IS NOT NULL AND zipcode != '' THEN 1 ELSE 0 END) as valid_zipcode
            FROM master
            GROUP BY vendor_name
        `);

        res.render('analytics', {
            layout: 'layouts/main',
            analytics: {
                monthlyTrends: [],  // We'll add this feature later
                vendorMetrics
            }
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).render('error', {
            message: 'Error loading analytics',
            error: error.message
        });
    }
};

exports.getRecords = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const vendor = req.query.vendor || '';
        const region = req.query.region || '';
        const state = req.query.state || '';

        // Build query with filters
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

        // Add pagination
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        // Get records with pagination
        const [records] = await db.execute(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as count FROM master WHERE 1=1';
        const countParams = [];

        if (search) {
            countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone1 LIKE ? OR address1 LIKE ?)';
            const searchParam = `%${search}%`;
            countParams.push(searchParam, searchParam, searchParam, searchParam);
        }
        if (vendor) {
            countQuery += ' AND vendor_name = ?';
            countParams.push(vendor);
        }
        if (region) {
            countQuery += ' AND region = ?';
            countParams.push(region);
        }
        if (state) {
            countQuery += ' AND state = ?';
            countParams.push(state);
        }

        const [totalCount] = await db.execute(countQuery, countParams);

        res.render('records', {
            layout: 'layouts/main',
            records,
            pagination: {
                current: page,
                total: Math.ceil(totalCount[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Records Error:', error);
        res.status(500).render('error', {
            message: 'Error loading records',
            error: error.message
        });
    }
};
