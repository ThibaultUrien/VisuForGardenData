

var port = process.argv[2] || 3000
var dir = process.argv[3] || "GoodLogs"


var path = require('path')
var fs = require('fs')
var spdy = require('spdy')
var express = require('express')
var http = require('http');
var bodyParser = require('body-parser');


var app = express();
app.use(bodyParser.json())

app.get("/LoadData.js",function (req,res){
  res.type('.js');
  res.send('StartWithRemoteData("/list.json")');
})
app.use(express.static(__dirname))




app.get("/list.json",function (req,res){
  
  var list = fs.readdirSync(dir)
  var result = {list : list}
  res.type('json')
  res.send(JSON.stringify(result));
})

app.get("/logs/:expName",function (req,res){

  var dirPath = dir+"/"+req.params.expName
  var list = fs.readdirSync(dirPath)
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



console.log("starting : "+port)

app.listen(port, function (){console.log("starting")})