/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    user = require('./routes/user'),
    http = require('http'),
    path = require('path'),
    fs = require('fs');

const requestAPI = require('request');
var app = express();

var db;

var cloudant;

var fileToUpload;

var dbCredentials = {
    dbName: 'newsdb'
};

var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var multipart = require('connect-multiparty')
var multipartMiddleware = multipart();




// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);
    // Pattern match to find the first instance of a Cloudant service in
    // VCAP_SERVICES. If you know your service key, you can access the
    // service credentials directly by using the vcapServices object.
    for (var vcapService in vcapServices) {
        if (vcapService.match(/cloudant/i)) {
            return vcapServices[vcapService][0].credentials.url;
        }
    }
}

function initDBConnection() {
    //When running on Bluemix, this variable will be set to a json object
    //containing all the service credentials of all the bound services
    // if (process.env.VCAP_SERVICES) {
    //     dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    // } else { //When running locally, the VCAP_SERVICES will not be set
    //
    //     // When running this app locally you can get your Cloudant credentials
    //     // from Bluemix (VCAP_SERVICES in "cf env" output or the Environment
    //     // Variables section for an app in the Bluemix console dashboard).
    //     // Once you have the credentials, paste them into a file called vcap-local.json.
    //     // Alternately you could point to a local database here instead of a
    //     // Bluemix service.
    //     // url will be in this format: https://username:password@xxxxxxxxx-bluemix.cloudant.com
    //     //dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    //     dbCredentials.url = "https://c49bae80-39fb-40d9-85f8-4cfd9586104a-bluemix:137252d7873a272ffab743df0ea8f2f2c83e18d3d4610981f9dbde53e21b9846@c49bae80-39fb-40d9-85f8-4cfd9586104a-bluemix.cloudant.com"
    // }
    dbCredentials.url = "https://740ce983-c605-45cf-96c3-3c6d2dc1fbb5-bluemix:0ba9c7ac8ca19b03c63e844f8c143ddf59eb3f415d9ae1cc33aa836a8c883a69@740ce983-c605-45cf-96c3-3c6d2dc1fbb5-bluemix.cloudant.com"
    cloudant = require('cloudant')(dbCredentials.url);

    // check if DB exists if not create
    cloudant.db.create(dbCredentials.dbName, function(err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
        }
    });



    db = cloudant.use(dbCredentials.dbName);
    var topic = {name:'topic', type:'json', index:{fields:['topic']}}
    db.index(topic, function(er, response) {
      if (er) {
        throw er;
      }

      console.log('Index creation result: %s', response.result);
    });

}

initDBConnection();

app.get('/', routes.index);

function createResponseData(id, url,concept_score,entity_score,final_score,tense_score,keyword_score,news_title,topic,news_id,rev, attachments) {

    var responseData = {
        id: id,
        name: news_title,
        url:sanitizeInput(url),
        value: sanitizeInput(final_score),
        concept_score:concept_score,
        entity_score: entity_score,
        final_score:final_score,
        tense_score:tense_score,
        keyword_score:keyword_score,
        topic:topic,
        news_id:news_id,
        rev:rev,
        attachements: []
    };
    return responseData;
}

function sanitizeInput(str) {
    return String(str).replace(/&(?!amp;|lt;|gt;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

var saveDocument = function(id, name, value, response) {

    if (id === undefined) {
        // Generated random id
        id = '';
    }

    db.insert({
        name: name,
        value: value
    }, id, function(err, doc) {
        if (err) {
            console.log(err);
            response.sendStatus(500);
        } else
            response.sendStatus(200);
        response.end();
    });

}

app.get('/api/favorites', function(request, response) {

    console.log("get latest News ")
    db = cloudant.use(dbCredentials.dbName);
    var docList = [];
    var i = 0;
    var foundLatest = false;


    db.find({selector:{topic:request.query.topic}},function(err, body) {
        if (!err) {
            var len = body.docs.length;
            console.log('total # of docs -> ' + len);
            body.docs.forEach(function(doc) {
              console.log(doc);


              var datetime = doc.timestamp.split(" ");
              var dateStr = datetime[0];
              var timeStr = datetime[1];
              var dateArray = dateStr.split("-");
              var timeArray = timeStr.split(":");

              var docDate = new Date(dateArray[2],dateArray[1]-1,dateArray[0],timeArray[0], timeArray[1],timeArray[2],0 );
              var currDate = (new Date());

              console.log("Doc Date:"+docDate);
              console.log("currDate:"+currDate);
              if((docDate.getFullYear()==currDate.getFullYear()) &&
                 (docDate.getMonth()==currDate.getMonth()) &&
                 (docDate.getDate()==currDate.getDate()) &&
                 (docDate.getHours()==currDate.getHours()) )
              {
                console.log("Found latest news ");
                foundLatest = true
              }
              else {
                foundLatest = false
              }
              var responseData = createResponseData(
                  doc._id,
                  doc.url,
                  doc.concept_score,
                  doc.entity_score,
                  doc.final_score,
                  doc.tense_score,
                  doc.keyword_score,
                  doc.news_title,
                  doc.topic,
                  doc._id,
                  doc._rev,
                  []);
               docList.push(responseData);
            });


        }
        if(!foundLatest)
        {
          console.log("Latest news not found delete old records ");
          docList.forEach(function(doc)
          {
            db.destroy(doc.id, doc.rev,  function(err) {
                if (!err) {
                  console.log("Successfully deleted doc with fkId: "+ doc.id);
                }
                else {
                  console.log("Successfully deleted doc with fkId: "+ doc.id);
                }
            });
          });
          console.log("Calling score api...... ");
          requestAPI('https://newsrankapp.mybluemix.net/api/news_score?query='+request.query.topic, function (error, restresponse, body) {
            console.log('error:', error); // Print the error if one occurred
            console.log('statusCode:', restresponse && restresponse.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print the HTML for the Google homepage.
            docList = [];
            console.log("Calling score api repspose ");
            db.find({selector:{topic:request.query.topic}},function(err, body) {
                if (!err) {
                    var len = body.docs.length;
                    console.log('total # of docs -> ' + len);
                    body.docs.forEach(function(doc) {
                      foundLatest = true
                      var responseData = createResponseData(
                          doc._id,
                          doc.url,
                          doc.concept_score,
                          doc.entity_score,
                          doc.final_score,
                          doc.tense_score,
                          doc.keyword_score,
                          doc.news_title,
                          doc.topic,
                          doc._id,
                          doc._rev,
                          []);
                       docList.push(responseData);
                    });
                    response.write(JSON.stringify(docList));
                    console.log('ending response...');
                    response.end();
                }
              });
          });

        }
        else {
          response.write(JSON.stringify(docList));
          console.log('ending response...');
          response.end();
        }

  });
});

http.createServer(app).listen(app.get('port'), '0.0.0.0', function() {
    console.log('Express server listening on port ' + app.get('port'));
});
