const {
  DynamoDBClient,
  BatchWriteItemCommand,
  ScanCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({ region: "me-central-1" });

exports.bulkdynamodb = async (event) => {
  switch (event.path) {
    case "/insert/":
      if (!event.body)
        return {
          statusCode: 403,
          body: JSON.stringify({ message: "Forbidden" }),
        };
      const data = event.body.split("\n");
      const { nodeid, studyid } = data[0].split(",");
      const headers = data[1].split(",");
      let i = 2;
      let len = data.length;
      const request = [];
      const result = [];
      let params;
      while (i < len) {
        try {
          const obj = {
            PutRequest: {
              Item: {
                id: { S: uuidv4() },
              },
            },
          };

          const vals = data[i].split(",");

          for (let j = 0; j < headers.length; j++) {
            obj.PutRequest.Item[headers[j]] = { N: vals[j] };
          }
          request.push(obj);

          if (request.length == 25) {
            const params = { RequestItems: { profile_sample: request } };
            const createResult = await client.send(
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
        if (request) {
          params = { RequestItems: { profile_sample: request } };
          const createResult = await client.send(
            new BatchWriteItemCommand(params)
          );
          result.push(createResult);
          request.length = 0;
        }
      } catch (e) {
        console.error(e);
        result.push(e);
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
    case "/samples/":
      const response = { statusCode: 200 };
      try {
        const { Items } = await client.send(
          new ScanCommand({ TableName: "profile_sample" })
        );
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

    default:
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Not Found" }),
      };
  }
};
