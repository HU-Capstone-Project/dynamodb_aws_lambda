module.exports.getCars = async (client, id) => {
  const response = { statusCode: 200 };
  try {
    const q = `select * from car ${id ? `where id=${id}` : ""}`;
    const res = await client.query(q);
    response.body = JSON.stringify(res.rows);
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: "Failed to retrieve cars.",
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};

module.exports.getSurveyors = async (client, id) => {
  const response = { statusCode: 200 };
  try {
    const q = `select * from surveyor join car on car.id=car_id ${
      id ? `where surveyor.id=${id}` : ""
    } `;
    const res = await client.query(q);
    response.body = JSON.stringify(res.rows);
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: "Failed to retrieve surveyors.",
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};

module.exports.getProfiles = async (client, id) => {
  const response = { statusCode: 200 };
  try {
    const q = `select profile.id, time_received,start_pos_lat,start_pos_long,end_pos_lat,end_pos_long,profile.key,surveyor_id,name from profile join surveyor on surveyor.id=surveyor_id ${
      id ? `where surveyor.id=${id}` : ""
    } `;
    const res = await client.query(q);
    response.body = JSON.stringify(res.rows);
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: "Failed to retrieve profiles.",
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};
