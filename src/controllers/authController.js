const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Autenticar usuario y obtener token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.activo && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Email o contraseña inválidos o usuario inactivo' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// @desc    Obtener perfil del usuario logueado
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// @desc    Desloguear usuario / logout (se maneja en cliente limpiando el token, pero dejamos el endpoint por si hay logica extra)
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = (req, res) => {
  // Cuando se usa JWT el logout real se hace en el cliente borrando el token de localStorage/Cookies
  res.json({ message: 'Sesión cerrada exitosamente' });
};

module.exports = {
  loginUser,
  getUserProfile,
  logoutUser,
};
