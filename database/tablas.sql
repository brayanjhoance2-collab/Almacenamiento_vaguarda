USE viewvagua_db;

CREATE TABLE IF NOT EXISTS archivos_usuario (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id INT NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  nombre_storage VARCHAR(500) NOT NULL,
  size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  bucket VARCHAR(50) NOT NULL DEFAULT 'user-files',
  eliminado TINYINT(1) DEFAULT 0,
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_eliminacion TIMESTAMP NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_eliminado (eliminado),
  INDEX idx_fecha_subida (fecha_subida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enlaces_compartidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(36) UNIQUE NOT NULL,
  archivo_id VARCHAR(36) NOT NULL,
  usuario_id INT NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMP NOT NULL,
  descargas INT DEFAULT 0,
  FOREIGN KEY (archivo_id) REFERENCES archivos_usuario(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expiracion (fecha_expiracion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;