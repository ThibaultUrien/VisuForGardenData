function StartWithStringData(bs64String) {
	Get("data:application/json;base64,"+bs64String)
		.then(setupBars)
		.catch(e => console.error(e))
}
// You may use this one when you deploy on a proper sever that can host files.
function StartWithRemoteData(remoteUrl) {
	Get(remoteUrl)
		.then(resp => 
			Promise.all(
				resp.list.map(expName =>
					Get("logs/"+expName)
				)
			)
		)
		.then(setupBars)
		.catch(e => console.error(e))
}
