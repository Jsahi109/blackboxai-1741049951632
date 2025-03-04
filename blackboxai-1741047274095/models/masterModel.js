const db = require('../config/db');

class MasterModel {
    static async getColumnNames() {
        try {
            // Return a static list of column names since we know our schema
            return [
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
            ];
        } catch (error) {
            console.error('Error getting column names:', error);
            throw error;
        }
    }

    static async insertMasterRecord(record, vendorName) {
        try {
            const columns = Object.keys(record);
            const values = Object.values(record);
            
            // Add vendor_name to columns and values
            columns.push('vendor_name');
            values.push(vendorName);

            // Create placeholders array with the correct number of question marks
            const placeholders = new Array(values.length).fill('?').join(', ');

            // Build the SQL query with proper spacing
            const query = `
                INSERT INTO master (${columns.join(', ')})
                VALUES (${placeholders})
            `;

            console.log('SQL Query:', query); // Debug log
            console.log('Values:', values); // Debug log

            const [result] = await db.execute(query, values);
            return result.insertId;
        } catch (error) {
            console.error('Error inserting record:', error);
            throw error;
        }
    }

    static async getMasterRecords(page = 1, limit = 10, filters = {}) {
        try {
            let query = 'SELECT * FROM master WHERE 1=1';
            const params = [];

            // Add filters
            if (filters.search) {
                query += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone1 LIKE ? OR address1 LIKE ?)';
                const searchParam = `%${filters.search}%`;
                params.push(searchParam, searchParam, searchParam, searchParam);
            }
            if (filters.vendor) {
                query += ' AND vendor_name = ?';
                params.push(filters.vendor);
            }
            if (filters.region) {
                query += ' AND region = ?';
                params.push(filters.region);
            }
            if (filters.state) {
                query += ' AND state = ?';
                params.push(filters.state);
            }

            // Add pagination
            const offset = (page - 1) * limit;
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [records] = await db.execute(query, params);
            return records;
        } catch (error) {
            console.error('Error getting records:', error);
            throw error;
        }
    }

    static async getTotalRecords(filters = {}) {
        try {
            let query = 'SELECT COUNT(*) as count FROM master WHERE 1=1';
            const params = [];

            // Add filters
            if (filters.search) {
                query += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone1 LIKE ? OR address1 LIKE ?)';
                const searchParam = `%${filters.search}%`;
                params.push(searchParam, searchParam, searchParam, searchParam);
            }
            if (filters.vendor) {
                query += ' AND vendor_name = ?';
                params.push(filters.vendor);
            }
            if (filters.region) {
                query += ' AND region = ?';
                params.push(filters.region);
            }
            if (filters.state) {
                query += ' AND state = ?';
                params.push(filters.state);
            }

            const [result] = await db.execute(query, params);
            return result[0].count;
        } catch (error) {
            console.error('Error getting total records:', error);
            throw error;
        }
    }

    static async getRecordById(id) {
        try {
            const [records] = await db.execute('SELECT * FROM master WHERE id = ?', [id]);
            return records[0];
        } catch (error) {
            console.error('Error getting record by id:', error);
            throw error;
        }
    }

    static async deleteRecord(id) {
        try {
            await db.execute('DELETE FROM master WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Error deleting record:', error);
            throw error;
        }
    }
}

module.exports = MasterModel;
