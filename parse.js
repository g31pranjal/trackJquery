var https = require('https');
var fs = require('fs');
var nano = require('nano')('http://localhost:5984');

var dbRepo; 

var dbCommon;

(function() {
	checkRepo();
	connectCouch();
})();


function connectCouch() {
	nano.db.create('track_repo', function(err, body){;});
	dbRepo = nano.use('track_repo');
	
	nano.db.create('track_issues', function(err, body){;});
	dbCommon = nano.use('track_common');
	
}




function checkRepo(currentpage) {
	var page_limit = 100;
	if(currentpage == undefined){
		var pth = '/orgs/jquery/repos?page=1&per_page='+page_limit+'&access_token=dabcd530d821ada1073be24d36b6c92d829457e8'
		currentpage = 0;
	}
	else 
		var pth = '/orgs/jquery/repos?page='+(currentpage+1)+'&per_page='+page_limit+'&access_token=dabcd530d821ada1073be24d36b6c92d829457e8'

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
			//startReforming();
			var obj = JSON.parse(dat);
			var len = obj.length;
			console.log(len);

			if(len > 0) {
				for(var i=0;i<len;i++) {
					var repo_id = obj[i].id;
					var repo_fullname = obj[i].full_name;
					var repo_desc = obj[i].description;
					console.log(repo_id+" ... "+repo_fullname+" ... "+repo_desc);
					dbRepo.insert({ git_id : repo_id, name : repo_fullname, desc : repo_desc }, repo_fullname, function(err, body) {
						if(!err) 
							console.log("Success !!");
					});
				}
				if(len == page_limit) {
					checkRepo(currentpage + 1);
				}
			}
		});
	});
	req.end();
}




function startReforming() {
	var obj = JSON.parse(dat);
	var log = obj[0].id;
	fs.appendFile('/home/in-arena/localhost/nodeJS/content.txt',"\n"+log,function(err){
		if(err)
			console.log("error sighted !");
		else
			console.log("Done !!");
	})
}