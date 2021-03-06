const mongoose=require('mongoose');
const slugify=require('slugify');
const validator=require('validator');
//const User=require('./userModel.js');
const tourSchema=new mongoose.Schema({
    name: {
        type: String,
        required: [true,'A tour must have a name'],
        unique: true,
        trim: true,
        minlength: [10,'A tour must have a length greater than equal to 10'],
        maxlength: [50,'A tour must have a length less than equal to 50']
        //validate: [validator.isAlpha,'A name should only contain alphabets']
    },
    slug: String,
    duration: {
        type: Number,
        required: [true,'A tour must have a duration']
    },
    maxGroupSize: {
        type: Number,
        required: [true,'A tour must have a maximum group size']
    },
    difficulty: {
        type: String,
        required: [true,'A tour must have a difficulty'],
        enum: {
            values: ['easy','medium','difficult'],
            message: 'The difficulty can only be easy,medium or difficult'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1,'A tour must have a rating greater than equal to 1.0'],
        max: [5,'A tour must have a rating less than equal to 5.0'],
        set: val=> Math.round(val*10) / 10 //4.6667,46.667,47
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true,'A tour must have a price']
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function(val){
                //this only points to the current doc on new doc creation
            return val<this.price;
        },
        message: 'Discount price {VALUE} should be less than the price'
    }
    },
    summary: {
        type: String,
        trim: true,
        required: [true,'A tour must have a description']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true,'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour:{
        type:Boolean,
        default:false
    },
    startLocation: {
        //geoJSON
        type: {
            type:String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: { 
            type: [Number],
            default: [0,0]
            },
        address: String,
        description: String
    },
    locations:[ {
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
    } ],
    guides: [{
        type:mongoose.Schema.ObjectId,
        ref: 'User'
    }]
},{
    toJSON: { virtuals:true },
    toObject: { virtuals: true }
});

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function(){
    return this.duration/7;
});

//Virtual populate
tourSchema.virtual('reviews',{
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

//DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save',function(next){
    this.slug=slugify(this.name,{lower : true});
    next();
});

// tourSchema.pre('save',async function(next){
//     const guidesPromises=this.guides.map(async id => await User.findById(id));
//     this.guides=await Promise.all(guidesPromises);
//     next();
// });

// tourSchema.post('save',function(doc,next){
//     console.log(doc);
//     next();
// });

//QUERY MIDDLEWARE
tourSchema.pre(/^find/,function(next){
    this.find({secretTour : { $ne : true}});
    this.start=Date.now();
    next();
});

tourSchema.pre(/^find/,function(next){
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
         });
    next();
});

tourSchema.post(/^find/,function(doc,next){
    console.log(`This query took ${Date.now()-this.start} milliseconds`);
    next();
});

//AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate',function(next){
//     this.pipeline().unshift({ $match: { secretTour: { $ne : true } } });
//     console.log(this.pipeline());
//     next();
// });

const Tour=mongoose.model('Tour',tourSchema);
module.exports=Tour;