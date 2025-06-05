const calendarService = require('../services/calendarService');
const path = require('path');
const calendarDate = require('../public/js/calendar.js');
const jwt = require('jsonwebtoken');
const secret = require('../config/secret');
const querystring = require('querystring');
const baseResponse = require("../config/baseResponseStatus");
const s3 = require('../config/s3');
const { v4: uuidv4 } = require('uuid');

exports.getCalendar = async function (req, res) {
  const token = req.cookies.x_auth;
  if (!token) return res.redirect('/');

  const decodedToken = jwt.verify(token, secret.jwtsecret);
  const user_id = decodedToken.user_id;

  let date = req.query.selectedYear + req.query.selectedMonth + req.query.selectedDate;
  if (!req.query.selectedYear || !req.query.selectedMonth || !req.query.selectedDate) {
    const today = new Date();
    const selectedYear = String(today.getFullYear()).padStart(4, '0');
    const selectedMonth = String(today.getMonth() + 1).padStart(2, '0');
    const selectedDate = String(today.getDate()).padStart(2, '0');

    if (Object.keys(req.query).length === 0) {
      const newURL = `${req.protocol}://${req.get('host')}${req.baseUrl}?selectedYear=${selectedYear}&selectedMonth=${selectedMonth}&selectedDate=${selectedDate}`;
      return res.redirect(newURL);
    }
  }

  if (!user_id) return res.send(baseResponse.USER_USERIDX_EMPTY);
  if (user_id <= 0) return res.send(baseResponse.USER_USERIDX_LENGTH);

  const calendarResult = await calendarService.retrieveCalendar(user_id, date);  // file_memories 조회
  console.log('📸 calendarResult:', calendarResult);

  let image_url = '/img/nofound.png';
  if (calendarResult.length > 0 && calendarResult[0].server_name && calendarResult[0].extension) {
    image_url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/images/${calendarResult[0].server_name}${calendarResult[0].extension}`;
  }

  const calendarDataResult = await calendarService.retrieveSelectedCalendar(user_id, date);
  const MindDiaryResult = await calendarService.retrieveCalendar(user_id, date);
  const MindDiaryDataResult = await calendarService.retrieveSelectedMindDiary(user_id, date);

  return res.render('calendar/calendar.ejs', {
    calendarResult,           
    calendarDataResult,
    MindDiaryResult,
    MindDiaryDataResult,
    image_url
  });
};


// 마음다이어리 저장
exports.postMindDiary = async function (req, res) {
  const token = req.cookies.x_auth;
  if (!token) return res.redirect('/');
  const decodedToken = jwt.verify(token, secret.jwtsecret);
  const user_id = decodedToken.user_id;
  const date = req.query.selectedYear + req.query.selectedMonth + req.query.selectedDate;

  const { keyword, matter, change, solution, compliment } = req.body;
  const file = req.file;

  // ✅ 1. 마음일기 먼저 저장
  await calendarService.createMindDiary(user_id, date, keyword, matter, change, solution, compliment);

  // ✅ 2. 이미지가 있다면 업로드
  if (file) {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.png', '.jpg', '.jpeg'];
    if (!allowedExt.includes(extension)) {
      return res.send(`<script>alert("지원하지 않는 확장자입니다."); window.location.href = "/minddiary";</script>`);
    }

    const server_name = uuidv4();
    const user_name = path.basename(file.originalname, extension);
    const fileKey = `images/${server_name}${extension}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      await s3.upload(params).promise();
      console.log('S3 업로드 성공:', file);

      await calendarService.createFileMem(user_id, date, server_name, user_name, extension);
      console.log('✅ DB에 이미지 정보 저장 완료');
    } catch (err) {
      console.error('S3 업로드 실패:', err);
      return res.send(`<script>alert("파일 업로드 실패"); window.location.href = "/minddiary";</script>`);
    }
  }

  const queryString = querystring.stringify(req.query);
  return res.send(`<script>alert("마음일기 저장 완료"); window.location.href = "/minddiary?${queryString}";</script>`);
};