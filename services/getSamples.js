const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

module.exports = async (ddbClient, studyid) => {
  const response = { statusCode: 200 };
  try {
    const params = studyid
      ? {
          TableName: "profile_sample",
          ConsistentRead: true,
          FilterExpression: "studyid = :studyid",
          ExpressionAttributeValues: {
            ":studyid": studyid,
          },
        }
      : { TableName: "profile_sample", ConsistentRead: true };
    const Items = await ddbClient.send(new ScanCommand(params));
    // response.body = JSON.stringify(Items.map((item) => unmarshall(item)));
    response.body = JSON.stringify(Items);
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
