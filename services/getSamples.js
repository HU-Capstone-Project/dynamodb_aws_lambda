const { ScanCommand } = require("@aws-sdk/lib-dynamodb");

module.exports = async (ddbClient, studyid) => {
  const response = { statusCode: 200 };
  try {
    const params = studyid
      ? {
          TableName: "study_sample",
          ConsistentRead: true,
          FilterExpression: "studyid = :studyid",
          ExpressionAttributeValues: {
            ":studyid": studyid,
          },
        }
      : { TableName: "study_sample", ConsistentRead: true };
    const totalItems = [];
    do {
      const res = await ddbClient.send(new ScanCommand(params));
      totalItems.push(...res.Items);
      params.ExclusiveStartKey = res.LastEvaluatedKey;
    } while (params.ExclusiveStartKey);
    response.body = JSON.stringify(totalItems);
  } catch (e) {
    console.error(e);
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: "Failed to retrieve samples.",
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};
