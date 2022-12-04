const { ScanCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

module.exports = async (ddbClient, studyid) => {
  const response = { statusCode: 200 };
  try {
    const params = studyid
      ? {
          TableName: "profile_sample",
          FilterExpression: "studyid = :studyid",
          ExpressionAttributeValues: {
            ":studyid": studyid,
          },
        }
      : { TableName: "profile_sample" };
    const { Items } = await ddbClient.send(new ScanCommand(params));
    response.body = JSON.stringify(Items.map((item) => unmarshall(item)));
  } catch (e) {
    console.error(e);
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: "Failed to retrieve posts.",
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};
