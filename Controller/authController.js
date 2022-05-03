const { promisify }=require('util');
const User=require('./../models/userModel.js');
const catchAsync=require('./../utils/catchAsync.js');
const jwt=require('jsonwebtoken');
const appError=require('./../utils/appError.js');
const Email=require('./../utils/email.js');
const crypto=require('crypto');

const signToken= id => {
    return jwt.sign({ id },process.env.JWT_SECRET);
}

const createSendToken= (user,statusCode,res) => {
    const token=signToken(user._id);
    const cookieOptions={
        expires: new Date(Date.now()+
        process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000),
        httpOnly:true 
     };
     if(process.env.NODE_ENV==='production') cookieOptions.secure=true;
    res.cookie('jwt',token,cookieOptions);
    //remove password from output
    user.password=undefined;
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
}

exports.signup= catchAsync(async (req,res,next) =>{
    const newUser=await User.create(req.body);
    const url=`${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser,url).sendWelcome();
    createSendToken(newUser,201,res);
});

exports.login= catchAsync(async(req,res,next) => {
    const email=req.body.email;
    const password=req.body.password;
    //1)Check if email and password exist
    if(!email || !password)
    {
        return next(new appError('please provide email and password',400));
    }
    //2)check if user exists and password is correct
    const user=await User.findOne({ email }).select('+password');
    if(!user || !await user.correctPassword(password,user.password))
    {
        return next(new appError('Invalid email or password',401));
    }

    //3)if everything ok send token to client
    createSendToken(user,200,res);
});

exports.logout= (req,res) => {
    res.cookie('jwt','loggedout',{
        expires: new Date(Date.now() + 10*1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
};

exports.protect= catchAsync(async (req,res,next) => {
    //1)Getting token and check if it's there
    let token;
    if(req.headers.authorization 
    && req.headers.authorization.startsWith('Bearer'))
    {
        token=req.headers.authorization.split(' ')[1];
    } else if(req.cookies.jwt) {
        token=req.cookies.jwt;
    }
    if(!token)
    {
        return next(
        new appError
        ('You are not logged in! Please login to get access',401));
    }

    //2)verification token
    const decoded=await promisify(jwt.verify)(token,process.env.JWT_SECRET);

    //3)Check if user still exists
    const currentUser=await User.findById(decoded.id);
    if(!currentUser)
    {
        return next(new appError
        ('The user belonging to this token no longer exists',401));
    }

    //4)check if user changed password 
    if(currentUser.changePasswordAfter(decoded.iat))
    return next(new appError(
        'User recently changed password! Please login again',401));

    //GRANT ACCESS TO PROTECTED ROUTE
    req.user=currentUser;
    res.locals.user=currentUser;
    next();
});

exports.isLoggedIn=async (req,res,next) => {
    if(req.cookies.jwt){
        try{
    //1)verification token
    const decoded=await promisify(jwt.verify)(req.cookies.jwt,process.env.JWT_SECRET);

    //2)Check if user still exists
    const currentUser=await User.findById(decoded.id);
    if(!currentUser)
    {
        return next();
    }

    //3)check if user changed password 
    if(currentUser.changePasswordAfter(decoded.iat))
    {
    return next();
    }

    //There is a logged in user
    res.locals.user=currentUser;
    return next();
    }catch(err){
        return next();
    }   
    }
    next();
};

exports.restrictTo=  (...roles) => {
    return (req,res,next) => {
        if(!roles.includes(req.user.role)){
            return next(new appError(
            'You do not have permission to perform this action!',403));
        }
        next();
    };
};

exports.forgotPassword= catchAsync(async (req,res,next) => {
    //1)Get users based on posted email
    const user=await User.findOne({ email: req.body.email });
    if(!user)
    {
        return next(new appError('There is no user with this email address'
        ,404));
    }

    //2)Generate the random reset token
    const resetToken=user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    //3)Actually send email
    try{
         const resetURL=`${req.protocol}://${req.get('host')}
         /api/v1/users/resetPassword/${resetToken}`;
    //  await sendEmail({
    //      email:user.email,
    //      subject: 'your password reset token(valid for 10 min)',
    //      message
    //  });
    await new Email(user,resetURL).sendPasswordReset();

     res.status(200).json({
         status: 'success',
         message: 'token send to email!'
     });
    }catch(err){
        user.passwordResetToken=undefined;
        user.passwordResetExpire=undefined;
        await user.save({ validateBeforeSave: false });
        return next(new appError(
        'There was an error sending the email!Try again later',500));
    }
});

exports.resetPassword= catchAsync( async (req,res,next) => {
    //1)Get user based on the token
    const hashedToken=crypto.createHash('sha256')
    .update(req.params.token).digest('hex');
    const user=await User.findOne({ passwordResetToken:hashedToken ,
     passwordResetExpire: { $gt: Date.now() } });

    //2)If token has not expired and there is user,set the new password
    if(!user)
    {
        return next(new appError('Token is invalid or has expired',400));
    }
    user.password=req.body.password;
    user.passwordConfirm=req.body.passwordConfirm;
    user.passwordResetToken=undefined;
    user.passwordResetExpire=undefined;
    await user.save();

    //3)update changePasswordAt property for the user

    //4)Log the user in,send JWT
    createSendToken(user,200,res);
});

exports.updatePassword=catchAsync(async (req,res,next) => {
    //1)Get user from collection
    const user=await User.findById(req.user._id).select('+password');
    //2)Check if POSTed current password is correct
    if(!(await user.correctPassword(req.body.passwordCurrent
    ,user.password))){
        return next(new appError('Your current password is wrong',401));
    }
    
    //3)If so update password
    user.password=req.body.password;
    user.passwordConfirm=req.body.passwordConfirm;
    await user.save();
    //User.findByIdAndUpdate will NOT work as intended!

    //4)Log user in,send JWT
    createSendToken(user,200,res);
});