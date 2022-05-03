const multer=require('multer');
const sharp=require('sharp');
const Tour=require('./../models/tourModel');
const catchAsync=require('./../utils/catchAsync.js');
const appError=require('./../utils/appError.js');
const factory=require('./handleFactory.js');

const multerStorage=multer.memoryStorage();

const multerFilter= (req,file,cb) => {
    if(file.mimetype.startsWith('image')){
        cb(null,true);
    }
    else{
        cb(new appError('Not an image! Please upload only images.',400),false);
    }
};

const upload=multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadTourImages= upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name:'images', maxCount: 3 }
]);

exports.resizeTourImages= catchAsync(async (req,res,next) => {
    if(!req.files.imageCover || !req.files.images)
    return next();

    //1)Cover Image
    req.body.imageCover=`tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000,1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`starter/public/img/tours/${req.body.imageCover}`);
        
    //2)Images
    req.body.images=[];
    await Promise.all(
        req.files.images.map(async (file,i) => {
            const filename=`tour-${req.params.id}-${Date.now()}-${i+1}.jpeg`;
            await sharp(file.buffer)
            .resize(2000,1333)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`starter/public/img/tours/${filename}`);

            req.body.images.push(filename);
        }));
    next();
});

//upload.single('image');
//upload.array('images',5);

//const tours=JSON.parse(fs.readFileSync(`./starter/dev-data/data/tours-simple.json`));

// exports.checkId=(req,res,next,val) => {
//     console.log(`Tour id is ${val}`);
//     const id=req.params.id*1;
//     const tour=tours.find(el => el.id===id);
//     if(!tour)
//     {
//         return res.status(404).json({
//             status:'fail',
//             message:'Invalid ID'
//         });
//     }
//     next();
// }

// exports.checkBody=(req,res,next) => {
//     if(!req.body.name || !req.body.price)
//     {
//         return res.status(400).json({
//             status:'fail',
//             message:'Missing name or price!'
//         });
//     }
//     next();
// }

exports.aliasTopTours= (req,res,next) => {
    req.query.limit='5';
    req.query.sort='-ratingsAverage,price';
    req.query.fields='name,price,ratingsAverage,summary,difficulty';
    next();
}

exports.getAllTours=factory.getAll(Tour);

exports.getTour= factory.getOne(Tour,{path: 'reviews'});

exports.createTour= factory.createOne(Tour);

exports.updateTour= factory.updateOne(Tour);

exports.deleteTour=factory.deleteOne(Tour);

exports.getToursWithin=catchAsync( async (req,res,next) => {

    const { distance,latlng,unit } = req.params;
    const [lat,lng]=latlng.split(',');
    const radius= unit==='mi' ? distance/3963.2 : distance/6378.1 ;
    if(!lat || !lng)
    {
        next(new appError(
        'Please provide latitude and longitude in the format lat,lng.',400));
    }
    const tours=await Tour.find({ startLocation:
         { $geoWithin: { $centerSphere: [[lng,lat],radius] } } });
    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    });
});

exports.getDistances=catchAsync( async (req,res,next) => {
    const { latlng,unit } = req.params;
    const [lat,lng]=latlng.split(',');
    const multiplier= unit==='mi' ? 0.000621371 : 0.001;
    if(!lat || !lng)
    {
        next(new appError(
        'Please provide latitude and longitude in the format lat,lng.',400));
    }

    const distances=await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1,lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    });
});

// exports.deleteTour=catchAsync(async(req,res,next) => {
//         const tour=await Tour.findByIdAndDelete(req.params.id);
//         if(!tour)
//         {
//            return next(new appError('Could not find tour with that ID',404));
//         }
//         res.status(204).json({
//             status:'success',
//             data:null
//         });
// });

exports.getTourStats = catchAsync(async (req,res,next) => {
        const stats= await Tour.aggregate([
            {
                $match : {
                    ratingsAverage: {$gte : 4.5}
                }
            },
            {
                $group : {
                    _id: {$toUpper : '$difficulty'},
                    numTours: { $sum : 1},
                    numRating: { $sum : '$ratingsQuantity'},
                    avgRating: { $avg : '$ratingsAverage'},
                    avgPrice: { $avg : '$price'},
                    minPrice: { $min : '$price'},
                    maxPrice: { $max : '$price'}
                }
            },
            {
                $sort : { avgPrice : 1 }
            }
            // {
            //     $match : { _id : { $ne: 'EASY' } }
            // }
        ]);

        res.status(200).json({
            status:'success',
            data:{
                stats
            }
        });
});

exports.getMonthlyPlan = catchAsync(async (req,res,next) => {
        const year=req.params.year * 1;
        const plan= await Tour.aggregate([
            {
                $unwind:  '$startDates' 
            },
            {
                $match: {
                    startDates: {
                        $gte : new Date(`${year}-01-01`),
                        $lte: new Date(`${year}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month : '$startDates' },
                    numTourStarts: { $sum : 1 },
                    tours : { $push : '$name' }
                }
            },
            {
                $addFields : { month : '$_id' }
            },
            {
                $project : { _id : 0 }
            },
            {
                $sort : { numTourStarts : -1 }
            }
        ]);

        res.status(200).json({
            status:'success',
            data:{
                plan
            }
        });
});