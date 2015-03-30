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
	dbIssuesPR.view('docType','PR_closed', { startkey : ["jquery/jquery"], endkey : ["jquery/jquery",{}] }, function(err, body) {
		console.log(body.rows.length);
	});
}