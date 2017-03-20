var express = require('express');
var https = require('https');
var app = express();
//var fcmClient = require('vendors/fcm_sender.js');
var bodyParser  = require('body-parser');
var FCM = require('fcm-node');
var Exotel = require('exotel-node');
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

app.get('/getUsers', function (req, res) {
  https.get("https://apitest.sewadwaar.rajasthan.gov.in/app/live/Service/hofAndMember/ForApp/WDYYYGG?client_id=ad7288a4-7764-436d-a727-783a977f1fe1",
    function(response,body){
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
      var bhamData = JSON.parse(chunk);
      console.log('BODY: ',bhamData.hof_Details);
      var bhamDataJson = [];

      // get hof details
      var tempobj = createJson(bhamData.hof_Details);

      // get Members details
      for(var memData in bhamData.family_Details)
      {
        bhamData.family_Details[memData].hofMobileNo = bhamData.hof_Details.MOBILE_NO;
        var tempobj = createJson(bhamData.family_Details[memData]);
        bhamDataJson.push(tempobj);
      }
      console.log("bhamDataJson",bhamDataJson);
      //sendNotification();
      //sendMessage();
      res.status(200).send(bhamDataJson);
    });
  });
});

function createJson(rawData){
  var tempobj = {};
  tempobj.bhamashah_id = rawData.BHAMASHAH_ID;
  tempobj.member_id = rawData.M_ID;
  tempobj.name = rawData.NAME_ENG;
  tempobj.dob = rawData.DOB;
  tempobj.education = rawData.EDUCATION_DESC_ENG;
  var address = rawData.BLOCK_CITY+","+ rawData.DISTRICT+","+ rawData.STATE;
  tempobj.location = address;
  tempobj.family_id = rawData.FAMILYIDNO;
  console.log("mobile",rawData.MOBILE_NO);
  if(typeof rawData.MOBILE_NO == "undefined")
  {
      tempobj.mobile_no = rawData.hofMobileNo;
  }
  else{
    tempobj.mobile_no = rawData.MOBILE_NO;
  }
  //tempobj.registration_id = "";
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
            bhamData.family_Details[memData].hofMobileNo = bhamData.hof_Details.MOBILE_NO;
            var tempobj = createJson(bhamData.family_Details[memData]);
            bhamDataJson.push(tempobj);
          }
          res.status(200).send(bhamDataJson);
        });
      });
});

function sendNotification()
{
  var serverKey = 'AAAAzvp6sxM:APA91bHWLT68CiDGaOH7Yc9QDID_o5t8qGwx4G4VYwwJkstqZULurikddyXsHq2_ZHl5Q-qCz3B5b11-fc1r3jCx0d5N2mHvaaURi1NEIJnpXb4LOdBL7oWIa-HdGGuIrUub9pQp9ivB';
  var fcm = new FCM(serverKey);

  var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
      to: 'dCi2iuy_hik:APA91bFTmdu766O9BTSJDX0JCWNMk6bqPI3sxxr1pPsyNR9TV0gzn2rHUXPrb_lU9eA_GmoOoPW4JOtBtPFx17uG0QL1DRqpcU_FEVveCq4vAem05ZTd9bdcItMYSLSE5b9X8mWb3Wuv',

      notification: {
          title: 'Job Alerts from Bhamashah',
          body: 'Check for the perfectly suited jobs'
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

function sendMessage()
{
  Exotel.init('thinkstuds1', 'cb74adaa56652b73bb7e007361a36aeff42df2bf');
  Exotel.sendSMS(['8788659354','8796564649'], "test message", function(error, response) {
  if (!error) {
    console.log(response);
  }
  if(response)
  {
    console.log("Message sent successfully");
  }
});
}

var server = app.listen(8081, function () {

  var host = "127.0.0.1";
  var port = server.address().port;

  console.log("Example app listening at http://%s:%s", host, port)

})
