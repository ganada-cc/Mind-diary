const calendarService = require('../services/calendarService');
const path = require('path');
const calendarDate = require('../public/js/calendar.js');
const jwt = require('jsonwebtoken');
const secret = require('../config/secret');
const querystring = require('querystring');
const baseResponse = require("../config/baseResponseStatus");
// s3 연결 관련
const s3 = require('../config/s3');
const { v4: uuidv4 } = require('uuid');

//캘린더 조회
exports.getCalendar = async function (req, res) {
  const token = req.cookies.x_auth;
  if (token) {
    const decodedToken = jwt.verify(token, secret.jwtsecret); // 토큰 검증, 복호화
    const user_id = decodedToken.user_id; // user_id를 추출
  
    let date = req.query.selectedYear + req.query.selectedMonth + req.query.selectedDate;
    if (!req.query.selectedYear || !req.query.selectedMonth || !req.query.selectedDate) {
      const today = new Date();
      const selectedYear = String(today.getFullYear()).padStart(4, '0');
      const selectedMonth = String(today.getMonth() + 1).padStart(2, '0');
      const selectedDate = String(today.getDate()).padStart(2, '0');
  
      
      const existingQueryString = req.query;
      
      if (Object.keys(existingQueryString).length === 0) {
        const newURL = `${req.protocol}://${req.get('host')}${req.baseUrl}?selectedYear=${selectedYear}&selectedMonth=${selectedMonth}&selectedDate=${selectedDate}`;
        return res.redirect(newURL);
      }
    }
    // validation
    if(!user_id) {
      return res.send(baseResponse.USER_USERIDX_EMPTY);
    } 
    if (user_id <= 0) {
      return res.send(baseResponse.USER_USERIDX_LENGTH);
    }
    const calendarResult = await calendarService.retrieveCalendar(user_id, date);
    const calendarDataResult = await calendarService.retrieveSelectedCalendar(user_id, date);
    const MindDiaryResult = await calendarService.retrieveCalendar(user_id, date);
    const MindDiaryDataResult = await calendarService.retrieveSelectedMindDiary(user_id, date);
    console.log(MindDiaryDataResult)
    if (calendarResult.length>0){
      console.log("경우2")
        return res.render('calendar/calendar.ejs', { calendarResult: calendarResult, calendarDataResult: calendarDataResult, MindDiaryResult:MindDiaryResult, MindDiaryDataResult:MindDiaryDataResult  });
      }
    else {
      console.log("경우4")
      return res.render('calendar/calendar.ejs', { calendarResult: null, calendarDataResult: calendarDataResult, MindDiaryResult:MindDiaryResult, MindDiaryDataResult:MindDiaryDataResult  });
    }
    
  } else {
    return res.redirect('/');
  }
}

exports.postFile = async function (req, res) {
  console.log("📂 req.file 확인:", req.file);

  const token = req.cookies.x_auth;
  if (!token) return res.redirect('/');

  const decodedToken = jwt.verify(token, secret.jwtsecret);
  const user_id = decodedToken.user_id;
  const date = req.body.fileDate;
  const file = req.file;

  if (!file) {
    return res.send(`<script>alert("파일이 없습니다."); window.location.href = "/calendar";</script>`);
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExt = ['.png', '.jpg', '.jpeg'];
  if (!allowedExt.includes(extension)) {
    return res.send(`<script>alert("지원하지 않는 확장자입니다."); window.location.href = "/calendar";</script>`);
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
    const uploadResult = await s3.upload(params).promise();
    console.log("✅ S3 업로드 성공:", uploadResult); // ✅ 여기가 핵심!
    
    const response = await calendarService.createFileMem(user_id, date, server_name, user_name, extension);
    const newURL = `${req.protocol}://${req.get('host')}${req.baseUrl}?selectedYear=${date.slice(0, 4)}&selectedMonth=${date.slice(4, 6)}&selectedDate=${date.slice(6)}`;
    return res.redirect(newURL);
  } catch (err) {
    console.error('❌ S3 업로드 오류:', err); // 여기 꼭 있어야 함!
    return res.send(`<script>alert("업로드 중 오류 발생."); window.location.href = "/calendar";</script>`);
  }
  
};

exports.postMindDiary = async function (req, res) {
  const token = req.cookies.x_auth;
  if (token) {
      const decodedToken = jwt.verify(token, secret.jwtsecret); // 토큰 검증, 복호화
      const user_id = decodedToken.user_id; // user_id를 추출
      const date = req.query.selectedYear + req.query.selectedMonth + req.query.selectedDate; //쿼리스트링에서 날짜 추출
      //const date = '2023-09-20'
      console.log(req.query);
      const {
        keyword,
        matter,
        change,
        solution,
        compliment
      } = req.body;
      console.log(req.body)
      const createMindDiaryResponse = await calendarService.createMindDiary(
        user_id,
        date,
        keyword,
        matter,
        change,
        solution,
        compliment
      );
      if (createMindDiaryResponse == "성공") {
        const queryString = querystring.stringify(req.query);
        return res.status(200).send(`
          <script>
            if (confirm('마음 일기 등록에 성공했습니다.')) {
              window.location.href = "/calendar?${queryString}";
            }
          </script>
        `);
      } else {
        const queryString = querystring.stringify(req.query);
        return res.send(`
          <script>
            if (confirm('마음 일기 등록에 실패했습니다.')) {
              window.location.href = "/calendar?${queryString}";
            }
          </script>
        `);
      }
  }
  else {
    return res.redirect('/');
  }
}