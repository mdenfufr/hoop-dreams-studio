-- Actualizar permisos del usuario renatomartinez751@gmail.com
-- Configurar football_access como visualizador para que coincida con los otros permisos
UPDATE users 
SET football_access = 'visualizador'
WHERE email = 'renatomartinez751@gmail.com' AND football_access = 'sin_acceso';