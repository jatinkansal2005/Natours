const appError=require('./../utils/appError.js');
const catchAsync=require('./../utils/catchAsync.js');
const APIfeatures=require('./../utils/apiFeatures.js');

exports.deleteOne=Model => catchAsync(async(req,res,next) => {
    const doc=await Model.findByIdAndDelete(req.params.id);
    if(!doc)
    {
       return next(new appError('Could not find document with that ID',404));
    }
    res.status(204).json({
        status:'success',
        data:null
    });
});

exports.updateOne= Model => catchAsync(async(req,res,next) => {
    const doc=await Model.findByIdAndUpdate(req.params.id,req.body,{
        new:true,
        runValidators:true
    });
    if(!doc)
    {
       return next(new appError('Could not find document with that ID',404));
    }
    res.status(200).json({
        status:'success',
        data:{
            data: doc
        }
    });
});

exports.createOne= Model => catchAsync(async (req,res,next) => {
    const doc=await Model.create(req.body);
    res.status(201).json({
                 status : 'success',
                data: {
                     data:doc
                }
            });
});

exports.getOne= (Model,popOptions) => catchAsync(async(req,res,next) => {
    let query=await Model.findById(req.params.id);
    if(popOptions)
    query=query.populate(popOptions);
    const doc= await query;
    if(!doc)
    {
        return next(new appError('Could not find document with that ID',404));
    }
 res.status(200).json({
     status : 'success',
     data : {
        data: doc
     }
 });
});

exports.getAll= Model => catchAsync(async(req,res,next) => {

    //To allow for nested GET reviews on tour(hack)
    let filter={};
    if(req.params.tourId) filter={ tour: req.params.tourId };

    //EXECUTE QUERY
    const features=new APIfeatures(Model.find(filter),req.query)
    .filter()
    .sort()
    .fields()
    .pagination();
    const doc=await features.query;

        //SEND RESPONSE
    res.status(200).json({
       status : 'success',
       results : doc.length,
       data : {
          data: doc
       }
     });
});