var express = require('express');
var https = require('https');
var app = express();
var fs = require("fs");

app.get('/getUsers', function (req, res) {
  https.get("https://apitest.sewadwaar.rajasthan.gov.in/app/live/Service/hofAndMember/ForApp/WDYYYGG?client_id=ad7288a4-7764-436d-a727-783a977f1fe1",
    function(response,body){
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
      var bhamData = JSON.parse(chunk);
      console.log(bhamData);
      console.log('BODY: ',bhamData.hof_Details);
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

app.get('/api', function(){
  console.log("API API*****");

});

var server = app.listen(8081, function () {

  var host = "127.0.0.1";
  var port = server.address().port;

  console.log("Example app listening at http://%s:%s", host, port)

})
