


exports.toTimestamp = function(sample) {
	var date = sample.substring(0,10).split("-");
	var time = sample.substring(11,19).split(":");
	return (Date.UTC(date[0], date[1], date[2], time[0], time[1], time[2])/1000);
}

exports.toDate = function(UNIX_timestamp){
	var a = new Date(UNIX_timestamp*1000);
	var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	var year = a.getFullYear();
	var month = months[a.getMonth()];
	var date = a.getDate();
	var hour = a.getHours();
	var min = a.getMinutes();
	var sec = a.getSeconds();
	var time = date + ',' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
	return time;
}