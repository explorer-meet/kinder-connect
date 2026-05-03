/*
  Warnings:

  - You are about to drop the column `classId` on the `activitylog` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `classIds` on the `circular` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `incidentreport` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `milestone` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `ptmbooking` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `report` table. All the data in the column will be lost.
  - You are about to drop the column `adminId` on the `school` table. All the data in the column will be lost.
  - You are about to drop the column `allergies` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `authorizedPickup` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `medicalNotes` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `user` table. All the data in the column will be lost.
  - The values [admin] on the enum `User_role` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[schoolId,name,section]` on the table `Class` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `batchId` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchId` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchId` to the `IncidentReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchId` to the `Milestone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchId` to the `PTMBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchId` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchId` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `class` DROP FOREIGN KEY `Class_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `student` DROP FOREIGN KEY `Student_classId_fkey`;

-- DropForeignKey
ALTER TABLE `student` DROP FOREIGN KEY `Student_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_classId_fkey`;

-- AlterTable
ALTER TABLE `activitylog` DROP COLUMN `classId`,
    ADD COLUMN `batchId` VARCHAR(191) NOT NULL,
    MODIFY `notes` TEXT NULL,
    MODIFY `moodNotes` TEXT NULL,
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `attendance` DROP COLUMN `classId`,
    ADD COLUMN `batchId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `circular` DROP COLUMN `classIds`,
    ADD COLUMN `batchIds` JSON NULL,
    MODIFY `schoolId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `incidentreport` DROP COLUMN `classId`,
    ADD COLUMN `batchId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `milestone` DROP COLUMN `classId`,
    ADD COLUMN `batchId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `ptmbooking` DROP COLUMN `classId`,
    ADD COLUMN `batchId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `report` DROP COLUMN `classId`,
    ADD COLUMN `batchId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `school` DROP COLUMN `adminId`,
    ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `schoolAdminId` VARCHAR(191) NULL,
    ADD COLUMN `website` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `student` DROP COLUMN `allergies`,
    DROP COLUMN `authorizedPickup`,
    DROP COLUMN `medicalNotes`,
    ADD COLUMN `batchId` VARCHAR(191) NOT NULL,
    ADD COLUMN `documents` JSON NULL,
    ADD COLUMN `fatherFirstName` VARCHAR(191) NULL,
    ADD COLUMN `fatherLastName` VARCHAR(191) NULL,
    ADD COLUMN `guardianFirstName` VARCHAR(191) NULL,
    ADD COLUMN `guardianLastName` VARCHAR(191) NULL,
    ADD COLUMN `motherFirstName` VARCHAR(191) NULL,
    ADD COLUMN `motherLastName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `classId`,
    ADD COLUMN `parentChildIds` JSON NULL,
    MODIFY `role` ENUM('super_admin', 'school_admin', 'teacher', 'parent') NOT NULL;

-- CreateTable
CREATE TABLE `Batch` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `shiftName` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Batch_classId_shiftName_key`(`classId`, `shiftName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PickupRequest` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `personName` VARCHAR(191) NOT NULL,
    `mobileNumber` VARCHAR(191) NOT NULL,
    `photoUrl` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `adminNotes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Class_schoolId_name_section_key` ON `Class`(`schoolId`, `name`, `section`);

-- AddForeignKey
ALTER TABLE `Class` ADD CONSTRAINT `Class_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Batch` ADD CONSTRAINT `Batch_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Batch` ADD CONSTRAINT `Batch_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PickupRequest` ADD CONSTRAINT `PickupRequest_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
