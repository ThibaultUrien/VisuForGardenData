

var port = process.argv[2] || 3000

var path = require('path')
var fs = require('fs')
var spdy = require('spdy')
var express = require('express')
var http = require('http');
var bodyParser = require('body-parser');


var app = express();
app.use(bodyParser.json())


app.use(express.static(__dirname))



console.log("starting : "+port)

app.listen(port, function (){console.log("starting")})

app.get("/list.json",function (req,res){
  var list = fs.readdirSync("GoodLogs")
  console.log(list);
  var result = {list : list}
  res.type('json')
  res.send(JSON.stringify(result));
})
app.get("/logs/:expName",function (req,res){

  console.log("try get exp "+ req.params.expName)
  var dirPath = "GoodLogs/"+req.params.expName
  var list = fs.readdirSync(dirPath)
  console.log(list);
  var result = {name : req.params.expName}
  for(var file of list) {
    var entryName = file.split(/\.[^.]+$/g)[0]
    result[entryName] = fs.readFileSync(dirPath+'/'+file, 'utf8').split(/\r?\n/).map(line => line.split(","));

    // Remove BOM
    if(result[entryName] && result[entryName][0] && result[entryName][0][0])
      result[entryName][0][0] = result[entryName][0][0].replace(/^\uFEFF/, '');
  }
  res.type('json')
  res.send(JSON.stringify(result));;
})


