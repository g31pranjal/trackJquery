var https = require('https');
var fs = require('fs');
var nano = require('nano')('http://localhost:5984');
var github = require('github-request');
var dbConnect = require('./dbConnect.js');

var dbRepo; 
var dbIssuesPR;

(function() {
	dbRepo = dbConnect.connectRepoList();
	dbIssuesPR = dbConnect.connectIssuesPR();
	query();
})();


function query() {
	dbIssuesPR.view('docType','issue_closed', { startkey : ["jquery/sizzle"], endkey : ["jquery/sizzle",{}] }, function(err, body) {
		console.log(body.rows.length);
		var len = body.rows.length;
		for(var i=0;i<len;i++) {
			console.log(body.rows[i].value.number);
		}

	});
}