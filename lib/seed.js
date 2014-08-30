/**
 * This script inserts into mongo the contents of all the .json files in the /seeds directory.
 *
 * The name of the file is the collection that the contents of that file will be inserted into.
 *      Example: This script will insert all the records in cohort.json into the collection "cohort"
 *
 * Note: Make sure all .json files in the /seeds directory are the singular form.
 *
 * Usage: $ node seed
 *
 * @author Tom Caflisch
 */

/*
 var optimist = require('optimist');
 var argv = optimist
 .usage('Populate mongo from a set of .json files. \n Usage: $ node seed')
 .describe('d', 'The path to your mongo db')
 .demand(['d'])
 .argv;
 */


console.log('in it.js');

var q = require('q');
var pmongo = require('promised-mongo');
// TODO - Somehow get the calling app root path, rather than doing ../../
var parsedJSON = require(process.cwd()+"/../../seed.json");
// TODO - Somehow get the calling app root path, rather than doing ../../



var dir = process.cwd()+'/../../seeds';
var db = pmongo('mongodb://'+parsedJSON.db);
var fs = require('fs'); // Used to get all the files in a directory
var util = require('util');
var path = require('path');

module.exports.convert = function() {

  // Read all the files in the ./seeds folder
  var list = fs.readdirSync(dir);

  // Call the method to actually seed the db and when it's complete, close the connection to mongo
  seed_db(list).done(function () {
    console.log('----------------------');
    console.log('All done. Go play!');
    db.close();
  });

  /**
   * Loops through all the .json files in ./seeds and removes all the records
   *
   * @param list
   * @param callback
   */
  function seed_db(list, callback) {

    console.log('Seeding files from directory ' + path.resolve(dir));
    console.log('----------------------');

    var removeOperations = [];
    var returnPromise = q.defer();

    // For every file in the list
    list.forEach(function (file) {

      // Set the filename without the extension to the variable collection_name
      var collection_name = file.split(".")[0];

      console.log('Seeding collection ' + collection_name);

      // Parses the contents of the current .json file
      var parsedJSON = require(dir + '/' + file);

      // If the seed file is NOT an array
      if (!util.isArray(parsedJSON)) {
        returnPromise.reject(new Error('Seed file ' + collection_name + ' does not start with an Array'));
      }

      //Get collection to insert into
      var collection = db.collection(collection_name);

      //Queue up the "clear collection" promise
      removeOperations.push(
          collection.remove({})
              .then(function () {

                var insertPromises = [];

                //Queue up an "insert" promise for each record to be inserted
                for (var i = 0; i < parsedJSON.length; i++) {

                  insertPromises.push(
                      collection
                          .insert(parsedJSON[i])
                          .fail(function (err) {
                            //If insert fails...
                            console.log(err);
                          }
                      )
                  );

                }

                // The "clear collection" promise will resolve to the array of insert promises
                return insertPromises;
              })
              .fail(function (err) {
                //If clear collection fails...
                console.log(err);
              })
      );
    });

    //Wait until all removes are either resolved or rejected
    q.allSettled(removeOperations)
        .spread(function () {

          var allDone = [];

          // Populate array to hold all "insert" promises (arguments will be an array of arrays, with the
          // array values being the insert promises
          for (var x = 0; x < arguments.length; x++) {
            allDone = allDone.concat(arguments[x].value);
          }

          // Once all insert promises are either resolved or rejected, resolve the final promise
          q.allSettled(allDone).done(function () {
            returnPromise.resolve();
          });
        });

    //Return the deferred promise
    return returnPromise.promise;
  }
}