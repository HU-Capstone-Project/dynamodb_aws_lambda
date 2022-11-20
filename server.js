const {
  DynamoDBClient,
  BatchWriteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({ region: "me-central-1" });

exports.bulkdynamodb = async (event) => {
  let response;
  switch (event.path) {
    case "/insert/":
      const data = event.body.split("\n");
      const { nodeid, studyid } = data[0].split(",");
      const headers = data[1].split(",");
      let i = 2;
      let len = data.length;
      const request = [];
      const result = [];
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
          const params = { RequestItems: { profile_sample: request } };
          const createResult = await client.send(
            new BatchWriteItemCommand(params)
          );
          result.push([createResult, params]);
          request.length = 0;
        }
      } catch (e) {
        console.error(e);
        result.push(e);
      }

      response = {
        statusCode: 200,
        body: JSON.stringify(result),
      };
      return response;
    default:
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Not Found" }),
      };
  }
};
