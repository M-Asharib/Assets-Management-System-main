const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  asset_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', default: null },
  actor:    { type: String, default: 'System' },
  action:   { type: String, default: '' },
  details:  { type: String, default: '' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

logSchema.virtual('id').get(function () { return this._id.toHexString(); });
logSchema.virtual('timestamp').get(function () { return this.createdAt; });

module.exports = mongoose.model('Log', logSchema);
