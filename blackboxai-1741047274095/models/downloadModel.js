const db = require('../config/db');

class DownloadModel {
    static async createDownloadRecord(fileName, recordCount, filters, createdBy) {
        try {
            const [result] = await db.execute(
                `INSERT INTO downloads_history 
                (file_name, record_count, filters, created_by) 
                VALUES (?, ?, ?, ?)`,
                [fileName, recordCount, JSON.stringify(filters), createdBy]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating download record:', error);
            throw error;
        }
    }

    static async getDownloadHistory(limit = 10) {
        try {
            const [history] = await db.execute(
                `SELECT * FROM downloads_history 
                ORDER BY download_date DESC 
                LIMIT ?`,
                [limit]
            );
            return history.map(record => ({
                ...record,
                filters: JSON.parse(record.filters)
            }));
        } catch (error) {
            console.error('Error getting download history:', error);
            throw error;
        }
    }

    static async getFilteredData({
        zipCodes = [],
        includeDispositions = [],
        excludeDispositions = [],
        startDate,
        endDate
    }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            let query = `
                SELECT DISTINCT m.*
                FROM master m
                LEFT JOIN dispositions d ON (
                    m.phone1 = d.phone_number OR
                    m.phone2 = d.phone_number OR
                    m.phone3 = d.phone_number OR
                    m.phone4 = d.phone_number
                )
                WHERE 1=1
            `;
            const params = [];

            // Add ZIP code filter
            if (zipCodes.length > 0) {
                query += ' AND m.zipcode IN (?)';
                params.push(zipCodes);
            }

            // Add date range filter
            if (startDate) {
                query += ' AND m.created_at >= ?';
                params.push(startDate);
            }
            if (endDate) {
                query += ' AND m.created_at <= ?';
                params.push(endDate);
            }

            // Add disposition filters
            if (includeDispositions.length > 0) {
                query += ' AND d.disposition_type IN (?)';
                params.push(includeDispositions);
            } else if (excludeDispositions.length > 0) {
                query += ` AND (
                    d.disposition_type IS NULL OR 
                    d.disposition_type NOT IN (?)
                )`;
                params.push(excludeDispositions);
            }

            // Execute query
            const [records] = await connection.execute(query, params);
            await connection.commit();

            return records;
        } catch (error) {
            await connection.rollback();
            console.error('Error getting filtered data:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getDownloadById(id) {
        try {
            const [records] = await db.execute(
                'SELECT * FROM downloads_history WHERE id = ?',
                [id]
            );
            if (records.length === 0) {
                return null;
            }
            const record = records[0];
            record.filters = JSON.parse(record.filters);
            return record;
        } catch (error) {
            console.error('Error getting download by id:', error);
            throw error;
        }
    }

    static async deleteDownload(id) {
        try {
            const [result] = await db.execute(
                'DELETE FROM downloads_history WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting download:', error);
            throw error;
        }
    }
}

module.exports = DownloadModel;
