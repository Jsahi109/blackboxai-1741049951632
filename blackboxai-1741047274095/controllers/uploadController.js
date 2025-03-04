const csv = require('csv-parser');
const fs = require('fs');
const vendorModel = require('../models/vendorModel');
const masterModel = require('../models/masterModel');
const db = require('../config/db');

exports.handleUpload = async (req, res) => {
  const vendorName = req.body.vendorName;
  const results = [];
  const headers = [];

  // Check if the file exists
  if (!req.file) {
    res.status(400).send('No file uploaded.');
    return;
  }

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => {
      // Capture headers
      if (headers.length === 0) {
        headers.push(...Object.keys(data));
      }
      results.push(data);
    })
    .on('end', async () => {
      try {
        // Retrieve database schema
        const [columns] = await db.execute('SHOW COLUMNS FROM master');
        const columnNames = columns
          .map(col => col.Field)
          .filter(field => field !== 'id'); // Exclude id field from mapping

        // Render mapping interface with headers and column names
        res.render('mapFields', { 
          headers, 
          columnNames, 
          vendorName, 
          results: results.slice(0, 5), // Send first 5 rows as preview
          filePath: req.file.path // Pass the file path to the template
        });
      } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Error retrieving database structure.');
      }
    })
    .on('error', (error) => {
      console.error('File processing error:', error);
      res.status(500).send('Error processing the file.');
    });
};

exports.processMapping = async (req, res) => {
  try {
    const { mapping, vendorName, filePath } = req.body;
    const results = [];

    // Create vendor if not exists
    await vendorModel.createVendor(vendorName).catch(() => {
      // Ignore error if vendor already exists
    });

    // Process CSV with mappings
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          const mappedRecord = {};
          // Apply field mapping
          Object.entries(mapping).forEach(([dbField, csvField]) => {
            mappedRecord[dbField] = data[csvField] || null;
          });
          mappedRecord.vendor_name = vendorName;
          results.push(mappedRecord);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert records into master table
    for (const record of results) {
      await masterModel.insertMasterRecord(record, vendorName);
    }

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    res.json({ 
      success: true, 
      message: `Successfully processed ${results.length} records` 
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing the mapping' 
    });
  }
};
