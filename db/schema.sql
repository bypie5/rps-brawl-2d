-- -----------------------------------------------------------------------------
-- Table: users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) NOT NULL, -- UUID v4 in string format
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP NOT NULL,
    `user_name` VARCHAR(80) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE (`email`),
    UNIQUE (`id`),
    UNIQUE (`user_name`)
);

-- -----------------------------------------------------------------------------
-- Table: feedback_types
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `feedback_types_enum`;

CREATE TABLE `feedback_types_enum` (
    `id` SERIAL PRIMARY KEY,
    `feedback_type` VARCHAR(10) NOT NULL -- 'bug', 'comment', or 'suggestion'
);

-- insert enum values into feedback_types_enum
INSERT INTO `feedback_types_enum` (`feedback_type`) VALUES ('bug'), ('comment'), ('suggestion');

-- -----------------------------------------------------------------------------
-- Table: feedback
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `feedback` (
    `id` VARCHAR(36) NOT NULL, -- UUID v4 in string format
    `feedback_type_id` INTEGER NOT NULL REFERENCES `feedback_types_enum`(`id`),
    `message_content` TEXT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
