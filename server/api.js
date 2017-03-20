var express = require('express');
var https = require('https');
var app = express();
var bodyParser  = require('body-parser');
var gcm = require('node-gcm');
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/swarojgar';

var fs = require("fs");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.options("/*", function(req, res, next){
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  res.sendStatus(200);
});

// app.get('/getUsers', function (req, res) {
//   https.get("https://apitest.sewadwaar.rajasthan.gov.in/app/live/Service/hofAndMember/ForApp/WDYYYGG?client_id=ad7288a4-7764-436d-a727-783a977f1fe1",
//     function(response,body){
//     response.setEncoding('utf8');
//     response.on('data', function (chunk) {
//       var bhamData = JSON.parse(chunk);
//       console.log('BODY: ',bhamData.hof_Details);
//       var bhamDataJson = [];
//
//       // get hof details
//       var tempobj = createJson(bhamData.hof_Details);
//
//       // get Members details
//       for(var memData in bhamData.family_Details)
//       {
//         var tempobj = createJson(bhamData.family_Details[memData]);
//         bhamDataJson.push(tempobj);
//       }
//       console.log("bhamDataJson",bhamDataJson);
//       res.status(200).send(bhamDataJson);
//     });
//   });
// });

function createJson(rawData){
  var tempobj = {};
  tempobj.bhamashah_id = rawData.BHAMASHAH_ID;
  tempobj.member_id = rawData.M_ID;
  tempobj.name = rawData.NAME_ENG;
  tempobj.dob = rawData.DOB;
  tempobj.education = rawData.EDUCATION_DESC_ENG;
  var address = rawData.BLOCK_CITY+","+ rawData.DISTRICT+","+ rawData.STATE;
  tempobj.location = address;
  tempobj.relation = rawData.RELATION_ENG;
  tempobj.family_id = rawData.FAMILYIDNO;
  console.log("mobile",rawData.MOBILE_NO);
  if(typeof rawData.MOBILE_NO == "undefined")
  {
      tempobj.mobile_no = rawData.hofMobileNo;
  }
  else{
    tempobj.mobile_no = rawData.MOBILE_NO;
  }
  return tempobj;
}

app.post('/saveJobs', function (req, res) {
  var reqs = req.body || {};
  console.log("savejobs",reqs);
  res.send(200);
});

app.post('/jobDetails', function(req, res){
  var reqs = req.body || {},
    family_id = req.body.family_id || 'WDYYYGG',
    registration_id = req.body.registration_id,
    client_id = 'ad7288a4-7764-436d-a727-783a977f1fe1';

  console.log('POST Request :: (jobDetails) :: {@family_id}' + family_id + ' ::: {@registration_id} ' + registration_id);
  https
    .get("https://apitest.sewadwaar.rajasthan.gov.in/app/live/Service/hofAndMember/ForApp/" + family_id + '?client_id=' + client_id,
      function(response,body) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          var bhamData = JSON.parse(chunk);
          console.log(bhamData);

          var bhamDataJson = [];
          // get hof details
          var tempobj = createJson(bhamData.hof_Details);
          bhamDataJson.push(tempobj);

          // get Members details
          for(var memData in bhamData.family_Details)
          {
            var tempobj = createJson(bhamData.family_Details[memData]);
            tempobj.registration_id = registration_id;
            bhamDataJson.push(tempobj);
          }
          res.status(200).send(bhamDataJson);
        });
      });
});

function getDistanceScore(destination, source) {
  let qPromise = require('promised-io/promise'),
    deferred = qPromise.defer();

  https
  .get('https://maps.googleapis.com/maps/api/distancematrix/json?origins=' + source.replace(' ', '+') + '&destinations=' + destination.replace(' ', '+') +'&mode=driving&language=fr-FR&key=AIzaSyDt7kDTjXsXVbunB-6ZaIJQbmTFcADdCeo',
    function(response,body) {
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
            console.log('Distance :: ' + distance);
        } catch (e) {
            locScore = 0;
        }
        console.log('LocScore :: ' + locScore);
        deferred.resolve(locScore);
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

    getDistanceScore(job.location, criteria.location)
      .then(function (score) {
        deferred.resolve(scoreOnExp + score + scoreOnIndustry + scoreOnEducation < 7);
      });
    return deferred.promise;
  });
}

