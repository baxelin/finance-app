-- CreateTable
CREATE TABLE "ImportRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT,
    "categoryId" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportRule_matchKey_key" ON "ImportRule"("matchKey");
