const Review=require('./../models/reviewModel.js');
//const catchAsync=require('./../utils/catchAsync.js');
const factory=require('./handleFactory.js');

exports.getAllReviews= factory.getAll(Review);

exports.setTourUserIds= (req,res,next) => {
    if(!req.body.tour) req.body.tour=req.params.tourId;
    if(!req.body.user) req.body.user=req.user.id;
    next();
}

exports.createReview= factory.createOne(Review);

exports.getReview=factory.getOne(Review);

exports.deleteReview=factory.deleteOne(Review);
exports.updateReview=factory.updateOne(Review);