const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs').promises;
const db = require('./config/db');

// Import routes
const uploadRouter = require('./routes/upload');
const dashboardRouter = require('./routes/dashboard');
const downloadRouter = require('./routes/download');
const dispositionsRouter = require('./routes/dispositions');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Add path to all views
app.use((req, res, next) => {
    res.locals.path = req.path;
    next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Mount routes
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

app.use('/dashboard', dashboardRouter);
app.use('/upload', uploadRouter);
app.use('/download', downloadRouter);
app.use('/dispositions', dispositionsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', {
        layout: 'layouts/main',
        message: 'Something broke!',
        error: err.message || err
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).render('error', {
        layout: 'layouts/main',
        message: 'Page not found',
        error: 'The requested page does not exist'
    });
});

// Initialize database
async function initializeDatabase() {
    try {
        // Drop tables
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        await db.execute('DROP TABLE IF EXISTS dispositions');
        await db.execute('DROP TABLE IF EXISTS disposition_types');
        await db.execute('DROP TABLE IF EXISTS downloads_history');
        await db.execute('DROP TABLE IF EXISTS uploaded_files');
        await db.execute('DROP TABLE IF EXISTS master');
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');

        // Create master table
        await db.execute(`
            CREATE TABLE master (
                id INT AUTO_INCREMENT PRIMARY KEY,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                email VARCHAR(255),
                phone1 VARCHAR(20),
                phone2 VARCHAR(20),
                phone3 VARCHAR(20),
                phone4 VARCHAR(20),
                address1 VARCHAR(255),
                address2 VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(50),
                county VARCHAR(100),
                region VARCHAR(100),
                zipcode VARCHAR(20),
                lat DECIMAL(10,8),
                lon DECIMAL(11,8),
                vendor_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_phone1 (phone1),
                INDEX idx_phone2 (phone2),
                INDEX idx_phone3 (phone3),
                INDEX idx_phone4 (phone4),
                INDEX idx_zipcode (zipcode),
                INDEX idx_city (city),
                INDEX idx_county (county),
                INDEX idx_region (region),
                INDEX idx_vendor (vendor_name)
            )
        `);

        // Create disposition_types table
        await db.execute(`
            CREATE TABLE disposition_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create dispositions table
        await db.execute(`
            CREATE TABLE dispositions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                disposition_type VARCHAR(50) NOT NULL,
                notes TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (disposition_type) REFERENCES disposition_types(name),
                UNIQUE KEY unique_phone_disposition (phone_number)
            )
        `);

        // Create downloads_history table
        await db.execute(`
            CREATE TABLE downloads_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                file_name VARCHAR(255) NOT NULL,
                record_count INT NOT NULL,
                filters JSON,
                created_by VARCHAR(100),
                download_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create uploaded_files table
        await db.execute(`
            CREATE TABLE uploaded_files (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                vendor_name VARCHAR(100) NOT NULL,
                total_records INT NOT NULL DEFAULT 0,
                duplicates_count INT NOT NULL DEFAULT 0,
                successful_records INT NOT NULL DEFAULT 0,
                failed_records INT NOT NULL DEFAULT 0,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
                error_message TEXT,
                uploaded_by VARCHAR(100),
                file_path VARCHAR(255),
                original_filename VARCHAR(255),
                file_size BIGINT,
                headers JSON,
                mapping JSON,
                INDEX idx_vendor (vendor_name),
                INDEX idx_status (status),
                INDEX idx_upload_date (upload_date)
            )
        `);

        // Insert default disposition types
        await db.execute(`
            INSERT IGNORE INTO disposition_types (name, description) VALUES
            ('DNC', 'Do Not Call'),
            ('Callback', 'Contact requested callback'),
            ('Completed', 'Call completed successfully'),
            ('Disconnected', 'Phone number disconnected'),
            ('Language Barrier', 'Unable to communicate due to language'),
            ('No Answer', 'No answer after multiple attempts'),
            ('Not Interested', 'Contact not interested'),
            ('Voicemail', 'Left voicemail message'),
            ('Wrong Number', 'Incorrect phone number'),
            ('Busy', 'Line busy')
        `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    await initializeDatabase();
});
