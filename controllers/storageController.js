const minioClient = require('../config/minio');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        exito: false,
        mensaje: 'No se recibió ningún archivo'
      });
    }

    const file = req.files.file;
    const usuario_id = req.usuario.id;
    const { carpeta_id } = req.body;

    if (carpeta_id) {
      const [carpetas] = await db.execute(
        'SELECT * FROM carpetas_usuario WHERE id = ? AND usuario_id = ? AND eliminado = 0',
        [carpeta_id, usuario_id]
      );

      if (carpetas.length === 0) {
        return res.status(404).json({
          exito: false,
          mensaje: 'Carpeta no encontrada'
        });
      }
    }

    const [stats] = await db.execute(
      'SELECT COALESCE(SUM(size), 0) as total_usado FROM archivos_usuario WHERE usuario_id = ? AND eliminado = 0',
      [usuario_id]
    );

    const totalUsado = parseInt(stats[0].total_usado);
    const maxStorage = parseInt(process.env.MAX_STORAGE_PREMIUM);

    if (totalUsado + file.size > maxStorage) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Límite de almacenamiento excedido'
      });
    }

    const fileId = uuidv4();
    const fileExtension = path.extname(file.name);
    const fileName = `${usuario_id}/${fileId}${fileExtension}`;
    
    const detectedMimeType = getMimeType(file.name);

    await minioClient.fPutObject(
      'user-files',
      fileName,
      file.tempFilePath,
      {
        'Content-Type': detectedMimeType,
        'x-amz-meta-original-name': file.name
      }
    );

    fs.unlinkSync(file.tempFilePath);

    await db.execute(
      `INSERT INTO archivos_usuario 
      (id, usuario_id, nombre_original, nombre_storage, size, mime_type, bucket, carpeta_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fileId, usuario_id, file.name, fileName, file.size, detectedMimeType, 'user-files', carpeta_id || null]
    );

    res.json({
      exito: true,
      mensaje: 'Archivo subido exitosamente',
      datos: {
        file_id: fileId,
        nombre: file.name,
        size: file.size,
        mime_type: detectedMimeType,
        carpeta_id: carpeta_id || null
      }
    });

  } catch (error) {
    console.error('Error subiendo archivo:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al subir archivo'
    });
  }
};

exports.listFiles = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const { carpeta_id } = req.query;

    let query = `
      SELECT id, nombre_original, size, mime_type, fecha_subida, carpeta_id 
      FROM archivos_usuario 
      WHERE usuario_id = ? AND eliminado = 0
    `;

    const params = [usuario_id];

    if (carpeta_id) {
      query += ' AND carpeta_id = ?';
      params.push(carpeta_id);
    } else {
      query += ' AND carpeta_id IS NULL';
    }

    query += ' ORDER BY fecha_subida DESC';

    const [files] = await db.execute(query, params);

    res.json({
      exito: true,
      datos: files
    });

  } catch (error) {
    console.error('Error listando archivos:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al listar archivos'
    });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const usuario_id = req.usuario.id;

    const [files] = await db.execute(
      'SELECT * FROM archivos_usuario WHERE id = ? AND usuario_id = ? AND eliminado = 0',
      [fileId, usuario_id]
    );

    if (files.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Archivo no encontrado'
      });
    }

    const file = files[0];

    const dataStream = await minioClient.getObject(file.bucket, file.nombre_storage);

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.nombre_original}"`);

    dataStream.pipe(res);

  } catch (error) {
    console.error('Error descargando archivo:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al descargar archivo'
    });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const usuario_id = req.usuario.id;

    const [files] = await db.execute(
      'SELECT * FROM archivos_usuario WHERE id = ? AND usuario_id = ?',
      [fileId, usuario_id]
    );

    if (files.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Archivo no encontrado'
      });
    }

    await db.execute(
      'UPDATE archivos_usuario SET eliminado = 1, fecha_eliminacion = NOW() WHERE id = ?',
      [fileId]
    );

    res.json({
      exito: true,
      mensaje: 'Archivo eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al eliminar archivo'
    });
  }
};

exports.getStorageStats = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;

    const [stats] = await db.execute(
      `SELECT 
        COUNT(*) as total_archivos,
        COALESCE(SUM(size), 0) as total_usado 
      FROM archivos_usuario 
      WHERE usuario_id = ? AND eliminado = 0`,
      [usuario_id]
    );

    const maxStorage = parseInt(process.env.MAX_STORAGE_PREMIUM);

    res.json({
      exito: true,
      datos: {
        total_archivos: stats[0].total_archivos,
        espacio_usado: parseInt(stats[0].total_usado),
        espacio_total: maxStorage,
        espacio_disponible: maxStorage - parseInt(stats[0].total_usado),
        porcentaje_usado: ((parseInt(stats[0].total_usado) / maxStorage) * 100).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener estadísticas'
    });
  }
};

exports.generateShareLink = async (req, res) => {
  try {
    const { fileId } = req.params;
    const usuario_id = req.usuario.id;
    const { expiracion_horas = 24 } = req.body;

    const [files] = await db.execute(
      'SELECT * FROM archivos_usuario WHERE id = ? AND usuario_id = ? AND eliminado = 0',
      [fileId, usuario_id]
    );

    if (files.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Archivo no encontrado'
      });
    }

    const shareToken = uuidv4();
    const fechaExpiracion = new Date();
    fechaExpiracion.setHours(fechaExpiracion.getHours() + expiracion_horas);

    await db.execute(
      `INSERT INTO enlaces_compartidos 
      (token, archivo_id, usuario_id, fecha_expiracion) 
      VALUES (?, ?, ?, ?)`,
      [shareToken, fileId, usuario_id, fechaExpiracion]
    );

    const shareUrl = `${req.protocol}://${req.get('host')}/api/storage/shared/${shareToken}`;

    res.json({
      exito: true,
      datos: {
        share_url: shareUrl,
        expira_en: fechaExpiracion
      }
    });

  } catch (error) {
    console.error('Error generando enlace:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al generar enlace'
    });
  }
};

exports.downloadSharedFile = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const [enlaces] = await db.execute(
      `SELECT e.*, a.* 
      FROM enlaces_compartidos e
      JOIN archivos_usuario a ON e.archivo_id = a.id
      WHERE e.token = ? AND e.fecha_expiracion > NOW() AND a.eliminado = 0`,
      [shareToken]
    );

    if (enlaces.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Enlace no válido o expirado'
      });
    }

    const file = enlaces[0];

    const dataStream = await minioClient.getObject(file.bucket, file.nombre_storage);

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.nombre_original}"`);

    dataStream.pipe(res);

  } catch (error) {
    console.error('Error descargando archivo compartido:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al descargar archivo'
    });
  }
};