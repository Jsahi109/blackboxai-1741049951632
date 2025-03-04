const db = require('../config/db');

exports.insertMasterRecord = async (record, vendorName) => {
  await db.execute('INSERT INTO master (first_name, last_name, phone1, phone2, phone3, phone4, address1, address2, lon, lat, vendor_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
    [record.first_name, record.last_name, record.phone1, record.phone2, record.phone3, record.phone4, record.address1, record.address2, record.lon, record.lat, vendorName]);
};
