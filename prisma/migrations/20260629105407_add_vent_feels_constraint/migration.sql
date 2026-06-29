-- CreateTable
CREATE TABLE "VentFeel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ventId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentFeel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VentFeel_ventId_fkey" FOREIGN KEY ("ventId") REFERENCES "Vent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "feelsCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Vent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Vent" ("content", "createdAt", "deletedAt", "feelsCount", "id", "isEdited", "status", "updatedAt", "userId", "visibility") SELECT "content", "createdAt", "deletedAt", "feelsCount", "id", "isEdited", "status", "updatedAt", "userId", "visibility" FROM "Vent";
DROP TABLE "Vent";
ALTER TABLE "new_Vent" RENAME TO "Vent";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "VentFeel_userId_ventId_key" ON "VentFeel"("userId", "ventId");
