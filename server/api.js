var express = require('express');
var http = require('http');
var app = express();
var fs = require("fs");

app.get('/getUsers', function (req, res) {
  var options = {
  host: "apitest.sewadwaar.rajasthan.gov.in",
  port: 80,
  path: '/app/live/Service/hofAndMember/ForApp/WDYYYGG?client_id=ad7288a4-7764-436d-a727-783a977f1fe1',
  method: 'GET'
};
console.log(options);
http.request(options, function(res) {
  console.log('STATUS: ' + res.statusCode);
  console.log('HEADERS: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
    console.log('BODY: ' + chunk);
  });
}).end();
  console.log("listing users");
});

app.get('/api', function(){
  console.log("API API*****");
});

var server = app.listen(8081, function () {

  var host = "127.0.0.1";
  var port = server.address().port;

  console.log("Example app listening at http://%s:%s", host, port)

})
