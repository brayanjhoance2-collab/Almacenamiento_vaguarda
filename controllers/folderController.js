const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

exports.createFolder = async (req, res) => {
  try {
    const { nombre, carpeta_padre_id, color } = req.body;
    const usuario_id = req.usuario.id;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        exito: false,
        mensaje: 'El nombre de la carpeta es requerido'
      });
    }

    if (carpeta_padre_id) {
      const [carpetas] = await db.execute(
        'SELECT * FROM carpetas_usuario WHERE id = ? AND usuario_id = ? AND eliminado = 0',
        [carpeta_padre_id, usuario_id]
      );

      if (carpetas.length === 0) {
        return res.status(404).json({
          exito: false,
          mensaje: 'Carpeta padre no encontrada'
        });
      }
    }

    const folderId = uuidv4();

    await db.execute(
      `INSERT INTO carpetas_usuario (id, usuario_id, nombre, carpeta_padre_id, color) 
      VALUES (?, ?, ?, ?, ?)`,
      [folderId, usuario_id, nombre.trim(), carpeta_padre_id || null, color || '#C9003E']
    );

    res.json({
      exito: true,
      mensaje: 'Carpeta creada exitosamente',
      datos: {
        id: folderId,
        nombre: nombre.trim(),
        carpeta_padre_id: carpeta_padre_id || null,
        color: color || '#C9003E'
      }
    });

  } catch (error) {
    console.error('Error creando carpeta:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al crear carpeta'
    });
  }
};

exports.listFolders = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const { carpeta_padre_id } = req.query;

    let query = `
      SELECT id, nombre, carpeta_padre_id, color, fecha_creacion, fecha_modificacion,
      (SELECT COUNT(*) FROM archivos_usuario WHERE carpeta_id = carpetas_usuario.id AND eliminado = 0) as total_archivos,
      (SELECT COUNT(*) FROM carpetas_usuario c WHERE c.carpeta_padre_id = carpetas_usuario.id AND c.eliminado = 0) as total_subcarpetas
      FROM carpetas_usuario 
      WHERE usuario_id = ? AND eliminado = 0
    `;

    const params = [usuario_id];

    if (carpeta_padre_id) {
      query += ' AND carpeta_padre_id = ?';
      params.push(carpeta_padre_id);
    } else {
      query += ' AND carpeta_padre_id IS NULL';
    }

    query += ' ORDER BY fecha_creacion DESC';

    const [carpetas] = await db.execute(query, params);

    res.json({
      exito: true,
      datos: carpetas
    });

  } catch (error) {
    console.error('Error listando carpetas:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al listar carpetas'
    });
  }
};

exports.renameFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { nombre } = req.body;
    const usuario_id = req.usuario.id;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        exito: false,
        mensaje: 'El nombre de la carpeta es requerido'
      });
    }

    const [carpetas] = await db.execute(
      'SELECT * FROM carpetas_usuario WHERE id = ? AND usuario_id = ? AND eliminado = 0',
      [folderId, usuario_id]
    );

    if (carpetas.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Carpeta no encontrada'
      });
    }

    await db.execute(
      'UPDATE carpetas_usuario SET nombre = ? WHERE id = ?',
      [nombre.trim(), folderId]
    );

    res.json({
      exito: true,
      mensaje: 'Carpeta renombrada exitosamente'
    });

  } catch (error) {
    console.error('Error renombrando carpeta:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al renombrar carpeta'
    });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const usuario_id = req.usuario.id;

    const [carpetas] = await db.execute(
      'SELECT * FROM carpetas_usuario WHERE id = ? AND usuario_id = ?',
      [folderId, usuario_id]
    );

    if (carpetas.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Carpeta no encontrada'
      });
    }

    await db.execute(
      'UPDATE carpetas_usuario SET eliminado = 1, fecha_eliminacion = NOW() WHERE id = ?',
      [folderId]
    );

    await db.execute(
      'UPDATE archivos_usuario SET eliminado = 1, fecha_eliminacion = NOW() WHERE carpeta_id = ?',
      [folderId]
    );

    res.json({
      exito: true,
      mensaje: 'Carpeta eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando carpeta:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al eliminar carpeta'
    });
  }
};

exports.moveFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { carpeta_id } = req.body;
    const usuario_id = req.usuario.id;

    const [archivos] = await db.execute(
      'SELECT * FROM archivos_usuario WHERE id = ? AND usuario_id = ? AND eliminado = 0',
      [fileId, usuario_id]
    );

    if (archivos.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Archivo no encontrado'
      });
    }

    if (carpeta_id) {
      const [carpetas] = await db.execute(
        'SELECT * FROM carpetas_usuario WHERE id = ? AND usuario_id = ? AND eliminado = 0',
        [carpeta_id, usuario_id]
      );

      if (carpetas.length === 0) {
        return res.status(404).json({
          exito: false,
          mensaje: 'Carpeta destino no encontrada'
        });
      }
    }

    await db.execute(
      'UPDATE archivos_usuario SET carpeta_id = ? WHERE id = ?',
      [carpeta_id || null, fileId]
    );

    res.json({
      exito: true,
      mensaje: 'Archivo movido exitosamente'
    });

  } catch (error) {
    console.error('Error moviendo archivo:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al mover archivo'
    });
  }
};

exports.getBreadcrumb = async (req, res) => {
  try {
    const { folderId } = req.params;
    const usuario_id = req.usuario.id;

    const breadcrumb = [];

    let currentId = folderId;

    while (currentId) {
      const [carpetas] = await db.execute(
        'SELECT id, nombre, carpeta_padre_id FROM carpetas_usuario WHERE id = ? AND usuario_id = ? AND eliminado = 0',
        [currentId, usuario_id]
      );

      if (carpetas.length === 0) break;

      breadcrumb.unshift({
        id: carpetas[0].id,
        nombre: carpetas[0].nombre
      });

      currentId = carpetas[0].carpeta_padre_id;
    }

    res.json({
      exito: true,
      datos: breadcrumb
    });

  } catch (error) {
    console.error('Error obteniendo breadcrumb:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener ruta'
    });
  }
};