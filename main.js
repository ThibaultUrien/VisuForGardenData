
var colors = "8dd3c7ffffb3bebadafb807280b1d3fdb462b3de69fccde5d9d9d9bc80bdccebc5ffed6f"
var typeColor = {};
var selectedDate = 0;
var MaxDuration;
var playInterval;

var maxTurnDuration = 30;
var hideOnTimeline =["PlantMotions","PlayerMotions","Visibility"]
function Play(pace){
	window.clearInterval(playInterval)
	if(!pace){

		d3.select("#play_at0").node().checked = true;
		return;
	}
	var delta = pace >0?1:-1
	var time = 1000/pace*delta;
	d3.selectAll(".timeline")
		.each(d=>{
				d.selectedTime = Math.max(Math.min(d.selectedTime ,MaxDuration),0);
				
		})
	playInterval = window.setInterval(function(){
		let canContinue = false;
		let tl = d3.selectAll(".timeline")
			.each(d=>{
					d.selectedTime += delta;
					if(d.selectedTime >0 && d.selectedTime < MaxDuration)
						canContinue = true;
			})
		tl.select(".timelineUsefull") // propagate data
		tl.selectAll(".timeslider")
			.property("value",d=>d.selectedTime/MaxDuration)
		refreshDetailsOfSeries()
		if(!canContinue)
			Play(0)
	},time)
}
function colorOf(typeName){
	if(!typeColor[typeName])
		typeColor[typeName] = "#"+colorHash(typeName);
	return typeColor[typeName]
}
function Get(target) {
	var req = new XMLHttpRequest();
	req.open('GET', target, true); 
	var p = new Promise(res => {
		req.onload  = res
	}).then(evt => {
	   
		return req.response
	})
	.catch(e=> 
		console.error(e)
	)

	
	req.responseType = 'json';
	req.send(null);
	return p;
}
function mm_ssFormat(timestamp){
	let minitCount = Math.floor(timestamp/60);
	let mm = minitCount.toString();
	let ss = (timestamp-minitCount*60).toString();
	if(mm.length < 2)
		mm = "0"+mm;
	if(ss.length < 2)
		ss = "0"+ss;
	return mm+":"+ss;
}

var findEndtryPosition = d3.bisector(function(d) { return d.tiemstamp; }).left
// Offter to the user to donwload some data 
function sendFile(data,name){
	var link = document.createElement("a");
	link.setAttribute("href", "data:txt/utf-8,"+data);
	link.setAttribute("download", name);
	document.body.appendChild(link); // Required for FF
	setTimeout(function(){

		
		link.click() // click seem to interupt curent execution, it's isolated in a timeout.
		link.remove()

	},0)
	
}

