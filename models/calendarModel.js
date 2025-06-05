

//캘린더 조회
async function getSelectedCalendar(pool, selectedCalendarParams) {

  /*체크사항*/
  const getCheck_listQuery = `
    SELECT check_content, is_check
    FROM check_list
    WHERE user_id = ?
    AND calendar_id = (
      SELECT calendar_id
      FROM calendar
      WHERE user_id = ? 
      AND date = ?
    );
  `;
  /*수면 시간*/
  const getCalendarQuery = `
    SELECT sleep_time , diary
    FROM calendar
    WHERE user_id = ?
    AND calendar_id = (
      SELECT calendar_id
      FROM calendar
      WHERE user_id = ? 
      AND date = ?
    );
  `;
  /*증상*/
  const getSymptomQuery = `
    SELECT symptom_name, degree
    FROM symptom
    WHERE user_id = ?
    AND calendar_id = (
      SELECT calendar_id
      FROM calendar
      WHERE user_id = ? 
        AND date = ?
    )
    AND symptom_name IN ('기억장애', '언어장애', '배회', '계산능력 저하', '성격 및 감정의 변화', '이상행동');
  `;

  //체크 사항
  const [checkRows] = await pool.query(getCheck_listQuery, selectedCalendarParams);
  const check_list  = checkRows.length > 0 ? checkRows.map(row => ({ content: row.check_content, is_check: row.is_check })) : [];

  //잔 시간 //관찰 일기
  const [calendarRows] = await pool.query(getCalendarQuery, selectedCalendarParams);
  const calendar =  {
    sleep_time: "",
    diary: ""
  };
  
  if (calendarRows.length > 0) {
    calendar.sleep_time = calendarRows[0].sleep_time;
    calendar.diary = calendarRows[0].diary;

  }

  //증상
  const [symptomRows] = await pool.query(getSymptomQuery, selectedCalendarParams);

  const symptom_list = symptomRows.length > 0 ? symptomRows.map(row => ({ symptom_name: row.symptom_name, degree: row.degree})) : [];
  return {check_list, calendar, symptom_list}; //hospital_schedule 제외
}





//캘린더 저장(post)
async function insertCalInfo(pool, deleteCalendarParams, insertCalendarParams, getCalendarIdParams, user_id, check_content, is_check,  symptom_range){
  const symptom_text = ["기억장애", "언어장애", "배회", "계산능력 저하", "성격 및 감정의 변화", "이상행동"];
  let calendar_id;
  // try{
    // console.log(symptom_range);
    //1. 캘린더 insert 
    const deleteCalendarQuery = `
    DELETE FROM calendar WHERE user_id = ? AND \`date\` = ?;
    `;
    const insertCalendarQuery = `
      INSERT INTO calendar (user_id, \`date\`, sleep_time, diary) VALUES (?, ?, ?, ?);
    `;
    //2. 캘린더에서 해당 id select
    const getCalendarIdQuery = `
    SELECT calendar_id FROM calendar WHERE  user_id = ? AND \`date\` = ?;
    `;
    
    //4. map 이용해 캘린더에서 checkContent 길이만큼 쿼리 생성(delete)
    const deleteCheck_listQueries = check_content.map(() => `
    DELETE FROM check_list WHERE calendar_id = ? AND user_id = ? AND check_content = ?;
    `);

    //5. map 이용해 캘린더에서 checkContent 길이만큼 쿼리 생성(insert)
    const insertCheck_listQueries = check_content.map(() => `
    INSERT INTO check_list (calendar_id, user_id, check_content, is_check) VALUES (?, ?, ?, ?);
    `);

    //6. 증상 insert
    const deleteSymptomQueries = symptom_text.map(() => {
      return `
      DELETE FROM symptom WHERE calendar_id = ? AND user_id = ?; 
      `;
    });
   
    const insertSymptomQueries = symptom_text.map((symptom_name, index) => {
      if (symptom_name == undefined|| symptom_name == '')
        return null
      return `
      INSERT INTO symptom (calendar_id, user_id, symptom_name,  degree) VALUES (?, ?, ?, ?);
      `;
    });
 
  const connection = await pool.getConnection();
  
  try {
      await connection.query('START TRANSACTION');
      await connection.query(deleteCalendarQuery, deleteCalendarParams);
      await connection.query(insertCalendarQuery, insertCalendarParams);
      const [calendarIDRow] =  await connection.query(getCalendarIdQuery, getCalendarIdParams);
      calendar_id = calendarIDRow[0].calendar_id;
      
      //가져온 calendar id로 params 동적으로 checkcontents 파라미터 만듦(delete)
      const deleteCheck_listParams = check_content.flatMap((checkContent, index) => [
      calendar_id,
      user_id,
      checkContent,
      ]);
      //가져온 calendar id로 params 동적으로 checkcontents 파라미터 만듦(insert)
      const insertCheck_listParams = check_content.flatMap((checkContent, index) => [
      calendar_id,
      user_id,
      checkContent,
      is_check[index]
      ]);

      for (let i = 0; i < deleteCheck_listQueries.length; i++) {
        await connection.query(deleteCheck_listQueries[i], deleteCheck_listParams.slice(i * 3, (i + 1) * 3));
      }
      
      for (let i = 0; i < insertCheck_listQueries.length; i++) {
        await connection.query(insertCheck_listQueries[i], insertCheck_listParams.slice(i * 4, (i + 1) * 4));
      }

      //가져온 calendar id로 params 동적으로 Symptoms 파라미터 만듦(delete)
      const deleteSymptomParams = symptom_text.flatMap(() => [
        calendar_id,
        user_id
      ]);
      //가져온 calendar id로 params 동적으로 Symptoms 파라미터 만듦(insert)
      const insertSymptomParams = symptom_text.flatMap((symptom_name, index) => {
      return [
        calendar_id,
        user_id,
        symptom_name,
        symptom_range[index]
      ];
    });

    for (let i = 0; i < deleteSymptomQueries.length; i++) {
      const query = deleteSymptomQueries[i];
      if (query !== null) {
        await connection.query(query, deleteSymptomParams);
      }
    }
    for (let i = 0; i < insertSymptomQueries.length; i++) {
      const query = insertSymptomQueries[i];
      if (query !== null) {
        await connection.query(query, insertSymptomParams.slice(i * 4, (i + 1) * 4));
      }
    }
    await connection.query('COMMIT');
  } catch (error) {
      await connection.query('ROLLBACK');
      console.log(error);
      throw error;
  } finally {
      connection.release();
  }
}
// file_memories
async function selectCalendar(pool, userId, date) {
  const selectCalendarQuery = `
    SELECT server_name, extension
    FROM file_memories
    WHERE user_id = ?
      AND calendar_id = (
        SELECT calendar_id
        FROM calendar
        WHERE user_id = ?
          AND date = ?
      )
  `;
  const [userRow] = await pool.query(selectCalendarQuery, [userId, userId, date]);
  return userRow;
}

