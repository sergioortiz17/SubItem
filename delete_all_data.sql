-- ============================================
-- Script para borrar todos los registros de la base de datos
-- ============================================

-- OPCIÓN 1: DELETE (más seguro, respeta transacciones)
-- Borra primero los items (la foreign key tiene ON DELETE SET NULL)
DELETE FROM items;
DELETE FROM levels;

-- OPCIÓN 2: TRUNCATE (más rápido, reinicia los contadores)
-- Desactiva temporalmente las restricciones de foreign key
SET session_replication_role = 'replica';
TRUNCATE TABLE items CASCADE;
TRUNCATE TABLE levels CASCADE;
SET session_replication_role = 'origin';

-- OPCIÓN 3: TRUNCATE con reinicio de secuencias (si las hay)
-- TRUNCATE TABLE items, levels RESTART IDENTITY CASCADE;

-- ============================================
-- Verificar que se borraron los datos
-- ============================================
SELECT COUNT(*) as total_items FROM items;
SELECT COUNT(*) as total_levels FROM levels;

