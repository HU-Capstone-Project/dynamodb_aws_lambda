const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { Pool } = require("pg");
const {
  insertSample,
  getSamples,
  getCars,
  getProfiles,
  getSurveyors,
} = require("./services");

const rdsConfig = {
  user: "hsntrq",
  password: "not1karachi1water1project",
  database: "krp",
  host: "krp.crjmlcwyfp09.me-central-1.rds.amazonaws.com",
  port: 5432,
};

const ddbClient = new DynamoDBClient({ region: "me-central-1" });
const rdsClient = new Pool(rdsConfig);

exports.apiserver = async (event) => {
  const path = /^\/(\w+)?\/?([\w-]+)?\/?$/i.exec(event.path);
  switch (path[1]) {
    case "insert":
      if (!event.body || event.httpMethod != "POST")
        return {
          statusCode: 403,
          body: JSON.stringify({ message: "Forbidden" }),
        };
      const data = event.body.split("\n");
      const result = await insertSample(data, ddbClient, rdsClient);
      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };

    case "samples":
      return await getSamples(ddbClient, path[2]);

    case "cars":
      return await getCars(rdsClient, path[2]);

    case "profiles":
      return await getProfiles(rdsClient, path[2]);

    case "surveyors":
      return await getSurveyors(rdsClient, path[2]);

    default:
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Not Found" }),
      };
  }
};
