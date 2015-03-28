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

// Gets the list of repositories in dbRepo containing key and id. 
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



function startScrapRepo(repo,head) {
	for(var i=head-51;i>=head-100;i--) {
		scrapOne(repo,i);
	}
}


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

						console.log(is.number);

					}
				});
			    
			}
			else {
				console.log(is.number);
			}


		
				
    	}
    	
	});







	

}




function continueScrap(repo,currentpage) {
	var page_limit = 20;

	if(currentpage == undefined || currentpage == 0){
		var pth = '/repos/'+repo.id+'/issues?state=all&page=1&per_page='+page_limit+'&access_token=dabcd530d821ada1073be24d36b6c92d829457e8';
		currentpage = 0;
	}
	else 
		var pth = '/repos/'+repo.id+'/issues?state=all&page='+(currentpage + 1)+'&per_page='+page_limit+'&access_token=dabcd530d821ada1073be24d36b6c92d829457e8';

	var options = {
	  hostname: 'api.github.com',
	  method: 'GET',
	  path : pth, 
	  headers: {'user-agent' : 'g31pranjal'}
	};

	var dat = "";
	  
	var req = https.request(options, function(res) {
		res.setEncoding('utf-8');
		res.on('data',function(e){
			dat += e;
		});
		res.on('end',function() {
			
			var obj = JSON.parse(dat);
			var len = obj.length;
			
			if(len > 0) {
				for(var i=0;i<len;i++) {
					var is={};
					is.repo = repo.id;
					is.id = obj[i].id;
					is.number = obj[i].number;
					is.title = obj[i].title;
					is.user = {};
					is.user.id = obj[i].user.id;
					is.user.login = obj[i].user.login;
					is.created_at = obj[i].created_at;
					is.updated_at = obj[i].updated_at;
					is.body = obj[i].body;
					if(obj[i].pull_request) {
						scrapPullRequest(is);
					}
					else {
						//scrapIssue(is);
					}

					//fixRepo(repo_id, repo_fullname, repo_desc);
				}
				/*
				if(len == page_limit) {
					checkRepo(currentpage + 1);
				}
				*/
			
			}
			
		});
	});
	req.end();
}



function scrapPullRequest(obj) {
	var pth = '/repos/'+obj.repo+'/pulls/'+obj.number+'?access_token=dabcd530d821ada1073be24d36b6c92d829457e8'
	
	var options = {
	  hostname: 'api.github.com',
	  path: pth,
	  method: 'GET',
	  headers: {'user-agent' : 'g31pranjal'}
	};

	var dat = "";
	  
	var req = https.request(options, function(res) {
		res.setEncoding('utf-8');
		res.on('data',function(e){
			dat += e;
		});
		res.on('end',function() {
			var obj_e = JSON.parse(dat);
			obj.comments = obj_e.comments;
			obj.commits = obj_e.commits;
			obj.changed_files = obj_e.changed_files;
			
			if(obj_e.state == 'closed') {
				if(obj_e.merged) {
					obj.type = 4;
					obj.merged = true;
					obj.merged_by = {};	
					obj.merged_by.id = obj_e.merged_by.id;
					obj.merged_by.login = obj_e.merged_by.login;
				}
				else {
					obj.type = 5;
					obj.merged = false;
					obj.mergeable = obj_e.mergeable;
				}
				obj.state = 'closed';
				obj.closed_at = obj_e.closed_at;
				scrapClosedPullRequest(obj);
			}
			else {
				obj.type = 1;
				obj.state = 'open';
				console.log(obj);
			}
		});
	});
	req.end();
}

function scrapClosedPullRequest(obj) {
	var pth = '/repos/'+obj.repo+'/issues/'+obj.number+'?access_token=dabcd530d821ada1073be24d36b6c92d829457e8'
	
	var options = {
	  	hostname: 'api.github.com',
	  	path: pth,
	  	method: 'GET',
	  	headers: {'user-agent' : 'g31pranjal'}
	};

	var dat = "";
	  
	var req = https.request(options, function(res) {
		res.setEncoding('utf-8');
		res.on('data',function(e){
			dat += e;
		});
		res.on('end',function() {
			var obj_e = JSON.parse(dat);
			
			obj.closed_by = {};
			obj.closed_by.id = obj_e.closed_by.id;
			obj.closed_by.login = obj_e.closed_by.login;

			console.log(obj);
		});
	});
	req.end();
}