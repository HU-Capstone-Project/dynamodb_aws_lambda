const { BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

module.exports = async (data, ddbClient, rdsClient) => {
  const [nodeid, studyid] = data[0].split(",");
  const headers = data[1].split(",");
  let i = 2;
  let len = data.length;

  const request = [];
  const result = [];
  let latidx = 0;
  let longidx = 0;
  let timeidx = 0;
  let Acc_x1idx = 0;
  let Acc_y1idx = 0;
  let Acc_z1idx = 0;
  let Acc_x2idx = 0;
  let Acc_y2idx = 0;
  let Acc_z2idx = 0;
  try {
    const study = await rdsClient.query("select * from profile where key=$1", [
      studyid,
    ]);

    for (let j = 0; j < headers.length; j++) {
      if (headers[j] == "longitude") longidx = j;
      if (headers[j] == "latitude") latidx = j;
      if (headers[j] == "timestamp") timeidx = j;
      if (headers[j] == "Ax") Acc_x1idx = j;
      if (headers[j] == "Ay") Acc_y1idx = j;
      if (headers[j] == "Az") Acc_z1idx = j;
      if (headers[j] == "Ax2") Acc_x2idx = j;
      if (headers[j] == "Ay2") Acc_y2idx = j;
      if (headers[j] == "Az2") Acc_z2idx = j;
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
        "insert into profile(time_received, start_pos_lat, start_pos_long, end_pos_lat, end_pos_long, key, surveyor_id) select to_timestamp($1), $2, $3, $4, $5, $6, surveyor.id from surveyor where surveyor.key=$7",
        [
          first[timeidx]/1000,
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
    result.push(e.stack);
  }
  let params;
  let IRI1 = 0;
  let Az_n_1 = 0;
  let Az_HPF_n_1 = 0;
  let del_time = 0;
  let Az_HPF_n;
  let Az_n;
  let IRI2 = 0;
  let Az2_n_1 = 0;
  let Az2_HPF_n_1 = 0;
  let Az2_HPF_n;
  let Az2_n;

  while (i < len) {
    try {
      const vals = data[i].split(",");
      Az_n = vals[Acc_z1idx];
      Az2_n = vals[Acc_z2idx];
      Az_HPF_n = -0.4286 * Az_HPF_n_1 + 0.2862 * Az_n - 0.2852 * Az_n_1;
      Az2_HPF_n = -0.4286 * Az2_HPF_n_1 + 0.2862 * Az2_n - 0.2852 * Az2_n_1;
      if (i > 2) {
        const vals_old = data[i - 1].split(",");
        del_time = vals[timeidx] - vals_old[timeidx];
        Az_avg = (Az_HPF_n + Az_HPF_n_1) / 2;
        Az2_avg = (Az2_HPF_n + Az2_HPF_n_1) / 2;
        IRI1 = (Math.abs(Az_avg) * del_time) ^ 2;
        IRI2 = (Math.abs(Az2_avg) * del_time) ^ 2;
        Az_n_1 = Az_n;
        Az2_n_1 = Az2_n;
        Az_HPF_n_1 = Az_HPF_n;
        Az2_HPF_n_1 = Az2_HPF_n;
      }

      const obj = {
        PutRequest: {
          Item: {
            id: { S: uuidv4() },
            studyid: { S: studyid },
            iri1: { N: IRI1.toString() },
            iri2: { N: IRI2.toString() },
          },
        },
      };

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
      result.push(e.stack);
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
