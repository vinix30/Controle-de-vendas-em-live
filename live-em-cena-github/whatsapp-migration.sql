-- Execute once in the D1 Console before deploying this version.
ALTER TABLE presenters ADD COLUMN whatsapp TEXT NOT NULL DEFAULT '';
