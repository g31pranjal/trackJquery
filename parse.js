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
	fillCommon();
})();


function toTimestamp(sample) {
	var date = sample.substring(0,10).split("-");
	var time = sample.substring(11,19).split(":");
	return (Date.UTC(date[0], date[1], date[2], time[0], time[1], time[2])/1000);
}

// Choose a repository for fetching data
function fillCommon() {
	var repoList;
	var len;
	dbRepo.list(function(err, data) {
		repoList = data.rows;
		len = data.total_rows;	
		console.log("... Starting fetch data Service ...");
		//getHeadNumber(repoList[44]);
		updateOpen(repoList[22])
	});
}

// Getting the most recent Issue/PR on a repository
function getHeadNumber(repo) {
	console.log("... Fetching data from "+repo.id);
	var pageLimit = 1;
	var pth = '/repos/'+repo.id+'/issues?state=all&per_page='+pageLimit+'&access_token=dabcd530d821ada1073be24d36b6c92d829457e8'

	var options = {
    	path: pth
	};

	console.log("... getting latest issue number...");
	github.request(options, function(error, repos) {
    	console.log(error);
    	if(!error) {
    		var obj = repos;
    		var num =  obj[0].number;
    		console.log("... Latest Issue/PR available on Github : #"+num);

    		dbIssuesPR.view('docNumber','trivial', { descending : true, startkey : [repo.id,{}], endkey : [repo.id]}, function(err, body) {
    			

    			var localHead = body.rows.length;
    			//var localHead = body.rows[0].value.number;
    			
    			
    			console.log("... localHead : #"+localHead);
    			// set localHead to 0 to start a sequential fresh fetching.
    			startScrapRepo(repo.id,num,localHead);
    		});
    	}
	});	
}

// Calculates no. of new Issue/PR not in database and initiates their fetching
function startScrapRepo(repo,head,localHead) {
	if(head == localHead) {
		console.log("Database up-to-date !!");
	}

	else {
		console.log("Start fetching...");
		if(localHead == 0) {
			var dec = 1;
			for(var i=1;i<=head;i++) {
				setTimeout(function() {
					console.log("... prepare fetching Issue/PR #"+dec);
					scrapOne(repo,dec++, false);
				}, (i)*500);		
			}
		}
		else {
			var dec = head;
			for(var i=head,counter=0;i>localHead;i--,counter++) {
				setTimeout(function() {
					console.log("... prepare fetching Issue/PR #"+dec);
					scrapOne(repo,dec--, false);
				}, (counter)*500);		
			}
		}
	}
}

//fetches an Issue/PR
function scrapOne(repo, number, update) {
	dbIssuesPR.view('docNumber','trivial',{ key : [repo, number]}, function(err, data) {
		if(data.rows.length == 0 || update == true) {
			console.log("... fetching Issue/PR #"+number);
		
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
					is.created_at = toTimestamp(obj.created_at);
					is.updated_at = toTimestamp(obj.updated_at);
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
						is.closed_at = toTimestamp(obj.closed_at);
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
								if(obj.base.user != null) {
									is.base.user = {};
									is.base.user.id = obj.base.user.id;
									is.base.user.login = obj.base.user.login;
								}
								
								is.head = {};
								is.head.label = obj.head.label;
								is.head.ref = obj.head.ref;
								is.head.sha = obj.head.sha;
								if(obj.head.user != null) {
									is.head.user = {};
									is.head.user.id = obj.head.user.id;
									is.head.user.login = obj.head.user.login;
								}

								if(obj.merged) {
									is.merged = obj.merged;
									is.type += 1;
									if(obj.merged_by != null) {
										is.merged_by = {};
										is.merged_by.id = obj.merged_by.id;
										is.merged_by.login = obj.merged_by.login;
									}
									else 
										is.merged_by = null
									is.merged_at = toTimestamp(obj.merged_at);
								}
								else {
									is.merged = obj.merged;
								}
								if(!update){
									fixIssuesPR(is);
								}
								else {
									updateIssuesPR(is)
								}

							}
						});
					}
					else {
						if(!update) {
							fixIssuesPR(is);
						}
						else {
							updateIssuesPR(is)
						}
					}
		    	}
			});
		}
	});
}

// Checks whether a particular repository is in the dbRepo otherwise, adds it.
function fixIssuesPR(obj) {
	var name = String(obj.id);
	
	dbIssuesPR.get(name, function(err, data) {
		if(data == undefined) {
			dbIssuesPR.insert(obj, name, function(err, body) {
				if(!err) 
					console.log("... Inserted #"+obj.number+" : ");
			});
		}
	});
}

function updateIssuesPR(obj) {
	var name = String(obj.id);

	dbIssuesPR.get(name, function(err, data) {
		if(!err) {
			obj._rev = data._rev;
			dbIssuesPR.insert(obj, name, function(err, body) {
				if(!err) 
					console.log("... Updated #"+obj.number+" : ");
			});
		}
	});
}

function updateOpen(repo) {
	console.log("... Beginning update for "+repo.id);
	dbIssuesPR.view('docType','open_all', { descending : true, startkey : [repo.id,{}], endkey : [repo.id]}, function(err, body) {
 		var len = (body.rows.length);
		for(var i=0;i<len;i++) {
			var dec = 0;
			setTimeout(function() {
				console.log("fetching issue #"+body.rows[dec].value.number);
				scrapOne(repo.id,body.rows[dec++].value.number, true);
			}, (i)*500);
		}
	});
}
