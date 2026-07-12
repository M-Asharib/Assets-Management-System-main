const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  asset_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  issue_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
  notes:            { type: String, default: '' },
  parts_used:       { type: String, default: '' },
  cost:             { type: Number, default: 0 },
  evidence_url:     { type: String, default: '' },
  start_date:       { type: String, default: '' },
  end_date:         { type: String, default: '' },
  technician_name:  { type: String, default: '' },
  status:           { type: String, default: 'Completed' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

maintenanceSchema.virtual('id').get(function () { return this._id.toHexString(); });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
