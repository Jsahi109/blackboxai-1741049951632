const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Create the connection pool
const pool = mysql.createPool({
    host: 'srv864.hstgr.io',
    user: 'u596872099_vantage',
    password: 'Vantage1623',
    database: 'u596872099_vantage',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Function to execute schema.sql
async function executeSchema() {
    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');

        // Split schema into individual statements
        const statements = schema
            .split(';')
            .filter(statement => statement.trim())
            .map(statement => statement.trim() + ';');

        // Execute each statement
        for (const statement of statements) {
            await pool.execute(statement);
        }

        console.log('Successfully executed schema.sql');
    } catch (error) {
        console.error('Error executing schema:', error);
        throw error;
    }
}

// Execute schema when the module is loaded
executeSchema().catch(console.error);

module.exports = pool;
