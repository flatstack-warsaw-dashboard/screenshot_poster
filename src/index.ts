import { SSMClient, PutParameterCommand, ParameterType } from "@aws-sdk/client-ssm";
import { WebClient } from "@slack/web-api";

import chromium = require("chrome-aws-lambda");
import http = require("http");

const ssmClient = new SSMClient({ region: "eu-central-1" });

const currentLambdaIP = () => {
  return new Promise((resolve, reject) => {
    http.request("http://checkip.amazonaws.com", (res) => {
      res.on("data", ip => resolve(ip.toString().trim()));
    }).on("error", (err) => {
      reject(err);
    }).end();
  });
};

const setTemporaryAllowedIp = async (ip: any) => {
  await ssmClient.send(new PutParameterCommand({
    Name: "TEMPORARY_ALLOWED_IPS",
    Type: ParameterType.STRING,
    Overwrite: true,
    Value: ip
  }));
};

export const handler = async (event: any, context: any, callback: any) => {
  const ip = await currentLambdaIP();

  if (ip) {
    await setTemporaryAllowedIp(ip);
  } else {
    callback(new Error("Can't detect lambda IP"));
  }

  await chromium.font("/var/task/fonts/NotoColorEmoji.ttf");
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();

  await page.goto(process.env.DASHBOARD_URL || "");

  // some widgets cold start can be long, we have to wait them all :)
  await new Promise(r => setTimeout(r, 5000));

  const screenshot = await page.screenshot({ fullPage: true }) as Buffer;

  try {
    const response = await new WebClient(process.env.BOT_TOKEN).files.upload({
      channels: process.env.CHANNEL_ID,
      initial_comment: "Today's Dashboard :wave:",
      file: screenshot
    });
    console.info(response);
  } catch (error) {
    console.error(error);
  }

  await setTemporaryAllowedIp("127.0.0.1");
}
