---
layout: post
title: "Automatically Exporting Cloudwatch Logs to S3 with Kinesis and Lambda"
date: 2015-06-06 23:48:55 +1000
comments: true
categories: 
---


Amazon [CloudWatch](http://aws.amazon.com/cloudwatch/) is a great service for collecting logs and metrics from your AWS resources. Previously it has been challenging to export and analyze these logs. The announcement of [Kinesis subscriptions](http://aws.amazon.com/about-aws/whats-new/2015/06/amazon-cloudwatch-logs-subscriptions/) for CloudWatch enables a whole new way to work with this service.

This blog post will explain how you can leverage Lambda to create automated data pipelines for CloudWatch, with no dedicated compute resources. The focus will be on exporting logs to objects in S3, but the same concept can be used to enable any sort of custom processing within the constraints of Lambda.

Exporting to S3 is a good place to start as this allows you to run Hive or other log processing software on the exported logs. The source we will as use an example is CloudTrail, however the same method applies to any CloudWatch log. Its worth noting that CloudTrail logs can already be automatically exported to S3 within the AWS console, it is simply used as a convenient source for the log group if you dont have any existing sources.

##Before Starting

You will first need to set up a CloudWatch log group. [Sending CloudTrail Events to CloudWatch Logs](http://docs.aws.amazon.com/awscloudtrail/latest/userguide/cw_send_ct_events.html) explains the steps required if you want to use CloudTrail as the source.

Once you have a log group setup follow the steps in [Real-time Processing of Log Data with Subscriptions](http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/Subscriptions.html). This documentation is quite new so I did come across a few gotchas:

* make sure your aws-cli is completely up to date, you will know its not if <code>aws logs put-subscription-filter</code> is not a valid command
* Configure your Kinesis stream within us-east-1, eu-west-1 or us-west-2, as your stream needs to be in the same region as your Lambda functions for the next steps
* if you are following all the steps in the guide its actually <code>base64 -d</code> not <code>base64 -D</code>

When you have finished setting up your stream it will be useful to copy for the output of ```aws kinesis get-records``` for testing your function later.


##Create a Lambda Function

Ok so now you have a Kinesis stream subscribed to your log group. The next step is to build a Lambda function that will process the events fired by this stream. A great tool for creating lambda functions is [grunt-aws-lambda](https://github.com/Tim-B/grunt-aws-lambda).

Start by creating a function with the hello world template.

![New Lambda Function](/images/posts/cloudwatch_s3/lambda_cropped.png)

For the role it is recommended to start with a new Kinesis Execution role, and then editing it to add S3FullAccess.

Once this is created follow the instructions in grunt-aws-lambda to set up a new project.

The key files you will need to configure are.

```javascript index.js
var AWS = require('aws-sdk');
var zlib = require('zlib')
var async = require('async')

exports.handler = function(event, context) {
    AWS.config = {
        region: 'us-east-1'
    };
    var bucket = new AWS.S3();
    var body = [];
    logs = ""
    async.eachSeries(event.Records, function iterator(record, callback) {

        zlib.gunzip(new Buffer(record.kinesis.data, 'base64'), 
        	function(err, result) {
            logEvents = JSON.parse(result.toString('ascii')).logEvents

            logEvents.forEach(function (log) {
                logs = logs + log.message + "\n"
                });
            callback();
        });

    }, function done(err, results) {

        var now = new Date();
        time_string = now.getFullYear() + 
	        '-' + 
	        now.getMonth() + '-' + 
	        now.getDate() + '-' + 
	        now.getHours() + '-' + 
	        now.getMinutes() + '-' + 
	        now.getSeconds();

        var params = {
            Bucket: 'your_bucket_name',
            Key: 'cloudtrail_' + time_string,
            Body: logs
        };
        bucket.putObject(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
                context.fail();
            }
            context.done(null, 'complete');
        }); 
    });
};
```

Remember to change your_bucket_name to your own S3 bucket.


```json package.json

	{
	  "name": "cloudwatchtos3",
	  "version": "1.0.0",
	  "description": "Processes Kinesis events from CloudWatch",
	  "private": "true",
	  "dependencies": {
	    "async": "1.2.0"
	  },
	  "devDependencies": {
	      "grunt": "0.4.*",
	      "grunt-aws-lambda": "0.3.0",
	      "aws-sdk": "2.0.23",
	      "async": "1,2.0"
	  },
	  "author": "",
	  "license": "BSD"
	}

```

```javascript GruntFile.js
var grunt = require('grunt');
grunt.loadNpmTasks('grunt-aws-lambda');

grunt.initConfig({
    lambda_invoke: {
        default: {
        }
    },
    lambda_deploy: {
        default: {
            options: {
                region: 'us-east-1'
            },
            function: 'cloudwatchtos3'
        }
    },
    lambda_package: {
        default: {
        }
    }
});



grunt.registerTask('deploy', ['lambda_package', 'lambda_deploy']);

```

Remember to change the function name if you have picked a different name, likewise with the region.

To test your function use the following, replacing base64_gzipped_content. A good source for the kinesis data is the output from ```aws kinesis get-records``` from when you set up the Kinesis stream.


```json event.json

	{
	    "Records": [
	        {
	            "kinesis": {
	                "partitionKey": "partitionKey-3",
	                "kinesisSchemaVersion": "1.0",
	                "data": "base64_gzipped_content"
	            },
	            "eventSource": "aws:kinesis",
	            "eventID": "shardId-000000000000:49545115243490985018280067714973144582180062593244200961",
	            "invokeIdentityArn": "arn:aws:iam::059493405231:role/testLEBRole",
	            "eventVersion": "1.0",
	            "eventName": "aws:kinesis:record",
	            "eventSourceARN": "arn:aws:kinesis:us-west-2:35667example:stream/examplestream",
	            "awsRegion": "us-west-2"
	        }
	    ]
	}
```


You can then test your function with ```grunt lambda_invoke```

If all went well there should now be a logfile cloudtrail_timestamp in your s3 bucket.

Once you are happy with the function you can ```grunt deploy```

Now your function is deployed to Lambda and ready to be used

##Add Kinesis Event Source

The final step is to add your Kinesis Stream as an event source for your lambda function.

	aws lambda create-event-source-mapping \
	--region us-east-1 \
	--function-name cloudwatchtos3 \
	--event-source  "the_arn_of_your_kinesis_stream" \
	--batch-size 100 \
	--starting-position TRIM_HORIZON \


When you go to your Lambda function list you should see the following.

![Alt text](/images/posts/cloudwatch_s3/event_cropped.png)

Once the batch is ready the Details will change to ```Batch Size: 100, Last result: OK```. You should also see the log files appearing in your S3 bucket. If there is a error you can check the logs, likely candidates are the wrong permissions. Additionally if you are getting timeouts you can up the timeout limit, I upped it to 10 seconds from 3.


##Finishing Up and Next Steps

If you are just testing this process out don't forget to delete your Kinesis stream, log group and S3 Bucket afterwards.

Now that your log data is in S3 analysis options become extremely flexible. You could import it into EMR or download the data for your own analysis.

Of course with this concept you aren't limited to just exporting to S3. You could use a restrictive subscription for critical errors and trigger alerts within Lambda. Or you could upload logs as documents to CloudSearch. Logs are a [powerful construct](https://martin.kleppmann.com/2015/05/27/logs-for-data-infrastructure.html) for data infrastructure and this concept enables you to build this infrastructure without managing your own computing resources.

##Pricing

Pricing is hard to predict as it depends on volume and timing of log generation. Kinesis will be the biggest driver of costs, with the cost of a single shard and PUT requests coming to around $15 a month. The best way to test pricing is to run the resources for a couple of days with the log that you want to export. Once you are done you can simply delete the Kinesis stream to avoid any further costs. The cost of exporting CloudTrail for 2 days came to under $1 however CloudTrail has a fairly low volume.