import express from "express";
import fetch, { RequestInit } from "node-fetch";
import { awsProxyFrom } from "./aws-proxy";
import { getUserConfig } from "./userConfig";

export interface LamdaRequest {
  headers: {};
  body: string;
}

export type LamdaResponse = LamdaRequest & {
  multiValueHeaders: {
    [key: string]: string[];
  };
  statusCode: number;
  isBase64Encoded: false;
};

export type LamdaResult = {
  response?: LamdaResponse;
  request: LamdaRequest;
  isSuccess: boolean;
  error?: Error;
  proxy: {};
};

/**
 * Creates AWS lamda request to send to Lamda mock server
 * @param payload Payload to include in request
 */
export const lamdaRequestFrom = (payload: {}): RequestInit => {
  return {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-requested-with": "XMLHttpRequest"
    },
    redirect: "follow", // set to `manual` to extract redirect headers, `error` to reject redirect

    body: JSON.stringify({
      payload: JSON.stringify(payload),
      profile: null,
      region: "us-west-2"
    }),
    method: "POST"
  };
};

/**
 * Interfaces with AWS Lamda Mock Server function handler
 * @param params Parameters from Rest request
 */
export const getLamdaResult = async ({
  body,
  headers,
  method,
  path,
  statusCode
}: express.Request): Promise<LamdaResult> => {
  const userConfig = getUserConfig();

  const proxy = awsProxyFrom({
    ...{
      body,
      headers,
      method,
      path: path.replace(/^\/+/, "")
    },
    ...userConfig
  });

  const lamdaRequest = lamdaRequestFrom(proxy);
  const fetchResponse = await fetch(userConfig.entryPoint, lamdaRequest);
  const request: LamdaRequest = {
    body,
    headers,
  };
  try {
    const response: LamdaResponse = JSON.parse(
      JSON.parse(await fetchResponse.text())["response"]
    );
    return {
      response,
      isSuccess: true,
      proxy,
      request
    };
  } catch (error) {
    return {
      error,
      isSuccess: false,
      proxy,
      request
    };
  }
};
