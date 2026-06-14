const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic fields
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    default: ''
  },

  // Profile fields
  bio: {
    type: String,
    default: ''
  },
  currentRole: {
    type: String,
    default: 'Student'
  },
  targetRole: {
    type: String,
    default: ''
  },
  industry: {
    type: String,
    default: ''
  },
  yearsOfExperience: {
    type: Number,
    default: 0
  },

  // Account fields
  profileImage: {
    type: String,
    default: ''
  },
  githubUsername: {
    type: String,
    default: ''
  },
  githubProfileUrl: {
    type: String,
    default: ''
  },
  githubAvatarUrl: {
    type: String,
    default: ''
  },
  githubBio: {
    type: String,
    default: ''
  },
  githubRepoCount: {
    type: Number,
    default: 0
  },
  githubTopLanguages: [{
    name: String,
    count: Number
  }],
  githubSyncedAt: {
    type: Date,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: {
    type: Date,
    default: null
  },

  // Preferences
  preferredLanguages: [{
    type: String,
    default: 'English'
  }],
  preferredLearningStyle: {
    type: String,
    enum: ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'],
    default: 'Visual'
  },
  workAvailability: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Flexible'],
    default: 'Flexible'
  },

  // Location
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  timezone: {
    type: String,
    default: 'UTC'
  },

  // Relationships
  skills: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  }],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get user data without password
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
