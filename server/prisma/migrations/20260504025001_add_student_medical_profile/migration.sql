-- AlterTable
ALTER TABLE `student` ADD COLUMN `allergies` JSON NULL,
    ADD COLUMN `authorizedPickup` JSON NULL,
    ADD COLUMN `medicalNotes` TEXT NULL,
    ADD COLUMN `medicalProfile` JSON NULL;
