const MasterModel = require('../models/masterModel');
const DispositionModel = require('../models/dispositionModel');

exports.getDashboard = async (req, res) => {
    try {
        // Get total records stats
        const recordStats = await MasterModel.getTotalRecords();
        
        // Get vendor stats
        const vendorStats = await MasterModel.getVendorStats();
        
        // Get disposition stats
        const dispositionStats = await DispositionModel.getDispositionStats();
        
        // Get disposition summary
        const dispositionSummary = await DispositionModel.getDispositionSummary();
        
        // Get vendor performance
        const vendorPerformance = await MasterModel.getVendorPerformance();
        
        // Get geographic distribution
        const geographicData = await MasterModel.getGeographicDistribution();

        res.render('dashboard', {
            layout: 'layouts/main',
            stats: {
                totalRecords: recordStats.count,
                duplicateRate: recordStats.count > 0 
                    ? ((recordStats.duplicates / recordStats.count) * 100).toFixed(1)
                    : 0,
                activeVendors: vendorStats.activeCount,
                dispositionsToday: dispositionStats.todayCount
            },
            dispositionSummary,
            vendorPerformance,
            geographicData,
            error: null
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render('error', {
            layout: 'layouts/main',
            message: 'Error loading dashboard',
            error: error.message
        });
    }
};

exports.getStats = async (req, res) => {
    try {
        const recordStats = await MasterModel.getTotalRecords();
        const vendorStats = await MasterModel.getVendorStats();
        const dispositionStats = await DispositionModel.getDispositionStats();

        res.json({
            totalRecords: recordStats.count,
            duplicateRate: recordStats.count > 0 
                ? ((recordStats.duplicates / recordStats.count) * 100).toFixed(1)
                : 0,
            activeVendors: vendorStats.activeCount,
            dispositionsToday: dispositionStats.todayCount,
            previousMonthRecords: recordStats.previousCount
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            error: error.message
        });
    }
};

exports.getGeographicDistribution = async (req, res) => {
    try {
        const view = req.query.view || 'region';
        const data = await MasterModel.getGeographicDistribution(view);
        res.json(data);
    } catch (error) {
        console.error('Error getting geographic distribution:', error);
        res.status(500).json({
            error: error.message
        });
    }
};

exports.getVendorPerformance = async (req, res) => {
    try {
        const data = await MasterModel.getVendorPerformance();
        res.json(data);
    } catch (error) {
        console.error('Error getting vendor performance:', error);
        res.status(500).json({
            error: error.message
        });
    }
};
