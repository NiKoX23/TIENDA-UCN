ALTER TABLE documentos_tac
    ADD COLUMN IF NOT EXISTS archivo_pdf bytea;

ALTER TABLE documentos_tac
    ADD COLUMN IF NOT EXISTS archivo_pdf_disponible boolean NOT NULL DEFAULT false;
