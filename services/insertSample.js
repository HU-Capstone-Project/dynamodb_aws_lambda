const { BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

module.exports = async (data, ddbClient, rdsClient) => {
  const [nodeid, studyid] = data[0].split(",");
  const headers = data[1].split(",");
  let i = 2;
  let len = data.length;
  try {
    const study = await rdsClient.query("select * from profile where key=$1", [
      studyid,
    ]);
    let latidx = 0,
      longidx = 0,
      timeidx = 0;
    for (let j = 0; j < headers.length; j++) {
      if (headers[j] == "longitude") longidx = j;
      if (headers[j] == "latitude") latidx = j;
      if (headers[j] == "timestamp") timeidx = j;
    }
    if (study.rowCount) {
      const last = data[len - 1].split(",");
      const updated = await rdsClient.query(
        "update profile set end_pos_lat = $1, end_pos_long = $2 where key=$3",
        [last[latidx], last[longidx], studyid]
      );
    } else {
      const last = data[len - 1].split(",");
      const first = data[2].split(",");
      const created = await rdsClient.query(
        "insert into profile(time_received, start_pos_lat, start_pos_long, end_pos_lat, end_pos_long, key, surveyor_id) select to_timestamp($1), $2, $3, $4, $5, $6, id from surveyor where key=$7",
        [
          first[timeidx],
          first[latidx],
          first[longidx],
          last[latidx],
          last[longidx],
          studyid,
          nodeid,
        ]
      );
    }
  } catch (e) {
    console.log(e);
  }
  const request = [];
  const result = [];
  let params;
  while (i < len) {
    try {
      const obj = {
        PutRequest: {
          Item: {
            id: { S: uuidv4() },
            studyid: { S: studyid },
          },
        },
      };

      const vals = data[i].split(",");

      for (let j = 0; j < headers.length; j++) {
        obj.PutRequest.Item[headers[j]] = { N: vals[j] };
      }
      request.push(obj);

      if (request.length == 25) {
        const params = { RequestItems: { study_sample: request } };
        const createResult = await ddbClient.send(
          new BatchWriteItemCommand(params)
        );
        result.push(createResult);
        request.length = 0;
      }
    } catch (e) {
      console.error(e);
      result.push(e);
    }
    i++;
  }

  try {
    if (request.length) {
      params = { RequestItems: { study_sample: request } };
      const createResult = await ddbClient.send(
        new BatchWriteItemCommand(params)
      );
      result.push(createResult);
    }
  } catch (e) {
    console.error(e);
    result.push(e);
  }

  return result;
};
