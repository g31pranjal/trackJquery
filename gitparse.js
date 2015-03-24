var githubAPI = require('github');

var github = new githubAPI({
    version: "3.0.0",
    debug: true,
    protocol: "https",
    host: "api.github.com",
    pathPrefix: "", // for some GHEs
    timeout: 5000,
    headers: {
        "user-agent": "My-Cool-GitHub-App" // GitHub is happy with a unique user agent
    }
});	

github.user({
    user: "g31pranjal"
}, function(err, res) {
    console.log(JSON.stringify(res));
});