function setupBars(exps){
	
	
	let expId = 0;
	let markerTypes = {Agent:true};
	for(var exp of exps) {
		let start = parseFloat(exp.Log[1][0])
		let end = parseFloat(exp.Log[exp.Log.length-2][0])
		let duration = end - start
		exp.timeline = Object.keys(exp)
			.flatMap(key=> {
				let v = exp[key];
				if(Array.isArray(v) && v.length > 1){
					markerTypes[key] = true;
					let goodLine = v.filter(line => line.length > 1 && !isNaN(line[0]))
					return goodLine.map(l => {
						let floatTime = parseFloat(l[0])
						let data = l.slice(1)
						let entry = {
							type : key,
							tiemstamp : floatTime - start,
							data : data,
							relativeTime : (floatTime - start)/duration,
							experiment : exp
						}
						entry.isAgentAction = isAgentAction.bind(entry);
						return entry
					})
				} 
					
				return []
			})
			.sort((a,b)=>
				a.tiemstamp-b.tiemstamp
			);
		exp.start = start
		exp.end = end
		exp.duration = duration;
		exp.expId = expId++;

		let dateSplit = exp.name.split(/[_T]/)
		dateSplit.shift();
		dateSplit[1]= dateSplit[1].replace(/-/g,":")
		exp.date = new Date(dateSplit.join("T"));
		exp.selectedTime = 0;
		usedNames = {};
		exp.players = {};
		exp.Players
			.forEach(joined => {
				if(joined[3] == "join") {
					let name = atob(joined[2]);
					if(name != "Moi" && name !="Agent"){

						exp.players[joined[1]] = name;
						usedNames[name] = true;
					}else
						exp.players[joined[1]] = "Agent";
					
				}
			})
		exp.playersNames = Object.keys(usedNames)
	}
	exps.sort((a,b)=> a.duration-b.duration);
	MaxDuration = exps[exps.length-1].duration;
	let views = d3.select(".view")
		.selectAll("div")
		.data(exps)
		.enter()
		.append("div")
		.classed("expsView",1)
		.on("click",displayDetailsOf)
	var label = views.append("div")
		.classed("expLabel",1)
		.call(makeLabels)
	let tl = views.append("div")
		.classed("timeline",1)
	tl.append("div")
		.classed("timelineUsefull",1)
		.style("width",d => ((d.duration/MaxDuration)*100)+"%")
		.call(drawEvents)
	tl.append("input")
		.attr("type","range")
		.attr("min","0")
		.attr("max","1")
		.attr("step",1/4000)
		.property("value",0)
		.classed("timeslider",1)
		.on("input",onTimeChanged)
	d3.select(".expsView:first-child").each(displayDetailsOf)


	displayFilters(Object.keys(markerTypes))
	timeControl()
	refreshDetailsOfSeries()
}

function displayFilters(markerTypes){
	let fs = d3.select(".filters")
		.selectAll("div")
		.data(markerTypes)
		.enter()
		.append("span")
		.classed("filterSpan",1)
		.style("background-color",d=>colorOf(d))
	function applyFilter(type){
		let checked = this.checked;
		d3.selectAll('bar[eventtype="'+type+'"]')
					.attr("hidden",!checked)
					.each(d=>d.hidden = !checked ) 
	}
	fs.append("input")
		.attr("type","checkbox")
		.attr("id",d => "toogle"+d)
		.attr("name",d => "toogle"+d)
		.property('checked', t=>!hideOnTimeline.includes(t))
		.on("change",applyFilter)
		.each(applyFilter)
	fs.append("label")
		.attr("for",d => "toogle"+d)
		.text(d=> d)

	
}
function makeLabels(labels){
	let dates = labels.append("div")
		.classed(".labelDate",1)
		.text(d=>d.date);
	let info = labels.append("div")
		.classed(".labelInfo",1)
		.text(d=>d.playersNames.join(", "))
}
function selectTime(t){
	var time
	var slide
	if(t<1 && t>=0){
		time = MaxDuration *t;
		slide = t;
	}
	else{
		time = t;
		slide = t/MaxDuration
	}
	d3.selectAll(".timelineUsefull")
		.each(d=>{
			d.selectedTime = time;

		})
	d3.selectAll(".timeslider")
		.property("value",slide)
}
function onTimeChanged(){
	let value = this.value
	d3.selectAll(".timeslider")
		.property("value",value)
	d3.selectAll(".timelineUsefull")
		.each(d=>{
			d.selectedTime = MaxDuration * value;

		})
	d3.select(this.parentNode.parentNode).each(displayDetailsOf)
}
function isAgentAction(){
	if(this.type == "UI" && this.data[4] == "ChatInputField"){
		let name = this.experiment.players[this.data[0]];
		return name == "Agent"
	}
	return false;
}
function refreshCanva(domCanva, domTime){
	let rootElem = domCanva.parentNode
	let rect = rootElem.getBoundingClientRect()
	domCanva.height = rect.height;
	domCanva.width = rect.width;

	var context = domCanva.getContext('2d')
	context.clearRect(0,0,domCanva.height,domCanva.width);
	console.log("redraw");
	for (var child = domTime.firstChild; child; child = child.nextSibling) 
		child.redraw(context);
}
function Obeserver(domCanva, domTime) {
	let callback = function(mutationsList){
		for(var mutation of mutationsList) {
	        if(!domTime.willRedraw){
	        	domTime.willRedraw = true;
	        	requestAnimationFrame(()=>{
	        		try{
	        			refreshCanva(domCanva, domTime)
	        		}finally{
	        			domTime.willRedraw = false;
	        		}
	        	})
	        }
	    }
	}
	return new MutationObserver(callback)
    
};
function drawEvents(usefullTimeline){
	usefullTimeline.each(function(d){
		let canvas = d3.select(this).append("canvas")
			.on('click',function(){
				let rect = this.getBoundingClientRect()
				let time = (d3.event.pageX - rect.left) / rect.width * d.duration
				selectTime(time);
				refreshDetailsOfSeries()

			})
			.node()
		let time = d3.select(this).append("time")
		let domTime = time.node()
		time.selectAll("bar")
			.data(d => d.timeline)
			.enter()
			.append("bar")

			.attr("xrel",d=> d.relativeTime)
			.attr("eventType",d=>d.isAgentAction()?"Agent":d.type)
			.attr("fill",d=>d.isAgentAction()?colorOf("Agent"):colorOf(d.type)+"af")
			.each(function(){
				this.redraw = (context)=>{
					if(this.getAttribute("hidden") == "true")
						return;
					context.strokeStyle = this.getAttribute("stroke");
					context.fillStyle = this.getAttribute("fill");
					let canva = context.canvas
					let pos = parseFloat(this.getAttribute("xrel")) * canvas.width;
					context.fillRect(pos,0,window.innerWidth *0.001,canvas.height)

				}
				var observerOptions = {
				  childList: true,
				  attributes: true,
				  subtree: true //Omit or set to false to observe only changes to the parent node.
				}

				var observer = Obeserver(canvas,domTime);
				observer.observe(this, observerOptions);
			})
	})
	
	window.onresize = function(){
		usefullTimeline.each(function(d){
			let canvas = d3.select(this).select("canvas").node()
			let time = d3.select(this).select("time").node()
			refreshCanva(canvas, time)
		})
	}
	window.onresize()
}

