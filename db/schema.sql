-- -----------------------------------------------------------------------------
-- Table: users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL, -- UUID v4 in string format
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    user_name VARCHAR(80) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (email),
    UNIQUE (id),
    UNIQUE (user_name)
);
