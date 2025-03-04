const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadController = require('../controllers/uploadController');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: (req, file, cb) => {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept CSV files
    if (file.mimetype === 'text/csv' || 
        file.originalname.toLowerCase().endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).single('csvFile');

// Wrap multer upload in promise
const uploadMiddleware = (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred during upload
            return res.render('index', {
                layout: 'layouts/main',
                error: `Upload error: ${err.message}`
            });
        } else if (err) {
            // An unknown error occurred
            return res.render('index', {
                layout: 'layouts/main',
                error: err.message
            });
        }
        // Upload successful, proceed to next middleware
        next();
    });
};

// Routes
router.get('/', uploadController.getUploadForm);
router.post('/upload', uploadMiddleware, uploadController.uploadFile);
router.post('/process', uploadController.processFile);

module.exports = router;
