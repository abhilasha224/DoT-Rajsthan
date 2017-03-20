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

app.post('/jobDetails', function(req, res){
  var reqs = req.body || {},
    family_id = req.body.family_id || 'WDYYYGG',
    registration_id = req.body.registration_id,
    client_id = 'ad7288a4-7764-436d-a727-783a977f1fe1';

  console.log('POST Request :: (jobDetails) :: {@bhamashah_id}' + bhamashah_id + ' ::: {@registration_id} ' + registration_id);
  https
    .get("https://apitest.sewadwaar.rajasthan.gov.in/app/live/Service/hofAndMember/ForApp/" + family_id + '?client_id=" + client_id',
      function(response,body) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          var bhamData = JSON.parse(chunk);
          console.log(bhamData);
          console.log('BODY: ', bhamData.hof_Details);
          var bhamDataJson = [];
          // get hof details
          var tempobj = {};
          tempobj.bhamashah_id = bhamData.hof_Details.BHAMASHAH_ID;
          tempobj.member_id = bhamData.hof_Details.M_ID;
          bhamDataJson.push(tempobj);

          // get Members details
          for(var memData in bhamData.family_Details)
          {
            console.log("memData",memData);
            var tempobj = {};
            tempobj.bhamashah_id = memData.BHAMASHAH_ID;
            tempobj.member_id = memData.M_ID;
            bhamDataJson.push(tempobj);
          }
            console.log("bhamDataJson",bhamDataJson);
          res.status(200).send(chunk);
        });
      });
});

var server = app.listen(8081, function () {

  var host = "127.0.0.1";
  var port = server.address().port;

  console.log("Example app listening at http://%s:%s", host, port)

})
