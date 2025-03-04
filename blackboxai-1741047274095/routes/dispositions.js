const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const dispositionController = require('../controllers/dispositionController');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV files are allowed'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Routes
router.get('/dispositions', dispositionController.getDispositionForm);
router.post('/dispositions/upload', upload.single('csvFile'), dispositionController.uploadDispositions);
router.delete('/dispositions', dispositionController.deleteDispositions);
router.get('/dispositions/stats', dispositionController.getDispositionStats);

module.exports = router;
