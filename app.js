const path=require('path');
const express=require('express');
const fs=require('fs');
const morgan=require('morgan');
const appError=require('./utils/appError.js');
const globalErrorHandler=require('./Controller/errorController.js');
const tourRouter=require('./routes/tourRoutes');
const userRouter=require('./routes/userRoutes');
const reviewRouter=require('./routes/reviewRoutes.js');
const bookingRouter=require('./routes/bookingRoutes.js');
const viewRouter=require('./routes/viewRoutes.js');
const rateLimit=require('express-rate-limit');
const helmet=require('helmet');
const mongoSanitize=require('express-mongo-sanitize');
const xss=require('xss-clean');
const hpp=require('hpp');
const cookieParser=require('cookie-parser');

const app=express();

app.set('view engine', 'pug');
app.set('views',path.join(__dirname,'views'));

//1)GLOBAL MIDDLEWARES

//serving static files
app.use(express.static(path.join(__dirname,'starter/public')));

//set security HTTP headers
app.use(helmet());

//Body parser,reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended:true, limit: '10kb' }));
app.use(cookieParser());

//Data sanitization against NoSQL query injection
app.use(mongoSanitize());

//Data sanitization against XSS
app.use(xss());

//development logging
if(process.env.NODE_ENV==='development')
{
    app.use(morgan('dev'));
}

const limiter=rateLimit({
    max:100,
    windowMs:60*60*1000,
    message:'Too many requests from this IP,try again after an hour'
});


//limit requests from same API
app.use('/api',limiter);

//Prevent parameter pollution
app.use(hpp({
    whitelist: ['duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price']
}));

app.use((req,res,next) => {
    req.requestTime=new Date().toISOString();
    console.log(req.cookies);
    next();
});

app.use('/',viewRouter);
app.use('/api/v1/tours',tourRouter);
app.use('/api/v1/users',userRouter);
app.use('/api/v1/reviews',reviewRouter);
app.use('/api/v1/bookings',bookingRouter);

app.all('*',(req,res,next) => {
    // res.status(404).json({
    //     status:'fail',
    //     message: `Can't find ${req.originalUrl} on this server`
    // });
    next(new appError(`Can't find ${req.originalUrl} on this server`,404));
});

app.use(globalErrorHandler);

module.exports=app;