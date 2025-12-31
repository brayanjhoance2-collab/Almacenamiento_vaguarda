const jwt = require('jsonwebtoken');
const db = require('../config/database');

const verificarToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Acceso denegado. Token requerido'
    });
  }

  try {
    const verificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = verificado;
    next();
  } catch (error) {
    res.status(401).json({
      exito: false,
      mensaje: 'Token inválido o expirado'
    });
  }
};

const verificarPremium = async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT es_premium, fecha_expiracion_premium FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    const usuario = rows[0];

    if (usuario.es_premium !== 1) {
      return res.status(403).json({
        exito: false,
        mensaje: 'Esta función requiere una suscripción premium'
      });
    }

    if (usuario.fecha_expiracion_premium && new Date(usuario.fecha_expiracion_premium) < new Date()) {
      return res.status(403).json({
        exito: false,
        mensaje: 'Tu suscripción premium ha expirado'
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando premium:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error al verificar estado premium'
    });
  }
};

module.exports = { verificarToken, verificarPremium };