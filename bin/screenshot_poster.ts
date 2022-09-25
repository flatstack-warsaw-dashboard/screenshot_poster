#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ScreenshotPosterStack } from '../lib/screenshot_poster-stack';

const app = new cdk.App();
new ScreenshotPosterStack(app, 'ScreenshotPosterStack', {
  env: {
    account: '157940840475',
    region: 'eu-central-1'
  },
});
