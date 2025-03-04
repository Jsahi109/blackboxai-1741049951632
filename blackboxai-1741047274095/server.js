const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const uploadRouter = require('./routes/upload');
const dashboardRouter = require('./routes/dashboard');
const db = require('./config/db');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        layout: 'layouts/main',
        error: null
    });
});

app.use('/', uploadRouter);
app.use('/', dashboardRouter);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
