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
	checkRepo();
})();

//Main function for repository scrapping
function checkRepo(currentpage) {

	var page_limit = 100;
	if(currentpage == undefined){
		var pth = '/orgs/jquery/repos?page=1&per_page='+page_limit+'&access_token=dabcd530d821ada1073be24d36b6c92d829457e8'
		currentpage = 0;
	}
	else 
		var pth = '/orgs/jquery/repos?page='+(currentpage+1)+'&per_page='+page_limit+'&access_token=dabcd530d821ada1073be24d36b6c92d829457e8'

	var options = {
    	path: pth
	};

	github.request(options, function(error, repos) {
    	if(!error) {
    		var obj = repos;
			var len = obj.length;
		
			if(len > 0) {
				for(var i=0;i<len;i++) {
					var repo_id = obj[i].id;
					var repo_fullname = obj[i].full_name;
					var repo_desc = obj[i].description;
					//console.log(repo_id+" ... "+repo_fullname+" ... "+repo_desc);
					fixRepo(repo_id, repo_fullname, repo_desc);
				}
				if(len == page_limit) {
					checkRepo(currentpage + 1);
				}
			}
    	}
	});
}

// Checks whether a particular repository is in the dbRepo otherwise, adds it.
function fixRepo(repo_id, repo_fullname, repo_desc) {
	dbRepo.get(repo_fullname, function(err, data, re) {
		if(data == undefined) {
			dbRepo.insert({ git_id : repo_id, name : repo_fullname, desc : repo_desc }, repo_fullname, function(err, body) {
				if(!err) 
					console.log("... Inserted/Updated #"+repo_id+" : "+repo_fullname);
			});
		}
		else 
			console.log("... Document _id:"+repo_fullname+" already exists !");
	});
}
