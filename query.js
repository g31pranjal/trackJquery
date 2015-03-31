var https = require('https');
var fs = require('fs');
var dbConnect = require('./dbConnect.js');
var helper = require('./helper.js');

var dbRepo; 
var dbIssuesPR;

(function() {
	dbRepo = dbConnect.connectRepoList();
	dbIssuesPR = dbConnect.connectIssuesPR();
	query();
	//time();
})();


function query() {
	var design = 'docType';
	var view = 'PR_closed';
	var repo = 'jquery/jquery';

	dbIssuesPR.view(design, view, { startkey : [repo], endkey : [repo,{}]}, function(err, body) {
		var len = body.rows.length;
		console.log(len);
		for(var i=len-1;i>=0;i--) {
			//console.log(body.rows[i].value.number+"  :  "+helper.toDate(body.rows[i].key[1]));
		}

	});
}

function time() {

	var sample = "2015-03-31T05:06:04Z";

	var date = sample.substring(0,10).split("-");
	var time = sample.substring(11,19).split(":");
	console.log (new Date(date[0], date[1], date[2], time[0], time[1], time[2])/1000);
}