const pool = require('../main');
const calendarModel = require('../models/calendarModel');

exports.retrieveCalendar = async function (userId, date) {
    const calendarResult = await calendarModel.selectCalendar(pool, userId, date);
    return calendarResult;
}
exports.retrieveSelectedCalendar = async function (user_id, date) {
    try {
        const selectedCalendarParams = [user_id, user_id, date];
        const calendarDataResult = await calendarModel.getSelectedCalendar(pool, selectedCalendarParams);

        return calendarDataResult;
    } catch (err) {
        return 'retrieveSelectedCalendarError';
    }
    
}

exports.retrieveSelectedMindDiary = async function (user_id, date) {
  try {
      const selectedMindDiaryParams = [user_id, user_id, date];
   
      const MindDiaryDataResult = await calendarModel.getSelectedMindDiary(pool, selectedMindDiaryParams);
      // console.log(MindDiaryDataResult);
      return MindDiaryDataResult;
  } catch (err) {
      return 'retrieveSelectedMindDiaryError';
  }
  
}


exports.createFileMem = async function ( user_id, date, server_name, user_name, extension) {
    try {
        const insertFileMemParams = [ user_id, date, server_name, user_name, extension];
        console.log("dd");
        await calendarModel.insertFileMem(pool, insertFileMemParams);
        console.log("ddd");
        return '성공';
    } catch (err) {
        return 'createFileMemError';
    }
}

exports.createMindDiary = async function (
  user_id,
  date,
  keyword,
  matter,
  change,
  solution,
  compliment) {
    try {
      insertMindDiaryParams = [
        user_id,
        date,
        keyword,
        matter,
        change,
        solution,
        compliment
      ];
      const mindDiaryResult = await calendarModel.insertMindDiaryInfo(pool, insertMindDiaryParams);
      return "성공"
    } catch (err) {
        return err;
    }  
}