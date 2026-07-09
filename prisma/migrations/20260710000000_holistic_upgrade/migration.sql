-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Generation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "batchSize" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "settingsSnapshot" TEXT,
    "estimatedCostUsd" REAL,
    "actualCostUsd" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_Generation" ("id", "prompt", "model", "provider", "size", "status", "error", "createdAt")
SELECT "id", "prompt", "model", "provider", "size", "status", "error", "createdAt" FROM "Generation";

DROP TABLE "Generation";
ALTER TABLE "new_Generation" RENAME TO "Generation";

CREATE TABLE "new_Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "batchIndex" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Image_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Image" ("id", "generationId", "type", "relativePath", "mimeType", "width", "height", "sortOrder", "createdAt")
SELECT "id", "generationId", "type", "filename", "mimeType", "width", "height", "sortOrder", "createdAt" FROM "Image";

DROP TABLE "Image";
ALTER TABLE "new_Image" RENAME TO "Image";
CREATE INDEX "Image_generationId_idx" ON "Image"("generationId");

CREATE TABLE "ProfileSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "displayName" TEXT NOT NULL DEFAULT 'Studio',
    "billingMode" TEXT NOT NULL DEFAULT 'prepaid',
    "manualBalanceUsd" REAL,
    "budgetLimitUsd" REAL,
    "budgetAlertPercent" INTEGER NOT NULL DEFAULT 80,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "ProfileSettings" ("id", "displayName", "billingMode", "budgetAlertPercent", "updatedAt")
VALUES ('default', 'Studio', 'prepaid', 80, CURRENT_TIMESTAMP);

CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generationId" TEXT,
    "model" TEXT NOT NULL,
    "imageCount" INTEGER NOT NULL,
    "estimatedUsd" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
