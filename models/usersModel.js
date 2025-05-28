const pool = require('../main');

// 회원가입 (User)
async function insertUser(pool, insertUserParams) {
    
  const insertUserQuery = `
    INSERT INTO User (user_id, password, relationship  , phone_number,name )
    VALUES (?, ?, ?, ?, ?);
  `;

  const [result] = await pool.query(insertUserQuery, insertUserParams);

  return result;
}

// 환자 등록 (Patient)

async function insertPatient(pool,insertPatientParams) {
  const insertPatientQuery = `
    INSERT INTO Patient (user_id, patient_id, name, birth_date, dementia_registration, medication, sex)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  const [result] = await pool.query(insertPatientQuery, insertPatientParams);
  return result;
}

// 환자 목록 조회 (선택)
async function selectPatientsByUserId(pool, user_id) {
  const query = `
    SELECT patient_id, name, birth_date, dementia_registration, medication, sex
    FROM Patient
    WHERE user_id = ?;
  `;
  const [rows] = await pool.query(query, [user_id]);
  return rows;
}

// 아이디 확인
async function selectUserId(pool, user_id) {
  const selectUserIdQuery = `
    SELECT user_id
    FROM User
    WHERE user_id = ?;
  `;
  const [userIdRows] = await pool.query(selectUserIdQuery, [user_id]);
  return userIdRows;
}

// 비밀번호 확인
async function selectUserPassword(pool, selectUserPasswordParams) {
  const selectUserPasswordQuery = `
    SELECT user_id, password
    FROM User
    WHERE user_id = ? AND password = ?;
  `;
  const [rows] = await pool.query(selectUserPasswordQuery, selectUserPasswordParams);
  return rows;
}

// 이름 조회
async function selectUserAccount(pool, user_id) {
  const selectUserAccountQuery = `
    SELECT name
    FROM User
    WHERE user_id = ?;
  `;
  const [rows] = await pool.query(selectUserAccountQuery, [user_id]);
  return rows;
}

// JWT 저장
async function insertUserJWT(pool, insertUserJWTParams) {
  const insertUserJWTQuery = `
    UPDATE User
    SET jwt = ?
    WHERE user_id = ?;
  `;
  const [result] = await pool.query(insertUserJWTQuery, insertUserJWTParams);
  return result;
}

module.exports = {
  insertUser,
  insertPatient,
  selectPatientsByUserId,
  selectUserId,
  selectUserPassword,
  selectUserAccount,
  insertUserJWT,
};