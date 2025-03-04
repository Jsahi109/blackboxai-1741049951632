-- Master table (existing)
CREATE TABLE IF NOT EXISTS master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone1 VARCHAR(20),
    phone2 VARCHAR(20),
    phone3 VARCHAR(20),
    phone4 VARCHAR(20),
    address1 VARCHAR(255),
    address2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    region VARCHAR(100),
    zipcode VARCHAR(20),
    lat DECIMAL(10, 8),
    lon DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vendor (vendor_name),
    INDEX idx_location (city, state, region),
    INDEX idx_name (first_name, last_name),
    INDEX idx_phone (phone1, phone2, phone3, phone4)
);

-- Dispositions table
CREATE TABLE IF NOT EXISTS dispositions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    disposition_type VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    UNIQUE INDEX idx_phone_disposition (phone_number, disposition_type),
    INDEX idx_disposition_type (disposition_type),
    INDEX idx_created_at (created_at)
);

-- Downloads history table
CREATE TABLE IF NOT EXISTS downloads_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    download_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    record_count INT NOT NULL,
    filters JSON,
    created_by VARCHAR(100),
    INDEX idx_download_date (download_date),
    INDEX idx_created_by (created_by)
);

-- Disposition types lookup table
CREATE TABLE IF NOT EXISTS disposition_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active_name (is_active, name)
);

-- Insert default disposition types
INSERT IGNORE INTO disposition_types (name, description) VALUES
('DNC', 'Do Not Call'),
('Not Interested', 'Contact expressed no interest'),
('Callback', 'Contact requested callback'),
('Wrong Number', 'Incorrect phone number'),
('No Answer', 'No response received'),
('Busy', 'Line was busy'),
('Voicemail', 'Left voicemail message'),
('Completed', 'Call completed successfully'),
('Language Barrier', 'Communication issues due to language'),
('Disconnected', 'Phone number is disconnected');
