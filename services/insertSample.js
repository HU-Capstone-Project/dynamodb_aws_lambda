const { BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

module.exports = async (data, ddbClient, rdsClient) => {
  const [nodeid, studyid] = data[0].split(",");
  const headers = data[1].split(",");
  let i = 2;
  let len = data.length;
  const deg2rad = 0.01745; // Converts Degrees to Radians
  const R_earth = 6371000;      // Radius of Earth in m

  // Filter Specifications
 
  const Ts = 0.01;      // Sampling Frequency in Hz

  // High Filter Parameters in S-Domain
  const SZ_HPF = 0.34;
  const SP_HPF = 500;
  const G_HPF = 1;

  // Deriving Coefficients for Discrete Filter from S-Domain parameters
  const a0_HPF = SZ_HPF*Ts + 2;
  const a1_HPF = SZ_HPF*Ts - 2;
  const b0_HPF = SP_HPF*Ts + 2;
  const b1_HPF = SP_HPF*Ts - 2;

  try {
    const study = await rdsClient.query("select * from profile where key=$1", [
      studyid,
    ]);
    let latidx = 0,
      longidx = 0,
      timeidx = 0,
      Acc_x1idx=0,
      Acc_y1idx=0,
      Acc_z1idx=0,
      Acc_x2idx=0,
      Acc_y2idx=0,
      Acc_z2idx=0;
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
  let IRI, // Initializing the variables used in the code
    Az_n_1 = 0,
    Az_HPF_n_1 = 0,
    del_time = 0,
    Az_HPF_n,
    Az_n;
 
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
      Az_n = vals[Acc_z1idx];
      Az_HPF_n = (-0.4286)*Az_HPF_n_1 + 0.2862*Az_n - 0.2852*Az_n_1;
      if (i > 2) {
        const vals_old = data[i-1].split(",");
        del_time = vals[timeidx] - vals_old[timeidx];
        Az_avg = (Az_HPF_n + Az_HPF_n_1)/2;
        IRI = Math.abs(Az_avg) * del_time^2;
        Az_n_1 = Az_n;
        Az_HPF_n_1 = Az_HPF_n;
      }
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
