import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    QueryCommand,
    QueryCommandInput, GetCommand
} from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("Event: ", event);
        const parameters = event?.pathParameters;
        const awardBody = parameters?.awardBody;
        const movieId = parameters?.movieId
            ? parseInt(parameters.movieId)
            : undefined;
        if (!movieId) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Missing movie Id" }),
            };
        }

        if (!awardBody) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Missing award body" }),
            };
        }

        let commandInput: QueryCommandInput = {
            TableName: process.env.TABLE_NAME,
        };


        commandInput = {
            ...commandInput,
            KeyConditionExpression:
                "movieId = :m and begins_with(awardBody, :a) ",
            ExpressionAttributeValues: {
                ":m": movieId,
                ":a": awardBody,
            },
        };


        const commandOutput = await ddbDocClient.send(
            new QueryCommand(commandInput)
        );

        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "No movies found" }),
            };
        }

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ data: commandOutput.Items }),
        };

    } catch (error: any) {
        console.log(JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
    }
};

function createDocumentClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
