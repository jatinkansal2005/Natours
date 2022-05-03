const dotenv=require('dotenv');
const mongoose=require('mongoose');

process.on('uncaughtException',err => {
    console.log(err.name,err.message);
    console.log('UNCAUGHT EXCEPTION! 💥 shutting down...');
    process.exit(1);
});

dotenv.config({path : './config.env'});
const DB=process.env.DATABASE;
mongoose.connect(DB,{
    useNewUrlParser:true,
    useCreateIndex:true,
    useFindAndModify:false,
    useUnifiedTopology: true
}).then(() => console.log('DB connection successful!'));
const app=require('./app');

const port=process.env.PORT || 3000;
const server=app.listen(port,() => {
    console.log(`Listening to port ${port}...`);
});

process.on('unhandledRejection',err => {
    console.log(err.name,err.message);
    console.log('UNHANDLED REJECTION! 💥 shutting down...');
    server.close(()=> {
        process.exit(1);
    });
});