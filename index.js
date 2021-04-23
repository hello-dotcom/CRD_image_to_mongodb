const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const app = express();
//middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));

//mongo uri
const mongoURI = 'mongodb://localhost/image';
const conn = mongoose.createConnection(mongoURI);
// initialize gridfs
let gfs;

conn.once('open',()=>{
    //initialize stream
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
})

//create storage engine
const  storage = new GridFsStorage({
    url:mongoURI,
    file:(req,file)=>{
        return new Promise((resolve,reject)=>{
            crypto.randomBytes(16,(err,buf)=>{
                if(err){
                    return reject(err);
                }
                const filename = buf.toString('hex')+path.extname(file.originalname);
                const fileInfo = {
                    filename:filename,
                    bucketName:'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({storage});

//@route get /
//#desc loads from

app.set('view engine','ejs');

app.get('/',(req,res)=>{
   // res.render('index');
   gfs.files.find().toArray((err,files)=>{
    //check if files exists
    if(!files || files.length===0){
        res.render('index',{files:false});
    }
    else{
        files.map(file=>{
            if(file.contentType==='image/jpeg' || file.contentType==='image/png')
            {
                file.isImage = true;
            }
            else   {
                file.isImage = false;
            }
        });
        res.render('index',{files:files});

    }
    //files exists
    // return res.json({files});
    });
})


//@route POST /upload

app.post('/upload',upload.single('file'),(req,res)=>{
   // res.json({file:req.file});
   res.redirect('/');
})
//route get /files
//display all files in json
app.get('/files',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        //check if files exists
        if(!files || files.length===0){
            return res.status(404).json({err:"no files exists"});
        }
        //files exists
        return res.json({files});
    })

})


//route get /files/:filename
//display file in json
app.get('/files/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(file===null){
            return res.status(404).json({err:"No file exists"});
        }
        //file exists
        return res.json(file);
    })

})


//route get /image/:filename
//display single file object
app.get('/image/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(file===null){
            return res.status(404).json({err:"No file exists"});
        }
        //file exists
        //check if image
        if(file.contentType==='image/jpeg'|| file.contentType==='image/png'){
            //read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        }
        else{
            res.status(404).json({err:"not an image"});
        }
    })

})

//routes delete /files/:id
// delete file
app.delete('/files/:id',(req,res)=>{
    gfs.remove({_id:req.params.id,root:'uploads'},(err,gridStroe)=>{
        if(err){
            return res.status(404).json({err:err});
        }
        res.redirect('/');
    });
})

const port = 5000;

app.listen(5000,()=>{console.log("listening at 500")});
