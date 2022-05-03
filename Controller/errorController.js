const appError=require('./../utils/appError.js');

const handleCastErrorDB=err => {
    const message=`Invalid ${err.path} : ${err.value}`;
    return new appError(message,400);
}

const handleDuplicateFieldsDB= err => {
    const value=err.keyValue.name;
    const message=`Duplicate field: ${value} found`;
    return new appError(message,400);
}

const handleValidationErrorDB= err => {
    const errors=Object.values(err.errors).map(el => el.message).join('. ');
    const message=`Invalid input data ${errors}`;
    return new appError(message,400);
}

const handleJWTError= err => new appError('Inavlid token! Please login again',401);

const sendErrorDev=(err,req,res) => {
    //API
    if(req.originalUrl.startsWith('/api'))
    {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
    }
    else
    {
        //RENDERED WEBSITE
        res.status(err.statusCode).render('error',{
            title: 'Something went wrong!',
            msg: err.message
        });
    }
}

const sendErrorProd=(err,req,res) => {
    //API
    if(req.originalUrl.startsWith('/api')){
    //Operational,trusted error:send message to client
    if(err.isOperational)
    {
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
    });
    }
    //programming or other unknown error: don't leak error details
    else
    {
        //1)Log error
        console.error('ERROR 💥',err);

        //2)Send generic message
        res.status(500).json({
            status:'error',
            message:'Something went very wrong!'
        });
    }
    }
    else
    {
        //RENDERED WEBSITE
        //Operational,trusted error:send message to client
    if(err.isOperational)
    {
        res.status(err.statusCode).render('error',{
            title: 'Something went wrong!',
            msg: err.message
        });
    }
    //programming or other unknown error: don't leak error details
    else
    {
        //1)Log error
        console.error('ERROR 💥',err);

        //2)Send generic message
        res.status(err.statusCode).render('error',{
            title: 'Something went wrong!',
            msg: 'Please try again later.'
        });
    }
    }
}

module.exports = (err,req,res,next) => {
    err.statusCode=err.statusCode || 500;
    err.status=err.status || 'error';
    if(process.env.NODE_ENV==='development')
    {
        sendErrorDev(err,req,res);
    }
    else if(process.env.NODE_ENV==='production')
    {
        let error = { ...err } ;
        error.message=err.message
        //Invalid ID's
        if(err.name === 'CastError')
       { 
           error=handleCastErrorDB(error);
       }
       //Duplicate names
       if(error.code===11000)
       {
           error=handleDuplicateFieldsDB(error);
       }
       //validation errors
       if(err.name==='ValidationError')
       {
           error=handleValidationErrorDB(error);
       }
       if(err.name==='JsonWebTokenError')
       {
           error=handleJWTError(error);
       }
        sendErrorProd(error,req,res);
    }
    next();
}