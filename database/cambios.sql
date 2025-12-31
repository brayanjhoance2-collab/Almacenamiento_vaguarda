USE viewvagua_db;

ALTER TABLE archivos_usuario 
ADD COLUMN carpeta_id VARCHAR(36) NULL AFTER bucket,
ADD INDEX idx_carpeta (carpeta_id);

CREATE TABLE IF NOT EXISTS carpetas_usuario (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  carpeta_padre_id VARCHAR(36) NULL,
  color VARCHAR(7) DEFAULT '#C9003E',
  eliminado TINYINT(1) DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_eliminacion TIMESTAMP NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (carpeta_padre_id) REFERENCES carpetas_usuario(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_padre (carpeta_padre_id),
  INDEX idx_eliminado (eliminado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;