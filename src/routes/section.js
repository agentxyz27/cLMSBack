/**
 * sectionRoutes.js
 *
 * Public routes — no auth required.
 * Used by the registration form to populate the section dropdown.
 */
const express = require('express')
const router = express.Router()
const { getAllSections } = require('../controllers/sectionController')

router.get('/', getAllSections)

module.exports = router