var request = require('request');
var cheerio = require('cheerio');

var url = "https://www.indeed.co.in/cmp/spm-herbal-pvt-td/jobs/Opening-Store-Charge-fc6ca18f97dedccf";
request({
    		headers: {
			      'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
    	},
    		uri: url,
    		method: 'GET'
  }, function(error, response, html){
    if(!error){
      var $ = cheerio.load(html);
      var json = { education : [], experience : []};
      var education = [];
      var experience = [];
      var title = '', location = '', company = '';

      $('b.jobtitle font').each(function(i, element){
        title = $(this).text();
      });

      $('span.location').each(function(i, element){
        location = $(this).text();
      });

      $('span.company').each(function(i, element){
        company = $(this).text();
      });

      $('p').filter(function () {
        return $(this).text().toLowerCase().indexOf('required experience') >= 0;
      }).each(function(i, element){
        experience.push($(this).next('ul').text());
      });

      $('p').filter(function () {
        return $(this).text().toLowerCase().indexOf('required education') >= 0;
      }).each(function(i, element){
        education.push($(this).next('ul').text());
      });

     json['location'] = location;
     json['company'] = company;
     json['title'] = title || 'Job Title';
     json['education'] = education;
     json['experience'] = experience;
     json['source'] = 'naukri';
     json['link'] = url;
    //  console.log(JSON.stringify(json))
    console.log(json);
    console.log('\n\n');
    console.log(JSON.stringify(json));
}
})
