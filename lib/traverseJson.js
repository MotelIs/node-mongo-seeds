var ObjectID = require('mongodb').ObjectID;
var semaphore = 0;

var formatJson = function(json){

  for(var key in json){
    if(json.hasOwnProperty(key)){
      semaphore++;
    }
  }
  
  for(var key in json){
    if(json.hasOwnProperty(key)){
      if(key.indexOf('oid_') === 0){
        var newKey = key.substring(4, key.length);
        json[newKey] = new ObjectID.createFromHexString(json[key]);  
        delete json[key];
        if(typeof json[newKey] === 'object'){
          formatJson(json[newKey]);      
        }               
      }else{
        if(typeof json[key] === 'object'){
          formatJson(json[key]);      
        }              
      }
      semaphore--;   
    }     
    
    if(semaphore === 0){
      return json;
    }
  }
}

module.exports = {
  formatJson
}
