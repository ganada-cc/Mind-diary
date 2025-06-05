const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { upload } = require('../middlewares/multerMiddleware');

// calendar 조회 
router.get('/', calendarController.getCalendar);

// calendar 마음일기
router.post('/minddiary-post', upload.single('file'), calendarController.postMindDiary);

module.exports = router;