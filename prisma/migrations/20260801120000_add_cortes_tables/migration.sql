-- CreateTable
CREATE TABLE "CorteChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "socialAccountIds" TEXT[],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CorteSocialAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "displayName" TEXT,
    "handle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "channelIds" TEXT[],
    CONSTRAINT "CorteSocialAccount_platform_accountId_key" UNIQUE ("platform", "accountId")
);

-- CreateTable
CREATE TABLE "CorteProject" (
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
    CONSTRAINT "CorteProject_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "CorteChannel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorteClip" (
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
    "hashtags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "CorteClip_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "CorteProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subtitleFontSize" INTEGER NOT NULL DEFAULT 24,
    "subtitleFontFamily" TEXT NOT NULL DEFAULT 'Arial',
    "subtitleVerticalPos" TEXT NOT NULL DEFAULT 'bottom',
    "subtitleMaxChars" INTEGER NOT NULL DEFAULT 20,
    "subtitleColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "activeWordColor" TEXT NOT NULL DEFAULT 'YELLOW',
    "activeWordSize" INTEGER NOT NULL DEFAULT 110,
    "subtitleStyle" TEXT NOT NULL DEFAULT 'outline',
    "lineSpacing" INTEGER NOT NULL DEFAULT 120,
    "videoQuality" TEXT NOT NULL DEFAULT '720p',
    "defaultDuration" INTEGER NOT NULL DEFAULT 15,
    "defaultQuantity" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
