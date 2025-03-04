const db = require('../config/db');

class DispositionModel {
    static async getDispositionTypes() {
        try {
            const [types] = await db.execute(
                'SELECT * FROM disposition_types WHERE is_active = TRUE ORDER BY name'
            );
            return types;
        } catch (error) {
            console.error('Error getting disposition types:', error);
            throw error;
        }
    }

    static async addDispositions(dispositions, createdBy) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Prepare the query for inserting/updating dispositions
            const query = `
                INSERT INTO dispositions (phone_number, disposition_type, notes, created_by)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    disposition_type = VALUES(disposition_type),
                    notes = VALUES(notes),
                    updated_at = CURRENT_TIMESTAMP
            `;

            // Process each disposition
            for (const disp of dispositions) {
                await connection.execute(query, [
                    disp.phone_number,
                    disp.disposition_type,
                    disp.notes || null,
                    createdBy
                ]);
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Error adding dispositions:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getDispositionsForPhones(phoneNumbers) {
        try {
            // Convert array to string of comma-separated values
            const phoneList = phoneNumbers.map(num => `'${num}'`).join(',');
            
            const [dispositions] = await db.execute(
                `SELECT * FROM dispositions WHERE phone_number IN (${phoneList})`
            );
            return dispositions;
        } catch (error) {
            console.error('Error getting dispositions for phones:', error);
            throw error;
        }
    }

    static async deleteDispositions(phoneNumbers) {
        try {
            // Convert array to string of comma-separated values
            const phoneList = phoneNumbers.map(num => `'${num}'`).join(',');
            
            const [result] = await db.execute(
                `DELETE FROM dispositions WHERE phone_number IN (${phoneList})`
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error deleting dispositions:', error);
            throw error;
        }
    }

    static async getDispositionStats() {
        try {
            const [stats] = await db.execute(`
                SELECT 
                    d.disposition_type,
                    dt.description,
                    COUNT(*) as count,
                    MAX(d.created_at) as last_updated
                FROM dispositions d
                JOIN disposition_types dt ON d.disposition_type = dt.name
                GROUP BY d.disposition_type, dt.description
                ORDER BY count DESC
            `);
            return stats;
        } catch (error) {
            console.error('Error getting disposition stats:', error);
            throw error;
        }
    }

    static async validatePhoneNumbers(phoneNumbers) {
        try {
            // Convert array to string of comma-separated values
            const phoneList = phoneNumbers.map(num => `'${num}'`).join(',');
            
            const [existing] = await db.execute(`
                SELECT DISTINCT 
                    phone_number, 
                    disposition_type, 
                    created_at
                FROM dispositions 
                WHERE phone_number IN (${phoneList})
                ORDER BY created_at DESC
            `);
            return existing;
        } catch (error) {
            console.error('Error validating phone numbers:', error);
            throw error;
        }
    }
}

module.exports = DispositionModel;
