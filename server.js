const express = require('express');
const app = express();
const fs = require('fs');
const formidable = require('formidable');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('cookie-session');
var ExifImage = require('exif').ExifImage;
const mongourl = 'mongodb+srv://mahoshi:a123123@cluster0-lqb1s.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'photos';

var t = "";

app.post('/uploadPhoto', (req,res) => {
  let form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    console.log(JSON.stringify(files));
    let filename = files.filetoupload.path;
    if (fields.title) {
      var title =  (fields.title.length > 0) ? fields.title : "null";
      console.log(`title = ${title}`);
    }
    if (fields.description) {
      var description =  (fields.description.length > 0) ? fields.description : "null";
      console.log(`description = ${description}`);
    }
    if (files.filetoupload.type) {
      var mimetype = files.filetoupload.type;
      console.log(`mimetype = ${mimetype}`);
    }
    fs.readFile(filename, (err,data) => {
      let client = new MongoClient(mongourl);
      client.connect((err) => {
        try {
          assert.equal(err,null);
        } catch (err) {
          res.status(500).end("MongoClient connect() failed!");
        }
        const db = client.db(dbName);
        let new_r = {};
	t = title;
        new_r['title'] = title;
        new_r['description'] = description;
        new_r['mimetype'] = mimetype;
        new_r['image'] = new Buffer.from(data).toString('base64');
	new_r['make'] = "haha";
	new_r['model'] = "";
	new_r['date'] = "";
	new_r['lon'] = 0;
	new_r['lat'] = 0;
        upload_photo(db,new_r,(result) => {
          client.close();
          res.redirect(301,'/display');
        });
      });
    });
  });
});

app.get('/', function(req,res) {
  res.render('uploadPhoto.ejs');
});

app.get('/uploadPhoto', function(req,res) {
  res.render('uploadPhoto.ejs');
});

function upload_photo(db,r,callback) {
  db.collection('photo').insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("upload was successful!");
    //console.log(JSON.stringify(result));
    callback(result);
  });
}

app.get('/display', (req,res) => {
  let client = new MongoClient(mongourl);
  client.connect((err) => {
    try {
      assert.equal(err,null);
    } catch (err) {
      res.status(500).end("MongoClient connect() failed!");
    }      
    console.log('Connected to MongoDB');
    const db = client.db(dbName);
    let criteria = {};
    criteria['title'] = t;
    findPhoto(db,criteria,(rest) => {
      client.close();
      console.log('Disconnected MongoDB');
      let image_ = new Buffer(rest[0].image,'base64');     
	new ExifImage({ image : image_ }, function (error, exifData) {
        if (error){
            console.log('Error: '+error.message);
          res.redirect(301,'/uploadPhoto');
	}
        else{
	console.log(rest[0].title);
            console.log(exifData.exif.FNumber);
	console.log(exifData);
	rest[0].make = exifData.image.Make;
	rest[0].model = exifData.image.Model;
	rest[0].date = exifData.image.ModifyDate;
console.log(exifData.gps.GPSLatitude[0]);
if (exifData.gps.GPSLatitudeRef == 'S'){
	rest[0].lat = 0 - (exifData.gps.GPSLatitude[0] + exifData.gps.GPSLatitude[1]/60 + exifData.gps.GPSLatitude[2]/3600);
}
else{
	rest[0].lat = exifData.gps.GPSLatitude[0] + exifData.gps.GPSLatitude[1]/60 + exifData.gps.GPSLatitude[2]/3600;
}
if (exifData.gps.GPSLongitude == 'W'){
	rest[0].lon = 0 - (exifData.gps.GPSLongitude[0] + exifData.gps.GPSLongitude[1]/60 + exifData.gps.GPSLongitude[2]/3600);
}
else{
	rest[0].lon = exifData.gps.GPSLongitude[0] + exifData.gps.GPSLongitude[1]/60 + exifData.gps.GPSLongitude[2]/3600;
}
	console.log(rest[0].make);
	console.log(rest[0].model);
	console.log(rest[0].date);
	console.log(rest[0].lon);
	console.log(rest[0].lat);
	console.log("--------------------------");
        res.render('detail.ejs',{rest:rest});
	}
    });
    });
  });
});

app.get("/map", (req,res) => {
    res.render("map.ejs", {
        lon:req.query.lat,
        lat:req.query.lon,
        zoom:15
    });
    res.end();
});

const findPhoto = (db,criteria,callback) => {
  console.log(criteria);
  console.log('----------------------');
  const cursor = db.collection('photo').find(criteria);
  var rest = [];
  cursor.forEach((doc) => {
    rest.push(doc);
  }, (err) => {

    assert.equal(err,null);
    callback(rest);
  })
}

app.listen(process.env.PORT || 8099);
