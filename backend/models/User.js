const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username:    { type: String, unique: true, required: true },
  full_name:   { type: String, default: '' },
  password:    { type: String, required: true, select: false },
  role:        { type: String, enum: ['Admin','Technician','Supervisor'], default: 'Technician' },
  avatar_color:{ type: String, default: '#6366f1' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

userSchema.virtual('id').get(function () { return this._id.toHexString(); });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password with hash
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
