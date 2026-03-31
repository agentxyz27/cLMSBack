/**
 * blockController.js
 *
 * Handles CRUD for LessonBlocks.
 * Blocks are the content units inside a lesson.
 *
 * Block types and their data shapes:
 *   text  → { html: string }
 *   image → { url: string, alt: string }
 *   video → { url: string, title: string }
 *   file  → { url: string, name: string, fileType: string }
 *   math  → { expression: string }
 *
 * createBlock  → adds a new block to a lesson
 * updateBlock  → updates block data or type
 * deleteBlock  → removes a block from a lesson
 * reorderBlocks → updates order of all blocks in a lesson
 */

const prisma = require('../prisma')

/**
 * POST /api/blocks
 * Creates a new block and appends it to the end of the lesson.
 * Order is auto-calculated as current block count + 1.
 */
const createBlock = async (req, res) => {
  try {
    const { lessonId, type, data } = req.body

    // Calculate order — append to end
    const count = await prisma.lessonBlock.count({
      where: { lessonId }
    })

    const block = await prisma.lessonBlock.create({
      data: {
        lessonId,
        type,
        data,
        order: count + 1
      }
    })

    res.status(201).json({ message: 'Block created', block })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * PUT /api/blocks/:id
 * Updates a block's type and/or data.
 * Order is not changed here — use reorderBlocks for that.
 */
const updateBlock = async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { type, data } = req.body

    const block = await prisma.lessonBlock.update({
      where: { id },
      data: { type, data }
    })

    res.json({ message: 'Block updated', block })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * DELETE /api/blocks/:id
 * Deletes a block by ID.
 */
const deleteBlock = async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    await prisma.lessonBlock.delete({
      where: { id }
    })

    res.json({ message: 'Block deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

/**
 * PUT /api/blocks/reorder
 * Updates the order of all blocks in a lesson.
 * Expects an array of { id, order } objects.
 *
 * Example body:
 *   { blocks: [{ id: 1, order: 2 }, { id: 2, order: 1 }] }
 */
const reorderBlocks = async (req, res) => {
  try {
    const { blocks } = req.body

    // Update each block's order in a transaction
    // Transaction ensures all updates succeed or none do
    await prisma.$transaction(
      blocks.map(({ id, order }) =>
        prisma.lessonBlock.update({
          where: { id },
          data: { order }
        })
      )
    )

    res.json({ message: 'Blocks reordered' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = { createBlock, updateBlock, deleteBlock, reorderBlocks }