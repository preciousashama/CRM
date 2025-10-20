const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const School = require('../models/School');
const Adoption = require('../models/Adoption');
const Journal = require('../models/Journal');
const { protect, adminOnly } = require('../middleware/auth');

// ============== HEALTH CHECK ==============
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected'
  });
});

// ============== AUTH ROUTES ==============

// POST /api/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    const user = await User.create({ email, password, name });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
});

// POST /api/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

// GET /api/me
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// ============== SCHOOL ROUTES ==============

// GET /api/schools
router.get('/schools', async (req, res) => {
  try {
    const schools = await School.find()
      .populate('adopterId', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: schools.length,
      schools
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schools',
      message: error.message
    });
  }
});

// GET /api/schools/:id
router.get('/schools/:id', async (req, res) => {
  try {
    const school = await School.findById(req.params.id)
      .populate('adopterId', 'name email');

    if (!school) {
      return res.status(404).json({
        success: false,
        error: 'School not found'
      });
    }

    res.json({
      success: true,
      school
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch school',
      message: error.message
    });
  }
});

// POST /api/schools (admin only)
router.post('/schools', protect, adminOnly, async (req, res) => {
  try {
    const school = await School.create(req.body);
    res.status(201).json({
      success: true,
      message: 'School created',
      school
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create school',
      message: error.message
    });
  }
});

// ============== ADOPTION ROUTES ==============

// GET /api/adoptions - PROTECTED
router.get('/adoptions', protect, async (req, res) => {
    try {
      const adoptions = await Adoption.find({ userId: req.user._id })
        .populate('schoolId')
        .sort({ dateAdopted: -1 });
  
      res.json({
        success: true,
        count: adoptions.length,
        adoptions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch adoptions',
        message: error.message
      });
    }
  });
  
  // POST /api/adoptions - PROTECTED
  router.post('/adoptions', protect, async (req, res) => {
    try {
      const { schoolId } = req.body;
  
      if (!schoolId) {
        return res.status(400).json({
          success: false,
          error: 'School ID is required'
        });
      }
  
      const school = await School.findById(schoolId);
      if (!school) {
        return res.status(404).json({
          success: false,
          error: 'School not found'
        });
      }
  
      if (school.adopted) {
        return res.status(400).json({
          success: false,
          error: 'School is already adopted by another user'
        });
      }
  
      const adoption = await Adoption.create({
        userId: req.user._id,
        schoolId
      });
  
      school.adopted = true;
      school.adopterId = req.user._id;
      await school.save();
  
      // Populate school data before returning
      await adoption.populate('schoolId');
  
      res.status(201).json({
        success: true,
        message: 'School adopted successfully',
        adoption
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'You have already adopted this school'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to adopt school',
        message: error.message
      });
    }
  });

// ============== JOURNAL ROUTES ==============

// GET /api/journal - PROTECTED
router.get('/journal', protect, async (req, res) => {
    try {
      const { schoolId, limit = 50 } = req.query;
  
      const query = { userId: req.user._id };
      if (schoolId) query.schoolId = schoolId;
  
      const entries = await Journal.find(query)
        .populate('schoolId', 'name address')
        .sort({ date: -1 })
        .limit(parseInt(limit));
  
      res.json({
        success: true,
        count: entries.length,
        entries
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch journal entries',
        message: error.message
      });
    }
  });
  
  // POST /api/journal - PROTECTED
  router.post('/journal', protect, async (req, res) => {
    try {
      const { entryText, schoolId } = req.body;
  
      if (!entryText || entryText.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Journal entry text is required'
        });
      }
  
      const entry = await Journal.create({
        userId: req.user._id,
        entryText: entryText.trim(),
        schoolId: schoolId || null
      });
  
      await entry.populate('schoolId', 'name');
  
      res.status(201).json({
        success: true,
        message: 'Journal entry created',
        entry
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create journal entry',
        message: error.message
      });
    }
  });
  
  // DELETE /api/journal/:id - PROTECTED (BONUS)
  router.delete('/journal/:id', protect, async (req, res) => {
    try {
      const entry = await Journal.findOne({
        _id: req.params.id,
        userId: req.user._id
      });
  
      if (!entry) {
        return res.status(404).json({
          success: false,
          error: 'Journal entry not found'
        });
      }
  
      await entry.deleteOne();
  
      res.json({
        success: true,
        message: 'Journal entry deleted'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete journal entry',
        message: error.message
      });
    }
  });

  // POST /api/logout - PROTECTED
router.post('/logout', protect, async (req, res) => {
    try {
      // Add current token to blacklist
      const { blacklistToken } = require('../middleware/auth');
      blacklistToken(req.token);
  
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: error.message
      });
    }
  });
  
  // GET /api/dashboard - PROTECTED
  router.get('/dashboard', protect, async (req, res) => {
    try {
      // Get user's adoptions with school details
      const adoptions = await Adoption.find({ userId: req.user._id })
        .populate('schoolId', 'name address lat lng description')
        .sort({ dateAdopted: -1 })
        .lean();
  
      // Calculate total prayers across all adoptions
      const totalPrayers = adoptions.reduce((sum, adoption) => sum + adoption.prayerCount, 0);
  
      // Get journal entry count
      const journalCount = await Journal.countDocuments({ userId: req.user._id });
  
      // Get total journal entries across all adoptions
      const totalJournalEntries = adoptions.reduce(
        (sum, adoption) => sum + (adoption.journalEntries?.length || 0), 
        0
      );
  
      // Calculate some stats
      const schoolsCount = adoptions.length;
      const adoptedSchools = adoptions.map(a => ({
        id: a.schoolId._id,
        name: a.schoolId.name,
        address: a.schoolId.address,
        dateAdopted: a.dateAdopted,
        prayerCount: a.prayerCount,
        journalEntries: a.journalEntries?.length || 0,
        latestJournal: a.journalEntries?.[a.journalEntries.length - 1] || null
      }));
  
      // Get recent journal entries
      const recentJournals = await Journal.find({ userId: req.user._id })
        .populate('schoolId', 'name')
        .sort({ date: -1 })
        .limit(5)
        .lean();
  
      res.json({
        success: true,
        dashboard: {
          user: {
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            memberSince: req.user.createdAt
          },
          stats: {
            schoolsCount,
            totalPrayers,
            journalCount,
            totalJournalEntries,
            daysActive: Math.floor((Date.now() - new Date(req.user.createdAt)) / (1000 * 60 * 60 * 24))
          },
          adoptions: adoptedSchools,
          recentJournals
        }
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error.message
      });
    }
  });
  