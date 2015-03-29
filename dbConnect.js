var nano = require('nano')('http://localhost:5984');

var dbRepo = 'track_repo'; 
var dbIssuesPR = 'track_issues';

var docType = {
   "_id": "_design/docType",
   "language": "javascript",
   "views": {
       "issue_open": {
           "map": "function(doc) {\n  if(doc.type == 11)\n\temit(doc.id, doc)\n}"
       },
       "issue_closed": {
           "map": "function(doc) {\n  if(doc.type == 12)\n\temit(doc.id, doc)\n}"
       },
       "PR_open": {
           "map": "function(doc) {\n  if(doc.type == 21)\n\temit(doc.id, doc)\n}"
       },
       "PR_closed": {
           "map": "function(doc) {\n  if(doc.type == 22)\n\temit(doc.id, doc)\n}"
       },
       "PR_merged": {
           "map": "function(doc) {\n  if(doc.type == 23)\n\temit(doc.id, doc)\n}"
       }
   }
};


//connects to the couchDb databases for storing data
exports.connectRepoList =  function() {
	console.log("Connecting "+dbRepo+" ...");
	nano.db.get(dbRepo, function(err, body) {
		if(err) {
			console.log("Database not found... initializing creation !");
			initializeRepoList();
		}
		else
			console.log("Database found !")
	});
	dbR = nano.use(dbRepo);
	return dbR;	
}

exports.connectIssuesPR =  function() {
	console.log("Connecting "+dbIssuesPR+" ...");
	nano.db.get(dbIssuesPR, function(err, body) {
		if(err) {
			console.log("Database not found... initializing creation !");
			initializeIssuesPR();
		}
		else
			console.log("Database found !")
	});
	dbC = nano.use(dbIssuesPR);
	return dbC;
}

function initializeRepoList() {
	nano.db.create(dbRepo,function(err, body) {
		if(!err) {
			console.log("... Created db for Repository list ")
		}
	});
}

function initializeIssuesPR() {
	nano.db.create(dbIssuesPR,function(err, body) {
		if(!err) {
			console.log("... Created db for Issues/PR ")
			var dbloc = nano.use(dbIssuesPR);
			dbloc.insert(docType, function(err, body) {
				if(!err)
					console.log("... Created _design view : docType");
			});
		}
	});
}



