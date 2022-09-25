import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export class ScreenshotPosterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const botToken =
      StringParameter.valueFromLookup(this, 'BOT_TOKEN');
    const channelId =
      StringParameter.valueFromLookup(this, 'CHANNEL_ID');
    const dashboardURL =
      StringParameter.valueFromLookup(this, 'DASHBOARD_URL');

    const fn = new NodejsFunction(this, 'dashboard-screenshot-poster', {
      memorySize: 1600,
      timeout: cdk.Duration.seconds(60),
      runtime: Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, `/../src/index.ts`),
      bundling: {
        nodeModules: ['chrome-aws-lambda', 'puppeteer-core'],
        commandHooks: {
          beforeInstall() {
            return [];
          },
          beforeBundling() {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [`cp -R ${inputDir}/fonts ${outputDir}`];
          },
        }
      },
      environment: {
        BOT_TOKEN: botToken,
        CHANNEL_ID: channelId,
        DASHBOARD_URL: dashboardURL
      }
    });

    const temporaryAllowedIpsParam = StringParameter.fromStringParameterAttributes(this,
      'temporary-allowed-ips',
      {
        parameterName: 'TEMPORARY_ALLOWED_IPS'
      }
    );
    temporaryAllowedIpsParam.grantWrite(fn);

    const rule = new Rule(this, 'dashboard-screenshot-poster-schedule-rule', {
      schedule: Schedule.expression('cron(30 7 ? * MON-FRI *)')
    });
    rule.addTarget(new LambdaFunction(fn));
  }
}
