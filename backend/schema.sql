-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    login_id VARCHAR(191) NOT NULL UNIQUE, -- 191 for compatibility with some utf8mb4 defaults
    password_hash VARCHAR(255) NOT NULL,
    age INT,
    gender VARCHAR(50),
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    target_weight DECIMAL(5,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Weight Records
CREATE TABLE IF NOT EXISTS weight_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login_id VARCHAR(191) NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    record_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (login_id) REFERENCES users(login_id) ON DELETE CASCADE
);

-- Meal Records
CREATE TABLE IF NOT EXISTS meal_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login_id VARCHAR(191) NOT NULL,
    meal_name VARCHAR(255) NOT NULL,
    calories INT NOT NULL,
    meal_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (login_id) REFERENCES users(login_id) ON DELETE CASCADE
);

-- Exercise Records
CREATE TABLE IF NOT EXISTS exercise_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login_id VARCHAR(191) NOT NULL,
    exercise_name VARCHAR(255) NOT NULL,
    duration INT NOT NULL, -- minutes
    calories_burned INT NOT NULL,
    exercise_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (login_id) REFERENCES users(login_id) ON DELETE CASCADE
);
