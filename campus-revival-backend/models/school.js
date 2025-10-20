const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    unique: true
  },
  lat: {
    type: Number,
    required: [true, 'Latitude is required'],
    min: -90,
    max: 90
  },
  lng: {
    type: Number,
    required: [true, 'Longitude is required'],
    min: -180,
    max: 180
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  adopted: {
    type: Boolean,
    default: false
  },
  adopterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  }
}, {
  timestamps: true
});

// Indexes
schoolSchema.index({ lat: 1, lng: 1 });
schoolSchema.index({ adopted: 1 });

module.exports = mongoose.model('School', schoolSchema);