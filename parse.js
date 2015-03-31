var https = require('https');
var fs = require('fs');
var github = require('github-request');
var dbConnect = require('./dbConnect.js');
var helper = require('./helper.js');

var dbRepo; 
var dbIssuesPR;

(function() {
	dbRepo = dbConnect.connectRepoList();
	dbIssuesPR = dbConnect.connectIssuesPR();
	fillCommon();
})();


// 1.1 : Choses the repository to update its repository content
function fillCommon() {
	var repoList;
	var len;

	/*Gets the list of repository currently in the database*/
	dbRepo.list(function(err, data) {
		repoList = data.rows;
		len = data.total_rows;	
		
		/*Variable that is currently used to pickup a repository for fetching data randomly.*/
		var repo = repoList[8];
		
		console.log("... Starting fetch data Service ...");
		
		/*Call to Insert Service : that inserts new Issues/PR available on Github into database*/
		getHeadNumber(repo);

		/*Call to Update Service : that updates the state of open Issues/PR and creates a revision */
		updateOpen(repo);
	});
}


// 3.1 : Gets the list of open Issues/PR, instantiate fetching data on each and updates in database
function updateOpen(repo) {
	console.log("... Beginning update for "+repo.id);
	
	/* Database Query to fetch the list of all open Issues/PR */
	dbIssuesPR.view('docType','open_all', { descending : true, startkey : [repo.id,{}], endkey : [repo.id]}, function(err, body) {
 		var len = (body.rows.length);
		for(var i=0;i<len;i++) {
			var dec = 0;
			setTimeout(function() {
				/* Call to the Scrapping function to fetch the data of a particular issue {number} */
				scrapOne(repo.id,body.rows[dec++].value.number, true);
			}, (i)*500);
		}
	});
}


// 2.1 : Gets the most recent Issue/PR number from Github and that in local database and fetches the Issues/PR that are not currently present in the database.
function getHeadNumber(repo) {
	console.log("... Fetching data from "+repo.id);
	
	var pageLimit = 1;
	var pth = '/repos/'+repo.id+'/issues?state=all&per_page='+pageLimit+'&access_token=dabcd530d821ada1073be24d36b6c92d829457e8'
	var options = {
    	path: pth
	};

	/* Fetches the first top Issues/PR of the list arranged in the decreasing order of number */
	console.log("... getting latest issue number...");
	github.request(options, function(error, obj) {
    	if(!error) {
    		
    		var head =  obj[0].number;
    		
    		console.log("... Latest Issue/PR available on Github : #"+head);

    		/* Query to database to get the latest Issue/PR number*/
    		dbIssuesPR.view('docNumber','trivial', { descending : true, startkey : [repo.id,{}], endkey : [repo.id]}, function(err, body) {
    			
    			/* Computing the latest Issue/PR available on local database */
    			// Set localHead to 0 to start a fresh fetching, starting from 0
    			var localHead = body.rows.length;
    			//var localHead = body.rows[0].value.number;
    			
    			console.log("... localHead : #"+localHead);


    			/* If localhead == head, then all the Issues/PR are already in database, no need for fetching */
    			if(head == localHead) {
					console.log("... Database up-to-date !!");
				}
				else {
					console.log("... Start fetching...");

					var dec = localHead + 1;
					for(var i=localHead + 1;i<=head;i++) {
						/* timeout of 500ms to prevent bombardment of HTTP requests */
						setTimeout(function() {
							/* Call to the Scrapping function to fetch the data of a particular issue {number} */
							scrapOne(repo.id,dec++, false);
						}, (i - localHead)*500);		
					}
				}
    		});
    	}
	});	
}

/* 4.1 : Fetches the info of a particular Issue/PR 
If its not present in the database (update : false) or it is being updated (update : true)*/
function scrapOne(repo, number, update) {
	/* Check if the Issues already exists */
	dbIssuesPR.view('docNumber','trivial',{ key : [repo, number]}, function(err, data) {
		if(data.rows.length == 0 || update == true) {
			
			console.log("... fetching Issue/PR #"+number);
		
			var pth = '/repos/'+repo+'/issues/'+number+'?access_token=dabcd530d821ada1073be24d36b6c92d829457e8'
			
			var options = {
			  path: pth,
			};

			var is = {};

			/* Request to https://api.github.com/repos/jquery/{repo_name}/issues/{number} */
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
					is.created_at = helper.toTimestamp(obj.created_at);
					is.updated_at = helper.toTimestamp(obj.updated_at);
					is.body = obj.body;
					is.labels = [];
					for(var i=0;i<obj.labels.length;i++) {
						is.labels[i] = { name : obj.labels[i].name };
					}
					is.comments = obj.comments;
					is.state = obj.state;
					is.type = 11;

					/* Store closure info if the issue is closed */
					if(obj.state == 'closed') {
						is.type += 1;
						is.closed_at = helper.toTimestamp(obj.closed_at);
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

						/* If pull request, Request to https://api.github.com/repos/jquery/{repo_name}/pulls/{number} */
						github.request(options, function(error, data) {
							if(!error) {
								var obj = data;
								is.pull_id = obj.id;
								is.type += 10;
								is.commits = obj.commits;
								is.changed_files = obj.changed_files;
								
								/* Base Info of the pull request */
								is.base = {};
								is.base.label = obj.base.label;
								is.base.ref = obj.base.ref;
								is.base.sha = obj.base.sha;
								if(obj.base.user != null) {
									is.base.user = {};
									is.base.user.id = obj.base.user.id;
									is.base.user.login = obj.base.user.login;
								}
								
								/* Head Info of the pull request */
								is.head = {};
								is.head.label = obj.head.label;
								is.head.ref = obj.head.ref;
								is.head.sha = obj.head.sha;
								if(obj.head.user != null) {
									is.head.user = {};
									is.head.user.id = obj.head.user.id;
									is.head.user.login = obj.head.user.login;
								}

								/* Merge info of the pull request, if it is merged */
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
									is.merged_at = helper.toTimestamp(obj.merged_at);
								}
								else {
									is.merged = obj.merged;
								}

								/* Inserting/updating the object in database */
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
						/* Inserting/updating the object in database */
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

// 5.1 : Inserts the Issue/PR info into database
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

// 6.1 : Updates the Issue/PR info in database
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
