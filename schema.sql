-- Database creation script for Medico Emergency Finder

CREATE DATABASE IF NOT EXISTS medico_db;
USE medico_db;

-- 1. Table Structures
CREATE TABLE IF NOT EXISTS Hospitals (
    hospital_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    address TEXT NOT NULL,
    contact_number VARCHAR(20),
    accepts_insurance BOOLEAN DEFAULT FALSE,
    available_beds INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Equipment (
    equipment_id INT PRIMARY KEY AUTO_INCREMENT,
    equipment_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Services (
    service_id INT PRIMARY KEY AUTO_INCREMENT,
    service_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Hospital_Equipment (
    hospital_id INT,
    equipment_id INT,
    PRIMARY KEY (hospital_id, equipment_id),
    FOREIGN KEY (hospital_id) REFERENCES Hospitals(hospital_id),
    FOREIGN KEY (equipment_id) REFERENCES Equipment(equipment_id)
);

CREATE TABLE IF NOT EXISTS Hospital_Services (
    hospital_id INT,
    service_id INT,
    PRIMARY KEY (hospital_id, service_id),
    FOREIGN KEY (hospital_id) REFERENCES Hospitals(hospital_id),
    FOREIGN KEY (service_id) REFERENCES Services(service_id)
);

CREATE TABLE IF NOT EXISTS Doctors (
    doctor_id INT PRIMARY KEY AUTO_INCREMENT,
    hospital_id INT,
    full_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    available_days VARCHAR(100),
    working_hours VARCHAR(100),
    FOREIGN KEY (hospital_id) REFERENCES Hospitals(hospital_id)
);

-- 2. Seed Data Injection
INSERT INTO Hospitals (hospital_id, name, type, latitude, longitude, address, contact_number, accepts_insurance, available_beds) VALUES
(1, 'Sub District Hospital Panvel', 'Government', 18.9890, 73.1170, 'Old Panvel, Navi Mumbai', '022-27452345', FALSE, 12),
(2, 'MGM Hospital & Research Centre', 'Private', 19.0180, 73.1040, 'Kamothe, Navi Mumbai', '022-27437900', TRUE, 28),
(3, 'Lifeline Hospital Panvel', 'Private', 18.9860, 73.1230, 'Near Station, Panvel', '022-27464000', TRUE, 8);

INSERT INTO Equipment (equipment_id, equipment_name) VALUES 
(1, 'X-Ray'), (2, 'CT Scan'), (3, 'MRI Machine');

INSERT INTO Services (service_id, service_name) VALUES 
(1, 'Blood Test'), (2, 'ECG'), (3, 'Ultrasound');

INSERT INTO Hospital_Equipment (hospital_id, equipment_id) VALUES 
(1, 1), (2, 1), (2, 2), (2, 3), (3, 1), (3, 2);

INSERT INTO Hospital_Services (hospital_id, service_id) VALUES 
(1, 1), (1, 2), (1, 3),
(2, 1), (2, 2), (2, 3),
(3, 1), (3, 2), (3, 3);

INSERT INTO Doctors (hospital_id, full_name, specialty, available_days, working_hours) VALUES
(1, 'Dr. Rajesh Patil', 'General Physician', 'Mon - Sat', '09:00 AM - 02:00 PM'),
(2, 'Dr. Ananya Sharma', 'Cardiologist', 'Mon, Wed, Fri', '10:00 AM - 04:00 PM'),
(2, 'Dr. Suresh Mehta', 'Radiologist', 'Tue, Thu, Sat', '11:00 AM - 05:00 PM'),
(3, 'Dr. Priya Nair', 'Pediatrician', 'Mon - Fri', '04:00 PM - 08:00 PM');