const db = require('../config/db');

class MasterModel {
    static async insertMasterRecord(record, vendorName) {
        try {
            const [result] = await db.execute(
                `INSERT INTO master (
                    first_name, last_name, phone1, phone2, phone3, phone4,
                    address1, address2, city, state, county, region, zipcode,
                    lat, lon, vendor_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.first_name || null,
                    record.last_name || null,
                    record.phone1 || null,
                    record.phone2 || null,
                    record.phone3 || null,
                    record.phone4 || null,
                    record.address1 || null,
                    record.address2 || null,
                    record.city || null,
                    record.state || null,
                    record.county || null,
                    record.region || null,
                    record.zipcode || null,
                    record.lat || null,
                    record.lon || null,
                    vendorName
                ]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error inserting master record:', error);
            throw error;
        }
    }

    static async checkDuplicatePhones(phoneNumbers) {
        try {
            if (!phoneNumbers || phoneNumbers.length === 0) {
                return [];
            }

            const placeholders = phoneNumbers.map(() => '?').join(',');
            const query = `
                SELECT DISTINCT phone_number
                FROM (
                    SELECT phone1 as phone_number FROM master WHERE phone1 IN (${placeholders})
                    UNION
                    SELECT phone2 FROM master WHERE phone2 IN (${placeholders})
                    UNION
                    SELECT phone3 FROM master WHERE phone3 IN (${placeholders})
                    UNION
                    SELECT phone4 FROM master WHERE phone4 IN (${placeholders})
                ) AS phones
                WHERE phone_number IS NOT NULL
            `;

            // Repeat phone numbers array 4 times for each subquery
            const params = [...phoneNumbers, ...phoneNumbers, ...phoneNumbers, ...phoneNumbers];
            const [results] = await db.execute(query, params);
            
            return results.map(row => row.phone_number);
        } catch (error) {
            console.error('Error checking duplicate phones:', error);
            throw error;
        }
    }

    static async createUploadRecord({
        filename,
        original_filename,
        vendor_name,
        file_size,
        file_path,
        uploaded_by
    }) {
        try {
            const [result] = await db.execute(
                `INSERT INTO uploaded_files (
                    filename,
                    original_filename,
                    vendor_name,
                    file_size,
                    file_path,
                    uploaded_by,
                    total_records,
                    duplicates_count,
                    successful_records,
                    failed_records,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 'processing')`,
                [filename, original_filename, vendor_name, file_size, file_path, uploaded_by]
            );
            
            const [record] = await db.execute(
                'SELECT * FROM uploaded_files WHERE id = ?',
                [result.insertId]
            );
            
            return record[0];
        } catch (error) {
            console.error('Error creating upload record:', error);
            throw error;
        }
    }

    static async updateUploadRecord(id, updates) {
        try {
            const setClause = [];
            const values = [];

            // Build SET clause and values array
            for (const [key, value] of Object.entries(updates)) {
                setClause.push(`${key} = ?`);
                values.push(value);
            }

            // Add id as the last parameter
            values.push(id);

            const query = `UPDATE uploaded_files SET ${setClause.join(', ')} WHERE id = ?`;
            const [result] = await db.execute(query, values);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating upload record:', error);
            throw error;
        }
    }

    static async getUploadById(id) {
        try {
            const [records] = await db.execute(
                'SELECT * FROM uploaded_files WHERE id = ?',
                [id]
            );
            
            if (records.length === 0) {
                return null;
            }

            const record = records[0];
            if (record.headers) {
                record.headers = JSON.parse(record.headers);
            }
            if (record.mapping) {
                record.mapping = JSON.parse(record.mapping);
            }
            
            return record;
        } catch (error) {
            console.error('Error getting upload by id:', error);
            throw error;
        }
    }

    static async getRecentUploads(limit = 10) {
        try {
            const [uploads] = await db.execute(
                `SELECT * FROM uploaded_files 
                ORDER BY upload_date DESC 
                LIMIT ?`,
                [limit]
            );
            
            return uploads.map(upload => ({
                ...upload,
                headers: JSON.parse(upload.headers || '[]'),
                mapping: JSON.parse(upload.mapping || '{}')
            }));
        } catch (error) {
            console.error('Error getting recent uploads:', error);
            throw error;
        }
    }

    static async deleteUpload(id) {
        try {
            const [result] = await db.execute(
                'DELETE FROM uploaded_files WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting upload:', error);
            throw error;
        }
    }

    static async getColumnNames() {
        try {
            const [columns] = await db.execute(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'master'
                AND TABLE_SCHEMA = DATABASE()
                AND COLUMN_NAME NOT IN ('id', 'created_at', 'updated_at', 'vendor_name')
                ORDER BY ORDINAL_POSITION
            `);
            return columns.map(col => col.COLUMN_NAME);
        } catch (error) {
            console.error('Error getting column names:', error);
            throw error;
        }
    }

    static async getUniqueVendors() {
        try {
            const [vendors] = await db.execute(`
                SELECT DISTINCT vendor_name 
                FROM master 
                WHERE vendor_name IS NOT NULL 
                ORDER BY vendor_name
            `);
            return vendors.map(v => v.vendor_name);
        } catch (error) {
            console.error('Error getting unique vendors:', error);
            throw error;
        }
    }

    static async getGeographicData() {
        try {
            const [data] = await db.execute(`
                SELECT 
                    DISTINCT zipcode, city, county, region
                FROM master 
                WHERE zipcode IS NOT NULL 
                   OR city IS NOT NULL 
                   OR county IS NOT NULL 
                   OR region IS NOT NULL
                ORDER BY region, county, city, zipcode
            `);
            return {
                zipCodes: [...new Set(data.map(d => d.zipcode).filter(Boolean))],
                cities: [...new Set(data.map(d => d.city).filter(Boolean))],
                counties: [...new Set(data.map(d => d.county).filter(Boolean))],
                regions: [...new Set(data.map(d => d.region).filter(Boolean))]
            };
        } catch (error) {
            console.error('Error getting geographic data:', error);
            throw error;
        }
    }
}

module.exports = MasterModel;
