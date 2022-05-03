const express=require('express');
const tourController=require('./../Controller/tourController');
const router=express.Router();
const authController=require('./../Controller/authController.js');
const reviewRouter=require('./reviewRoutes.js');
//router.param('id',tourController.checkId);

router.route('/top-5-tours')
    .get(tourController.aliasTopTours,tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

router.route('/monthly-plan/:year').get(authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan);

router.route('/tours-within/:distance/center/:latlng/unit/:unit')
        .get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit')
    .get(tourController.getDistances);

router
    .route('/')
    .get(tourController.getAllTours)
    .post(authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour);

router
    .route('/:id')
    .get(tourController.getTour)
    .patch(authController.protect,
        authController.restrictTo('admin','lead-guide'),
        tourController.uploadTourImages,
        tourController.resizeTourImages,
        tourController.updateTour)
    .delete(authController.protect,
    authController.restrictTo('admin','lead-guide'),
    tourController.deleteTour);

router.use('/:tourId/reviews',reviewRouter);

// router
//     .route('/:tourId/reviews')
//     .post(authController.protect
//     ,authController.restrictTo('user')
//     ,reviewController.createReview);

module.exports=router;