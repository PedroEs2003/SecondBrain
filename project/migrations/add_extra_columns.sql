-- Migración: columnas extra requeridas por el frontend React
-- Ejecutar en Supabase Dashboard > SQL Editor

-- Tabla tareas
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]';

-- Tabla notas
ALTER TABLE notas ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE notas ADD COLUMN IF NOT EXISTS color_class TEXT;
ALTER TABLE notas ADD COLUMN IF NOT EXISTS note_color TEXT;
ALTER TABLE notas ADD COLUMN IF NOT EXISTS checklist BOOLEAN DEFAULT false;

-- Tabla deudas
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]';