function getJobs(criteria) {
  var q = require('promised-io/promise'),
    deferred = q.defer();

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
        console.log('Jobs since past 10 days :: ');
        console.log(results);
        deferred.resolve(findJobs(criteria, results));
      });
    } catch (e) {
      deferred.resolve({success: false});
    }
  });
  return deferred.promise;
}

app.get('/getJobs', function (req, res) {
  var filter = req.param('filter'),
    q = require('promised-io/promise'),
    deferred = q.defer();

  MongoClient.connect(url, function(err, db) {
    var jobStore = db.collection('job_store');
    try {
      jobStore.find({
        source: filter
      })
      .toArray(function (err, results) {
        if (err) { db.close(); return false; }
        res.status(200).send({success: true, matchedJobs: results});
      });
    } catch (e) {
      res.status(200).send({success: false, matchedJobs: []});
    }
  });
});

app.post('/submitDetails', function(req, res){
  var reqs = req.body || {},
    family_id = req.body.family_id || 'WDYYYGG',
    member_id = req.body.member_id,
    registration_id = req.body.registration_id,
    experience = req.body.experience,
    industry = req.body.industry,
    user = req.body.user,
    client_id = 'ad7288a4-7764-436d-a727-783a977f1fe1';

  console.log('POST Request :: (submitDetails) :: \n{@family_id}' + family_id +
  ' ::: \n{@member_id} ' + member_id +
  ' ::: \n{@experience} ' + experience +
  ' ::: \n{@industry} ' + industry +
  ' ::: \n{@registration_id} ' + registration_id);

  MongoClient.connect(url, function(err, db) {
    var userStore = db.collection('user_store');
    try {
      userStore.insert({
        _id: member_id,
        member_id: member_id,
        family_id: family_id,
        experience: experience,
        industry: industry,
        bhamashah_id: user.bhamashah_id,
        education: user.education,
        location: user.location,
        mobile: user.mobile_no,
        registration_id: registration_id,
        lastModified: new Date()
      });
      getJobs({
        experience: experience,
        industry: industry,
        education: user.education,
        location: user.location
      }).then(function (data) {
        res.status(200).send({success: true, matchedJobs: data});
      });
    } catch (e) {
      console.log('Error inserting record from {@member_id} :: ' + member_id + ' in user_store database');
      getJobs({
        experience: experience,
        industry: industry,
        education: user.education,
        location: user.location
      }).then(function (data) {
        res.status(200).send({success: true, matchedJobs: data});
      });
    }
  });
});

app.post('/submitJob', function(req, res){
  var reqs = req.body || {},
    education = req.body.education,
    experience = req.body.experience,
    location = req.body.location,
    company = req.body.company,
    title = req.body.title,
    source = 'bhamashah_portal';

  console.log('POST Request :: (÷) :: \n{@education}' + education +
  ' ::: \n{@experience} ' + experience +
  ' ::: \n{@location} ' + location +
  ' ::: \n{@company} ' + company +
  ' ::: \n{@title} ' + title +
  ' ::: \n{@source} ' + source);

  MongoClient.connect(url, function(err, db) {
    var userStore = db.collection('job_store');
    try {
      userStore.insert({
        experience: experience,
        education: education,
        location: location,
        company: company,
        title: title,
        source: source,
        lastModified: new Date()
      });
      res.status(200).send({success: true});
    } catch (e) {
      res.status(200).send({success: false});
    }
  });
});

var server = app.listen(8081, function () {

  var host = "127.0.0.1";
  var port = server.address().port;

  console.log("Example app listening at http://%s:%s", host, port)

})
