-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  -- NEW: add as nullable first so we can backfill
  "securityQuestionKey" TEXT,
  "securityAnswerHash"  TEXT
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- BACKFILL: set placeholders for existing rows so NOT NULL can be applied
-- securityAnswerHash below is SHA-256 of an empty string; replace later in app flow.
UPDATE "User"
SET
  "securityQuestionKey" = COALESCE("securityQuestionKey", 'FIRST_SCHOOL'),
  "securityAnswerHash"  = COALESCE("securityAnswerHash",  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

-- ENFORCE NOT NULL: recreate table with constraints and copy data (SQLite pattern)
CREATE TABLE "new_User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "securityQuestionKey" TEXT NOT NULL,
  "securityAnswerHash"  TEXT NOT NULL
);

INSERT INTO "new_User" (
  "id","email","username","passwordHash","createdAt","updatedAt","securityQuestionKey","securityAnswerHash"
)
SELECT
  "id","email","username","passwordHash","createdAt","updatedAt","securityQuestionKey","securityAnswerHash"
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

-- Recreate indexes after table swap
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