function displayDetailsOf(serie){
	d3.select(".participants")
		.text(serie.playersNames)
	d3.select(".duration")
		.text(mm_ssFormat(serie.duration));
	var visibleEvent = serie.timeline.filter(d=>!d.hidden)
	var selectedEvent = Math.max(0,findEndtryPosition(visibleEvent,serie.selectedTime) - 1 )
	if(!isNaN(selectedEvent)){
		displayDataOf(visibleEvent[Math.min(selectedEvent,visibleEvent.length-1)])
		updateChat(serie)
		updateMinimap(serie)
	}
		
	d3.selectAll(".expsView")
		.classed("selected",false);
	d3.select(this).classed("selected",true)
}
function refreshDetailsOfSeries(){
	d3.select(".expsView.selected").each(displayDetailsOf)
}
function countTurn(chatToDisplay,serie){
	let turnCount = 0
	let prevMessageDate = 0
	let spokenThisTurn = {}
	let exchangeStarter;
	function isNewTurn(name, date, content){

		if(name == "Agent")
			return false;
		spokenThisTurn[name] = true;
		if(!prevMessageDate)
			return true;

		if(!content)
			return false;
		var dt = date - prevMessageDate

		if(dt > maxTurnDuration)
			return true;
		return Object.keys(spokenThisTurn).length >= 2 && name == exchangeStarter
				

	}
	chatToDisplay.forEach(message => {
		let name = serie.playersNames[message[1]]
		let date = message[0]
		let content = message[6]
		if(isNewTurn(name, date, content)){
			turnCount ++;
			spokenThisTurn = {};
			exchangeStarter = name;
			spokenThisTurn[name] = true;

		}
		
		prevMessageDate = message[0]
	})
	if(turnCount > 0){
		// We count a turn when the next start, so we alway miss the last one.
		turnCount ++;
	}
	return turnCount;

}
function updateChat(serie) {
	let chatVP = d3.select(".chatViewPort").node();
	let isScrollMax = chatVP.scrollTop + chatVP.clientHeight *1.01 >= chatVP.scrollHeight  
	var chatUpTo = d3.bisector(function(d) { return parseFloat(d[0])-serie.start; }).right
	var chat = serie.UI.filter(x => x[5] == "ChatInputField")
	let chatLimit = chatUpTo(chat,serie.selectedTime)
	var chatToDisplay = chat.slice(0,chatLimit);
	var chatLines = d3.select(".chat")
		.selectAll("div")
		.data(chatToDisplay,function(d){
			return this.id || d && "of_"+serie.expId+"at_"+d[0];
		})
	var messageCount = d3.nest()
		.key(d=>serie.players[d[1]])
		.entries(chatToDisplay)
	messageCount.forEach(d=>d.values = d.values.length)
	var countEntry = d3.select(".CountM tbody")
		.selectAll("tr")
		.data(messageCount,function(d){
			return this.id || d && "countOf_"+d.key;
		})
	var newCountEntry =countEntry.enter()
		.append("tr")
	newCountEntry.append("td")
		.text(d=>d.key)
	newCountEntry.append("td")
		.classed("countValue",1)
	newCountEntry.merge(countEntry)
		.select(".countValue")
		.text(d=>d.values)
	countEntry.exit().remove()
	
	chatLines.exit().remove()
	chatLines.enter()
		.append("div")
		.classed("chatLines",1)
		.call(printChatLine,serie)
	d3.select(".CountT")
		.text(countTurn(chatToDisplay,serie))
	if(isScrollMax)
		chatVP.scrollTop = chatVP.scrollHeight;
}
function printChatLine(line,serie){
	
		line.classed("agentLine",d=>{
			let playerName = serie.players[d[1]];
			return playerName == "Agent"
		});
	line.on("click", d=> {
		selectTime(d[0]-serie.start)
		refreshDetailsOfSeries()
	})
	line.append("span").text(d => 
		mm_ssFormat(d[0]-serie.start)+" "+serie.players[d[1]] + " : "
	)
	line.append("span").text(d => {
		var message = atob(d[6]);
		return message || "<clicked on message field>"
	})
}
function updateMinimap(serie){
	function nameOf(d){
		return serie.players[d[1]];
	}
	var moveUpTo = d3.bisector(function(d) { return parseFloat(d[0])-serie.start; }).right
	var playersMotions = d3.nest()
		.key(nameOf)
		.entries(serie.PlayerMotions.filter(x=>x.length > 2))
	let playersLayers = d3.select(".minimap")
		.selectAll("g.layer_player")
		.data(Object.values(playersMotions),function(d){
			return this && this.id || d && "layer_player_"+d.key;
		})

	let playersMarkers = playersLayers.enter()
		.append("g")
		.classed("layer_player",1)
		.attr("id",d=> "layer_player_"+d.key)
		.style("--color",d=>
			colorOf(d.key)
		)
		.merge(playersLayers)
		.selectAll("g")
		.data(
			d=>{
				let moveLimit = moveUpTo(d.values,serie.selectedTime)
				return d.values.slice(0,moveLimit)
			},
			function(d){
				return this && this.id || d && "marker_"+d[0]+"_"+nameOf(d);
			}
		)

	var rad = 1
	var newMarkers = playersMarkers.enter()
		.append("g")
		.attr("id", d=> "marker_"+d[0]+"_"+nameOf(d))
		.attr("transform",d=>"translate("+d[2]+","+(-d[4])+")")
		.classed("playerMarker",1)
	newMarkers.append("circle")
		.attr("r",rad)
		.attr("cx",0)
		.attr("cy",0)
		.merge(playersMarkers)
	newMarkers.append("line")
		.attr("x1",0)
		.attr("y1",0)
		.attr("x2",function(d,i,arr){
			return i>0? arr[i-1].__data__[2] - d[2]:0
		})
		.attr("y2",function(d,i,arr){
			return i>0? -(arr[i-1].__data__[4] - d[4]):0
		})
	newMarkers.append("polygon")
		.attr("points",d =>{
			let lookx = d[5] * rad
			let looky = -d[7] * rad
			let sqrt3 = Math.sqrt(3)
			return [
				[-looky, lookx],
				[sqrt3 * lookx, sqrt3 * looky],
				[looky, -lookx]
			].map(x=>x.join(",")).join(" ")
		})
	
	newMarkers.append("title")
		.text(nameOf)
	newMarkers.merge(playersMarkers)
		.attr("opacity",d=>(0.3*(parseFloat(d[0])-serie.start)/serie.selectedTime))
		.filter(":last-child")
		.attr("opacity",1)	
		

	playersMarkers.exit().remove();
	playersLayers.exit().remove();

	var plants = d3.nest()
		.key(d=>d[1])
		.entries(serie.PlantMotions.filter(x=>x.length > 2))
		.map(e => {
			let age = (parseFloat(e.values[0][0])-serie.start)
			let negativeAge = age > serie.selectedTime
			if(negativeAge)
				return null;
			let lastIndex = moveUpTo(e.values,serie.selectedTime)
			return e.values[Math.max(0,lastIndex-1)];
		})
		.filter(x=>x)
	var markerPlants = d3.select(".plantLayer")
		.selectAll("g")
		.data(plants,function(d){
			return this && this.id || d && "marker_"+d[0]+"_"+d[1];
		})
	var newPlantsMarkers = markerPlants.enter()
		.append("g")
		.attr("id",d=> "marker_"+d[0]+"_"+d[1])
	newPlantsMarkers.append("text")
		.attr("x",0)
		.attr("y",0)
		.text("🌳")
		.append("title")
	newPlantsMarkers.merge(markerPlants)
		.attr("transform",d=>"rotate("+d[6]+") translate("+d[3]+","+(-d[5])+")")
		.select("title")
		.text(d=> "Last modified by "+serie.players[d[2]])
	markerPlants.exit().remove()


	let playersLastPos = d3.select(".minimap")
		.selectAll("use")
		.data(
			d3.select(".minimap").selectAll("g.layer_player").nodes(),
			function(d){
				return this && this.id || d && "last_of"+d.id;
			}
		)
	playersLastPos.enter()
		.append("use")
		.style("--color",d=>{
			return d.style.getPropertyValue("--color")
		}
		)
		.attr("id",d=> "last_of"+d.id)
		.merge(playersLastPos)
		.raise() 
		.attr("href",d => {
			var ns = d3.select(d).selectAll(".playerMarker").nodes()
			if(!ns || !ns.length)
				return "";
			return "#"+ns[ns.length-1].id;
		})
	playersLastPos.exit().remove();
}
function displayDataOf(event){
	d3.select(".eventDate")
		.text(mm_ssFormat(event.tiemstamp))
	d3.select(".eventType")
		.text(event.type)
	displaySpeData(event.type, event.data)
}
function timeControl(){
	let flows = [-10,-2,-1,0,1,2,10]
	let flowControl = d3.select(".timeControl")
		.selectAll("span")
		.data(flows)
		.enter()
		.append("span")
		.classed("timeButton",1)
	flowControl.append("label")
		.attr("for",d=>"play_at"+d)
		.text(d=>d)
	flowControl.append("input")
		.attr("name",d=>"play_rate")
		.attr("id",d=>"play_at"+d)
		.attr("type","radio")
		.on("change",function(d){
			if(this.checked)
				Play(d);
		})
		.each(function(d){
			this.checked = !d;
		})
}
function displaySpeData(type, data){
	d3.select(".eventOwnData")
		.text(data.toString())
	
}
function colorHash(stringy){
	var hash = 0, i, chr;
	var str = stringy.toString()
	if (str.length === 0) return hash;
	for (i = 0; i < str.length; i++) {
		chr   = str.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	let start = hash % (colors.length - 6)
	return colors.slice(start,start+6);
	
}

