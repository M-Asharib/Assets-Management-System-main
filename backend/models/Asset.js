const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  asset_code:       { type: String, unique: true, required: true },
  name:             { type: String, required: true },
  category:         { type: String, default: 'General' },
  location:         { type: String, default: '' },
  status:           {
    type: String,
    enum: ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired'],
    default: 'Operational',
  },
  condition:        { type: String, default: 'Good' },
  serial:           { type: String, default: '' },
  value:            { type: Number, default: 0 },
  purchase_date:    { type: String, default: '' },
  last_service_date:{ type: String, default: null },
  next_service_date:{ type: String, default: null },
  description:      { type: String, default: '' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Expose _id as `id` for the frontend
assetSchema.virtual('id').get(function () { return this._id.toHexString(); });

module.exports = mongoose.model('Asset', assetSchema);
