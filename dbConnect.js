var nano = require('nano')('http://localhost:5984');

var dbRepo = 'track_repo'; 
var dbIssuesPR = 'track_issues';

var docType = {
   "_id": "_design/docType",
   "language": "javascript",
   "views": {
       "issue_open": {
           "map": "function(doc) {\n  if(doc.type == 11)\n\temit([doc.repo, doc.id], doc)\n}"
       },
       "issue_closed": {
           "map": "function(doc) {\n  if(doc.type == 12)\n\temit([doc.repo, doc.id], doc)\n}"
       },
       "PR_open": {
           "map": "function(doc) {\n  if(doc.type == 21)\n\temit([doc.repo, doc.id], doc)\n}"
       },
       "PR_closed": {
           "map": "function(doc) {\n  if(doc.type == 22 || doc.type == 23)\n\temit([doc.repo, doc.id], doc)\n}"
       },
       "PR_merged": {
           "map": "function(doc) {\n  if(doc.type == 23)\n\temit([doc.repo, doc.id], doc)\n}"
       },
       "open_all": {
           "map": "function(doc) {\n  \tif(doc.type == 21 || doc.type == 11)\n\t\temit([doc.repo, doc.id], doc);\n}"
       },
       "closed_all": {
           "map": "function(doc) {\n  \tif(!(doc.type == 21 || doc.type == 11))\n\t\temit([doc.repo, doc.id], doc);\n}"
       }
   }
}; 

var docNumber = {
   "_id": "_design/docNumber",
   "language": "javascript",
   "views": {
       "trivial": {
           "map": "function(doc) {\n  if(doc.number)\n\temit([doc.repo, doc.number], doc)\n}"
       }
   }
};

var docTime = {
   "_id": "_design/docTime",
   "_rev": "2-d7d12debaa6fd6e002eebe3fa04f0bac",
   "language": "javascript",
   "views": {
       "created_at": {
           "map": "function(doc) {\n\temit([doc.repo, doc.created_at], doc)\n}"
       },
       "updated_at": {
           "map": "function(doc) {\n\temit([doc.repo, doc.updated_at], doc)\n}"
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
			dbloc.insert(docNumber, function(err, body) {
				if(!err)
					console.log("... Created _design view : docNumber");
			});
			dbloc.insert(docTime, function(err, body) {
				if(!err)
					console.log("... Created _design view : docTime");
			});
		}
	});
}



