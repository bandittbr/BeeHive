/*
  Warnings:

  - You are about to drop the `CorteChannel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CorteClip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CorteProject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CorteSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CorteSocialAccount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CorteChannel";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CorteClip";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CorteProject";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CorteSettings";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CorteSocialAccount";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "corte_channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "socialAccountIds" JSONB NOT NULL DEFAULT [],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "corte_social_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "displayName" TEXT,
    "handle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "channelIds" JSONB NOT NULL DEFAULT []
);

-- CreateTable
CREATE TABLE "corte_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourceVideoUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 15,
    "format" TEXT NOT NULL DEFAULT '9:16',
    "quantityRequested" INTEGER NOT NULL DEFAULT 3,
    "autoHighlights" BOOLEAN NOT NULL DEFAULT true,
    "autoCaptions" BOOLEAN NOT NULL DEFAULT true,
    "autoTitle" BOOLEAN NOT NULL DEFAULT true,
    "autoDescription" BOOLEAN NOT NULL DEFAULT true,
    "autoHashtags" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "channel_id" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "corte_projects_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "corte_channels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "corte_clips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL DEFAULT 0,
    "start_time" REAL NOT NULL DEFAULT 0,
    "end_time" REAL NOT NULL DEFAULT 0,
    "video_file" TEXT,
    "thumbnail_file" TEXT,
    "caption" TEXT,
    "title" TEXT,
    "description" TEXT,
    "hashtags" JSONB NOT NULL DEFAULT [],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "corte_clips_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "corte_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "corte_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subtitle_font_size" INTEGER NOT NULL DEFAULT 24,
    "subtitle_font_family" TEXT NOT NULL DEFAULT 'Arial',
    "subtitle_vertical_pos" TEXT NOT NULL DEFAULT 'bottom',
    "subtitle_max_chars" INTEGER NOT NULL DEFAULT 20,
    "subtitle_color" TEXT NOT NULL DEFAULT '#FFFFFF',
    "active_word_color" TEXT NOT NULL DEFAULT 'YELLOW',
    "active_word_size" INTEGER NOT NULL DEFAULT 110,
    "subtitle_style" TEXT NOT NULL DEFAULT 'outline',
    "line_spacing" INTEGER NOT NULL DEFAULT 120,
    "video_quality" TEXT NOT NULL DEFAULT '720p',
    "default_duration" INTEGER NOT NULL DEFAULT 15,
    "default_quantity" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "corte_social_accounts_platform_accountId_key" ON "corte_social_accounts"("platform", "accountId");
