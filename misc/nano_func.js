var nano = require('nano')('http://localhost:5984');

var dbRepo; 
var dbCommon;

(function() {
	connectCouch();
	checkRepo();
	//fillCommon();
})();


//connects to the couchDb databases for storing data
function connectCouch() {
	nano.db.create('track_repo', function(err, body){;});
	dbRepo = nano.use('track_repo');
	
	
}