// 파일 업로드
async function insertFileMem(pool, insertFileMemParams) {
  try{
  const connection = await pool.getConnection();

  const getCalendarIdQuery = `
    SELECT calendar_id FROM calendar WHERE  user_id = '${insertFileMemParams[0]}' AND \`date\` = '${insertFileMemParams[1]}' ;
    `;
    
  const insertFileMemQuery = `INSERT INTO file_memories (user_id, calendar_id, server_name, user_name, extension)
      VALUES (?, ?, ?, ?, ?);
  `;
  

  var [calendarIDRow] =  await connection.query(getCalendarIdQuery);  
  var calendar_id;
  if (calendarIDRow && calendarIDRow.length > 0) {
    calendar_id = calendarIDRow[0].calendar_id;
    console.log("calId: " + calendar_id);
  } else {
    console.log("No calendar ID found.");
    const insertCalendarQuery = `
      INSERT INTO calendar (user_id, date) VALUES ('${insertFileMemParams[0]}' , '${insertFileMemParams[1]}' );
    `;
    await connection.query(insertCalendarQuery);
    [calendarIDRow] =  await connection.query(getCalendarIdQuery); 
    calendar_id = calendarIDRow[0].calendar_id;
    console.log("calId: " + calendar_id);

  }

  //가져온 calendar id로 params 수정
  insertFileMemParams[1] = calendar_id;    
  console.log(insertFileMemParams);
  const [insertFileRow] =  await connection.query(insertFileMemQuery, insertFileMemParams);  

  return {calendarIDRow, insertFileRow};
  }catch (error) {
      console.log(error);
  }
}


//mind diary 조회

async function getSelectedMindDiary(pool, selectedMindDiaryParams) {
  const getMindDiary_listQuery = `
    SELECT keyword, matter, \`change\`, solution, compliment
    FROM mind_diary
    WHERE user_id = ?
    AND mind_diary_id = (
      SELECT mind_diary_id
      FROM mind_diary
      WHERE user_id = ?
      AND \`date\` = ?
    );
  `;

  const [mindDiaryRows] = await pool.query(getMindDiary_listQuery, selectedMindDiaryParams);
  
  const MindDiary_list = {
    keyword: "",
    matter: "",
    change: "",
    solution: "",
    compliment: ""
  };

  if (mindDiaryRows.length > 0) {
    MindDiary_list.keyword = mindDiaryRows[0].keyword;
    MindDiary_list.matter = mindDiaryRows[0].matter;
    MindDiary_list.change = mindDiaryRows[0].change;
    MindDiary_list.solution = mindDiaryRows[0].solution;
    MindDiary_list.compliment = mindDiaryRows[0].compliment;
  }

  return {MindDiary_list};
}

async function insertMindDiaryInfo(pool, insertMindDiaryParams) {
  const user_id = insertMindDiaryParams[0];
  const date = insertMindDiaryParams[1];

  const checkCalendarQuery = `
    SELECT calendar_id FROM calendar WHERE user_id = ? AND date = ?
  `;
  const insertCalendarQuery = `
    INSERT INTO calendar (user_id, date) VALUES (?, ?)
  `;
  const deleteMindDiaryQuery = `
    DELETE FROM mind_diary WHERE user_id = ? AND date = ?
  `;
  const insertMindDiaryQuery = `
    INSERT INTO mind_diary (user_id, date, keyword, matter, \`change\`, solution, compliment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [calendarCheck] = await connection.query(checkCalendarQuery, [user_id, date]);
    if (calendarCheck.length === 0) {
      await connection.query(insertCalendarQuery, [user_id, date]);
    }

    await connection.query(deleteMindDiaryQuery, [user_id, date]);
    await connection.query(insertMindDiaryQuery, insertMindDiaryParams);

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error(err);
    throw err;
  } finally {
    connection.release();
  }
}


module.exports = {
  selectCalendar,
  insertFileMem,
  getSelectedCalendar,
  insertCalInfo,
  // selectMindDiary,
  getSelectedMindDiary,
  insertMindDiaryInfo
}