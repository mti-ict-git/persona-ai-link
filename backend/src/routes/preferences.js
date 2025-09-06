const express = require('express');
const { dbManager } = require('../utils/database');
const Joi = require('joi');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Validation schemas
const preferenceSchema = Joi.object({
  key: Joi.string().valid('language', 'theme', 'timezone', 'notifications', 'dateFormat', 'timeFormat', 'onboardingCompleted', 'showFollowUpSuggestions', 'firstTimeLogin').required(),
  value: Joi.string().max(500).required()
});

const bulkPreferencesSchema = Joi.object({
  preferences: Joi.array().items(
    Joi.object({
      key: Joi.string().valid('language', 'theme', 'timezone', 'notifications', 'dateFormat', 'timeFormat', 'onboardingCompleted', 'showFollowUpSuggestions', 'firstTimeLogin').required(),
      value: Joi.string().max(500).required()
    })
  ).min(1).max(20).required()
});

// GET /api/preferences - Get all user preferences
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = await dbManager.getConnection();
    const request = pool.request();
    
    const result = await request
      .input('userId', req.user.id)
      .query(`
        SELECT preference_key, preference_value, updated_at
        FROM user_preferences 
        WHERE user_id = @userId
        ORDER BY preference_key
      `);
    
    // Convert to key-value object for easier frontend consumption
    const preferences = {};
    result.recordset.forEach(row => {
      preferences[row.preference_key] = {
        value: row.preference_value,
        updatedAt: row.updated_at
      };
    });
    
    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({
      error: 'Failed to fetch preferences',
      message: error.message
    });
  }
});

// GET /api/preferences/:key - Get specific preference
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    
    // Validate preference key
    const validKeys = ['language', 'theme', 'timezone', 'notifications', 'dateFormat', 'timeFormat', 'onboardingCompleted', 'showFollowUpSuggestions', 'firstTimeLogin'];
    if (!validKeys.includes(key)) {
      return res.status(400).json({
        error: 'Invalid preference key',
        validKeys
      });
    }
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    
    const result = await request
      .input('userId', req.user.id)
      .input('key', key)
      .query(`
        SELECT preference_value, updated_at
        FROM user_preferences 
        WHERE user_id = @userId AND preference_key = @key
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        error: 'Preference not found',
        key
      });
    }
    
    res.json({
      success: true,
      key,
      value: result.recordset[0].preference_value,
      updatedAt: result.recordset[0].updated_at
    });
  } catch (error) {
    console.error('Error fetching preference:', error);
    res.status(500).json({
      error: 'Failed to fetch preference',
      message: error.message
    });
  }
});

// PUT /api/preferences/:key - Update specific preference
router.put('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    // Validate input
    const { error } = preferenceSchema.validate({ key, value });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
    }
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    
    // Use MERGE to insert or update
    const result = await request
      .input('userId', req.user.id)
      .input('key', key)
      .input('value', value)
      .query(`
        MERGE user_preferences AS target
        USING (SELECT @userId AS user_id, @key AS preference_key, @value AS preference_value) AS source
        ON target.user_id = source.user_id AND target.preference_key = source.preference_key
        WHEN MATCHED THEN
          UPDATE SET preference_value = source.preference_value, updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (user_id, preference_key, preference_value, created_at, updated_at)
          VALUES (source.user_id, source.preference_key, source.preference_value, GETDATE(), GETDATE());
        
        SELECT preference_key, preference_value, updated_at
        FROM user_preferences
        WHERE user_id = @userId AND preference_key = @key;
      `);
    
    res.json({
      success: true,
      message: 'Preference updated successfully',
      preference: {
        key: result.recordset[0].preference_key,
        value: result.recordset[0].preference_value,
        updatedAt: result.recordset[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error updating preference:', error);
    res.status(500).json({
      error: 'Failed to update preference',
      message: error.message
    });
  }
});

// POST /api/preferences/bulk - Update multiple preferences at once
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    // Validate input
    const { error } = bulkPreferencesSchema.validate({ preferences });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
    }
    
    const pool = await dbManager.getConnection();
      const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      const updatedPreferences = [];
      
      for (const pref of preferences) {
        const request = transaction.request();
        const result = await request
          .input('userId', req.user.id)
          .input('key', pref.key)
          .input('value', pref.value)
          .query(`
            MERGE user_preferences AS target
            USING (SELECT @userId AS user_id, @key AS preference_key, @value AS preference_value) AS source
            ON target.user_id = source.user_id AND target.preference_key = source.preference_key
            WHEN MATCHED THEN
              UPDATE SET preference_value = source.preference_value, updated_at = GETDATE()
            WHEN NOT MATCHED THEN
              INSERT (user_id, preference_key, preference_value, created_at, updated_at)
              VALUES (source.user_id, source.preference_key, source.preference_value, GETDATE(), GETDATE());
            
            SELECT preference_key, preference_value, updated_at
            FROM user_preferences
            WHERE user_id = @userId AND preference_key = @key;
          `);
        
        updatedPreferences.push({
          key: result.recordset[0].preference_key,
          value: result.recordset[0].preference_value,
          updatedAt: result.recordset[0].updated_at
        });
      }
      
      await transaction.commit();
      
      res.json({
        success: true,
        message: 'Preferences updated successfully',
        preferences: updatedPreferences
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: error.message
    });
  }
});

// DELETE /api/preferences/:key - Delete specific preference (reset to default)
router.delete('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    
    // Validate preference key
    const validKeys = ['language', 'theme', 'timezone', 'notifications', 'dateFormat', 'timeFormat', 'onboardingCompleted', 'showFollowUpSuggestions', 'firstTimeLogin'];
    if (!validKeys.includes(key)) {
      return res.status(400).json({
        error: 'Invalid preference key',
        validKeys
      });
    }
    
    const pool = await dbManager.getConnection();
    const request = pool.request();
    
    const result = await request
      .input('userId', req.user.id)
      .input('key', key)
      .query(`
        DELETE FROM user_preferences 
        WHERE user_id = @userId AND preference_key = @key;
        
        SELECT @@ROWCOUNT as deletedCount;
      `);
    
    if (result.recordset[0].deletedCount === 0) {
      return res.status(404).json({
        error: 'Preference not found',
        key
      });
    }
    
    res.json({
      success: true,
      message: 'Preference deleted successfully',
      key
    });
  } catch (error) {
    console.error('Error deleting preference:', error);
    res.status(500).json({
      error: 'Failed to delete preference',
      message: error.message
    });
  }
});

module.exports = router;