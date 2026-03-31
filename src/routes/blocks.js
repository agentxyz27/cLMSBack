/**
 * Block Routes
 *
 * All routes are protected — requires a valid teacher JWT token.
 * Students cannot create or modify blocks — read-only via lesson routes.
 *
 * POST /api/blocks              → create a block
 * PUT  /api/blocks/reorder      → reorder blocks in a lesson
 * PUT  /api/blocks/:id          → update a block
 * DELETE /api/blocks/:id        → delete a block
 */

const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth')
const requireRole = require('../middleware/requireRole')
const { createBlock, updateBlock, deleteBlock, reorderBlocks } = require('../controllers/blockController')

// reorder must be before /:id to avoid Express matching 'reorder' as an id
router.post('/', protect, requireRole('teacher'), createBlock)
router.put('/reorder', protect, requireRole('teacher'), reorderBlocks)
router.put('/:id', protect, requireRole('teacher'), updateBlock)
router.delete('/:id', protect, requireRole('teacher'), deleteBlock)

module.exports = router