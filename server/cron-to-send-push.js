var schedule = require('node-schedule');
var https = require('https');
var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(2, 2)];
rule.hour = 07;
rule.minute = 41;

var FCM = require('fcm-node');
var Exotel = require('exotel-node');

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/swarojgar';

function sendNotification(title, body, to) {
  var serverKey = 'AAAAzvp6sxM:APA91bHWLT68CiDGaOH7Yc9QDID_o5t8qGwx4G4VYwwJkstqZULurikddyXsHq2_ZHl5Q-qCz3B5b11-fc1r3jCx0d5N2mHvaaURi1NEIJnpXb4LOdBL7oWIa-HdGGuIrUub9pQp9ivB';
  var fcm = new FCM(serverKey);

  var message = {
      to: to,
      notification: {
          title: title,
          body: body
      },
  };
  fcm.send(message, function(err, response){
      if (err) {
          console.log("Something has gone wrong!");
      } else {
          console.log("Successfully sent with response: ", response);
      }
  });
}

function sendMessage(title, message, to) {
  Exotel.init('thinkstuds1', 'cb74adaa56652b73bb7e007361a36aeff42df2bf');
  Exotel.sendSMS(to, title + ' .' + message, function(error, response) {
    if (!error) {
      console.log(response);
    }
    if(response)
    {
      console.log("Message sent successfully");
    }
  });
}

function getDistanceScore(destination, source, scores) {
  let qPromise = require('promised-io/promise'),
    deferred = qPromise.defer();

  https
  .get('https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + source.replace(' ', '+') + '&destinations=' + destination.replace(' ', '+') +'&mode=driving&language=fr-FR&key=AIzaSyDt7kDTjXsXVbunB-6ZaIJQbmTFcADdCeo',
    function(response, body) {
      response.setEncoding('utf8');
      response.on('data', function (chunk) {
        var locScore = 0;
        try {
            var json = JSON.parse(chunk),
              distance = Number(json.rows[0].elements[0].distance.value)/1000;

            if (distance > 1000) {
              locScore = 5;
            } else if (distance > 850) {
              locScore = 4;
            } else if (distance > 600) {
              locScore = 3;
            } else if (distance > 400) {
              locScore = 2;
            } else if (distance > 300) {
              locScore = 1;
            }
        } catch (e) {
            locScore = 0;
        }
        deferred.resolve({locScore: locScore, scores: scores});
      });
    });
  return deferred.promise;
}

function findJobs (criteria, jobs) {
  let scoreOnExp = 0,
    scoreOnLocation = 0,
    scoreOnIndustry = 0,
    scoreOnEducation = 0;

  return jobs.filter(function (job) {
    const q = require('promised-io/promise'),
      deferred = q.defer();

    scoreOnExp = 0;
    scoreOnLocation = 0;
    scoreOnIndustry = 0;
    scoreOnEducation = 0;

    const expExtractedFromStr = ((((job.experience[0] || '').split(':') || [])[1] || '').trim().match(/\d/g) || [])[0] || 0;
    scoreOnExp = Math.abs(expExtractedFromStr ? expExtractedFromStr - criteria.experience : 0);

    getDistanceScore(
      job.location,
      criteria.location, {
        scoreOnExp: scoreOnExp,
        scoreOnLocation: scoreOnLocation,
        scoreOnIndustry: scoreOnIndustry,
        scoreOnEducation: scoreOnEducation
      })
      .then(function (score) {
        console.log('Final Score :: ' + (score.scores.scoreOnExp + score.locScore + score.scores.scoreOnIndustry + score.scores.scoreOnEducation));
        deferred.resolve((score.scores.scoreOnExp + score.locScore + score.scores.scoreOnIndustry + score.scores.scoreOnEducation) < 5);
      });
    return deferred.promise;
  });
}

var j = schedule.scheduleJob(rule, function(){
  console.log('Cron is running successfully...!!');

  MongoClient.connect(url, function(err, db) {
    var jobStore = db.collection('job_store');
    try {
      jobStore.find({
        "lastModified": {
          $gt: new Date(Date.now() - 24*60*60*10 * 1000)
        }
      })
      .toArray(function (err, results) {
        if (err) { db.close(); return false; }

        var jobs = results;
        var userStore = db.collection('user_store');
        userStore.find({})
        .toArray(function (err, results) {
          if (err) { db.close(); return false; }
          var users = results;
          for (var i = 0; i < users.length; i += 1) {
            var user = users[i];

            var matchedJobs = findJobs(user, jobs) || [],
              title = '',
              message = '',
              titles = matchedJobs.map(function (jobEach) {
                return jobEach.title
              })
              .filter(function (obj) {
                return obj;
              });

            if (matchedJobs && matchedJobs.length > 0) {
              title = "Found " + matchedJobs.length + ' jobs for you this week.';
              message = titles.join(', ');

              sendMessage(title, message, user.mobile || '8788659354');
              sendNotification(title, message, user.registration_id);
            }
          }
        });
      });
    } catch (e) {

    }
  });
});
