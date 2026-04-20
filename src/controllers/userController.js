const User = require('../models/User');

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

// @desc    Crear un nuevo usuario
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { nombre, email, password, rol, activo } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const user = await User.create({
      nombre,
      email,
      password,
      rol: rol || 'empleado',
      activo: activo !== undefined ? activo : true,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo,
      });
    } else {
      res.status(400).json({ message: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario' });
  }
};

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.nombre = req.body.nombre || user.nombre;
      user.email = req.body.email || user.email;
      user.rol = req.body.rol || user.rol;
      if (req.body.activo !== undefined) {
        user.activo = req.body.activo;
      }
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        nombre: updatedUser.nombre,
        email: updatedUser.email,
        rol: updatedUser.rol,
        activo: updatedUser.activo,
      });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

// @desc    Eliminar usuario (Soft delete - Desactivar)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.activo = false;
      await user.save();
      res.json({ message: 'Usuario desactivado exitosamente (soft delete)' });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
