const { response } = require('express');
const pool = require('../main');
const usersModel = require('../models/usersModel');
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const secret = require('../config/secret');
const baseResponse = require("../config/baseResponseStatus");

// 회원가입
exports.createUser = async function (
  user_id,
  password,
  gd_phone,
  relationship,
  user_name,
  patient_name,
  birth_date,
  gender,
  dementia_registration,
  medication
) {
  try {
    const hashedPassword = await crypto
      .createHash("sha512")
      .update(password)
      .digest("hex");

      // User 테이블 데이터
    const insertUserParams = [
        user_id,         
        hashedPassword,       
        user_name,
        relationship,
        gd_phone    
    ];

    // patient_id 생성
    const patient_id = `${user_id}_${Date.now()}`;

    // Patient 테이블 데이터
    const insertPatientParams = [
      user_id,
      patient_id,
      patient_name,
      birth_date,
      dementia_registration,
      medication,
      gender
    ].map(value => value === undefined ? '' : value);

    // User 테이블에 데이터 삽입
    const result = await usersModel.insertUser(pool, insertUserParams);
    // Patient 테이블에 데이터 삽입
    await usersModel.insertPatient(pool, insertPatientParams);

    return '성공';
  } catch (err) {
    console.error(err);
    return 'createUserError';
  }
};


// 아이디 확인
exports.userIdCheck = async function (user_id) {
  return await usersModel.selectUserId(pool, user_id);
};

// 비밀번호 확인
exports.passwordCheck = async function (selectUserPasswordParams) {
  const result = await usersModel.selectUserPassword(pool, selectUserPasswordParams);
  return result[0];
};

// 이름 조회
exports.accountCheck = async function (user_id) {
  return await usersModel.selectUserAccount(pool, user_id);
};

// 로그인
exports.postSignIn = async function (user_id, password) {
  try {
    // 아이디 존재 확인
    const userIdRows = await exports.userIdCheck(user_id);
    if (userIdRows.length < 1)
      return baseResponse.SIGNIN_EMAIL_WRONG;

    const selectUserId = userIdRows[0].user_id;

    // 비밀번호 확인
    const hashedPassword = await crypto
      .createHash("sha512")
      .update(password)
      .digest("hex");

    const selectUserPasswordParams = [selectUserId, hashedPassword];
    const passwordRow = await exports.passwordCheck(selectUserPasswordParams);

    if (passwordRow.password !== hashedPassword)
      return baseResponse.SIGNIN_PASSWORD_WRONG;

    // 이름 조회
    const userInfoRows = await exports.accountCheck(user_id);
    const userName = userInfoRows[0]?.name || "";

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        user_id: user_id,
        name: userName,
      },
      secret.jwtsecret,
      {
        expiresIn: "7d",
        subject: "user",
      }
    );

    // JWT 저장
    const insertUserJWTParams = [token, user_id];
    await usersModel.insertUserJWT(pool, insertUserJWTParams);

    return {
      user_id: user_id,
      user_name: userName,
      jwt: token,
    };
  } catch (err) {
    console.error("postSignIn error:", err);
    return baseResponse.DB_ERROR;
  }
};