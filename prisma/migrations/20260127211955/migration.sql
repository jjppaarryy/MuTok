-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TikTokAuth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "scopes" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "energy" INTEGER NOT NULL,
    "motion" TEXT NOT NULL,
    "sync" TEXT NOT NULL,
    "vibe" TEXT NOT NULL,
    "durationSec" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bpm" INTEGER,
    "key" TEXT,
    "durationSec" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Snippet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT NOT NULL,
    "startSec" REAL NOT NULL,
    "durationSec" REAL NOT NULL,
    "energyScore" REAL NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "moment3to7" BOOLEAN NOT NULL DEFAULT false,
    "moment7to11" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Snippet_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HookFamily" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "templates" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PostPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduledFor" DATETIME NOT NULL,
    "container" TEXT NOT NULL,
    "clipIds" JSONB NOT NULL,
    "trackId" TEXT NOT NULL,
    "snippetId" TEXT NOT NULL,
    "snippetStartSec" REAL,
    "snippetDurationSec" REAL,
    "onscreenText" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "hookFamily" TEXT NOT NULL,
    "compatibilityScore" REAL NOT NULL,
    "reasons" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "renderPath" TEXT,
    "renderHash" TEXT,
    "tiktokPublishId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HookRecipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "beat1Templates" JSONB NOT NULL,
    "beat2Templates" JSONB NOT NULL,
    "ctaType" TEXT NOT NULL,
    "allowedSnippetTypes" JSONB NOT NULL,
    "disallowedContainers" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postPlanId" TEXT NOT NULL,
    "tiktokVideoId" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL,
    "views" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL,
    "comments" INTEGER NOT NULL,
    "shares" INTEGER NOT NULL,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RunLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runType" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "payloadExcerpt" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "HookFamily_name_key" ON "HookFamily"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HookRecipe_name_key" ON "HookRecipe"("name");
