var https = require('https');
var fs = require('fs');
var nano = require('nano')('http://localhost:5984');
var github = require('github-request');

var dbRepo; 
var dbCommon;

(function() {
	connectCouch();
	fillCommon();
})();

//connects to the couchDb databases for storing data
function connectCouch() {
	nano.db.create('track_repo', function(err, body){;});
	dbRepo = nano.use('track_repo');
	
	nano.db.create('track_issues', function(err, body){;});
	dbCommon = nano.use('track_common');
}

// Choose a repository for fetching data
function fillCommon() {
	var repoList;
	var len;
	dbRepo.list(function(err, data) {
		repoList = data.rows;
		len = data.total_rows;	
		//continueScrap(repoList[44],0);
		getHeadNumber(repoList[44]);
	});
}

// Getting the most recent Issue/PR on a repository
function getHeadNumber(repo) {
	var page_limit = 1;
	var pth = '/repos/'+repo.id+'/issues?per_page='+page_limit+'&access_token=dabcd530d821ada1073be24d36b6c92d829457e8'

	var options = {
    	path: pth
	};

	github.request(options, function(error, repos) {
    	if(!error) {
    		var obj = repos;
    		var num =  obj[0].number;
    		startScrapRepo(repo.id,num);
    	}
	});	
}

// Calculates no. of new Issue/PR not in database and initiates their fetching
function startScrapRepo(repo,head) {
	for(var i=head;i>=head-10;i--) {
		scrapOne(repo,i);
	}
}

//fetches an Issue/PR
function scrapOne(repo, number) {
	var pth = '/repos/'+repo+'/issues/'+number+'?access_token=dabcd530d821ada1073be24d36b6c92d829457e8'
	
	var options = {
	  path: pth,
	};

	var is = {};

	github.request(options, function(error, repos) {
    	if(!error) {
    		var obj = repos;
    		
			is.repo = repo;
			is.id = obj.id;
			is.number = obj.number;
			is.title = obj.title;
			is.user = {};
			is.user.id = obj.user.id;
			is.user.login = obj.user.login;
			is.created_at = obj.created_at;
			is.updated_at = obj.updated_at;
			is.body = obj.body;
			is.labels = [];
			for(var i=0;i<obj.labels.length;i++) {
				is.labels[i] = { name : obj.labels[i].name };
			}
			is.comments = obj.comments;
			is.state = obj.state;
			is.type = 11;

			if(obj.state == 'closed') {
				is.type += 1;
				is.closed_at = obj.closed_at;
				if(obj.closed_by != null) {
					is.closed_by = {};
					is.closed_by.id = obj.closed_by.id;
					is.closed_by.login = obj.closed_by.login;
				}
				else 
					is.closed_by = null
			}
			else {
				is.closed_by = null;
				is.closed_at = null;
			}

			if(obj.pull_request != null) {
				var pth = '/repos/'+repo+'/pulls/'+number+'?access_token=dabcd530d821ada1073be24d36b6c92d829457e8'
	
				var options = {
				  path: pth,
				};

				github.request(options, function(error, data) {
					if(!error) {
						var obj = data;
						is.pull_id = obj.id;
						is.type += 10;
						is.commits = obj.commits;
						is.changed_files = obj.changed_files;
						
						is.base = {};
						is.base.label = obj.base.label;
						is.base.ref = obj.base.ref;
						is.base.sha = obj.base.sha;
						is.base.user = {};
						is.base.user.id = obj.base.user.id;
						is.base.user.login = obj.base.user.login;
						
						is.head = {};
						is.head.label = obj.head.label;
						is.head.ref = obj.head.ref;
						is.head.sha = obj.head.sha;
						is.head.user = {};
						is.head.user.id = obj.head.user.id;
						is.head.user.login = obj.head.user.login;
						
						if(obj.merged) {
							is.merged = obj.merged;
							is.type += 1;
							is.merged_by = {};
							is.merged_by.id = obj.merged_by.id;
							is.merged_by.login = obj.merged_by.login;
							is.merged_at = obj.merged_at;
						}
						else {
							is.merged = obj.merged;
						}

						console.log(is);console.log();console.log();

					}
				});
			    
			}
			else {
				console.log(is);console.log();console.log();
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
	});
}
