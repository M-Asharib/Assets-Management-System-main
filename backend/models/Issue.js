const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  issue_number:          { type: String, unique: true, required: true },
  asset_id:              { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  title:                 { type: String, required: true },
  description:           { type: String, default: '' },
  priority:              { type: String, enum: ['Low','Medium','High','Critical'], default: 'Medium' },
  category:              { type: String, default: 'General' },
  reporter_name:         { type: String, default: '' },
  reporter_contact:      { type: String, default: '' },
  status:                { type: String, default: 'Reported' },
  evidence_url:          { type: String, default: '' },
  technician_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ai_used:               { type: Number, default: 0 },
  ai_suggested_title:    { type: String, default: '' },
  ai_suggested_category: { type: String, default: '' },
  ai_suggested_priority: { type: String, default: '' },
  ai_possible_causes:    { type: String, default: '' },
  ai_diagnostic_checks:  { type: String, default: '' },
  ai_pattern_warning:    { type: String, default: null },
  closed_at:             { type: String, default: null },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

issueSchema.virtual('id').get(function () { return this._id.toHexString(); });
// Expose created_at / updated_at aliases matching the frontend
issueSchema.virtual('created_at').get(function () { return this.createdAt; });
issueSchema.virtual('updated_at').get(function () { return this.updatedAt; });

module.exports = mongoose.model('Issue', issueSchema);
