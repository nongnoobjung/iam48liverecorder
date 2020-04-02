const request = require('request');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const moment = require('moment');
const youtup = require('youtup');
ffmpeg.setFfmpegPath(ffmpegPath);
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss.l' });

var schedule = require('node-schedule');
var cmd;
console.log('---------------------------------');
console.log('IAM48 Auto Recorder Version:');
console.log('Author Kitcharuk Vorachonnapakad');
console.log('---------------------------------');
console.log('');

var isLive = [],caption;
async function main() {

    j = schedule.scheduleJob('*/5 * * * * *', function(){

        request.get('https://public.bnk48.io/schedules/member-live',function(err,res,body){
            let json = JSON.parse(body)

            // console.log(json)
            json.forEach(function (data,i) {
                // console.log(data.isLive)
                if(data.isLive && !isLive[data.id]){
                    console.log('Found Live',data.name)
                    let liveData = {
                        id:data.id,
                        desc:data.description,
                        name:data.name,
                        hashtags:data.hashtags
                    }
                    isLive[data.id] = true;
                    login(liveData);
                }
            })
        })
    });
}



function login(liveData){
    let options = {
        url: 'https://user.bnk48.io/auth/email',
        headers: {
            "User-Agent": "BNK48_102/1.2.48/Dalvik/2.1.0 (Linux; U; Android 5.1.1; google Pixel 2 Build/LMY47I)",
            "Environment": "PROD",
            "BNK48-App-Id": "BNK48_102",
            "BNK48-Device-Id": "dcfb482862203492",
            "Accept-Language": "th-TH",
            "BNK48-Device-Model": "GOOGLE google Pixel 2",
            "Content-Type": ["application/json; charset=UTF-8", "text/plain"],
        },
        json: {
            "email": process.env.email, // email ที่ใช้ login app
            "password": process.env.password // password ที่ใช้ login app
        }
    };

    request.post(options, function (err, resp, body) {
        let token = body.token;
        getLive(liveData,token);
    });
}

function getLive(data,token){
    let options = {
        url: 'https://live-api.bnk48.io/user/14947/watch/member-live/' + data.id,
        headers: {
            'Authorization': 'Bearer '+token,
            "User-Agent": "BNK48_102/1.2.48/Dalvik/2.1.0 (Linux; U; Android 5.1.1; google Pixel 2 Build/LMY47I)",
            "Environment": "PROD",
            "BNK48-App-Id": "BNK48_102",
            "BNK48-Device-Id": "dcfb482862203492",
            "Accept-Language": "th-TH",
            "BNK48-Device-Model": "GOOGLE google Pixel 2"
        }
    };

    request.get(options, function (err, resp, body) {
        let json = JSON.parse(body);
        record(data,json.hlsUrl)
    })
}


function record(data,hls){

    let name = data.name+` ${data.hashtags[1]} Live `+moment().format('DD-MM-YYYY@HH-mm-ss') + '.mp4'

    let memName = data.name;
    let liveDate = moment().format('DD/MM/YYYY');

    if (typeof hls !== 'string'){
        isLive[data.id] = false;
        return;
    }

    cmd = ffmpeg(hls).outputOptions(
        '-bsf:a', 'aac_adtstoasc',
        '-c', 'copy',
    ).on('end', function () {
        console.log('files have been download successfully');

        // ส่วนนี้สำหรับ autoupload เข้า youtube
        let settings = {
            auth: {
                email: process.env.gmail,
                clientId: process.env.clientId,
                clientSecret: process.env.clientSecret,
                refreshToken: process.env.refreshToken
            },
            video: {
                filepath:__dirname+name,
                title: memName+` ${data.hashtags[1]} LIVE `+moment().format('DD/MM/YYYY'),
                description: memName+` ${data.hashtags[1]} LIVE `+moment().format('DD/MM/YYYY')+' จาก official app IAM48\nอย่าลืมกด sub ติดตาม  จะพยายามอัพให้ทุกวันที่ เมม live\nโหลด แอพ IAM48 ได้ที่ \nhttps://play.google.com/store/apps/details?id=app.bnk48official',
                tags: ['bnk48','bnk','bnk48 live','bnk live','bnk48 official live',liveDate,memName,memName+' BNK',memName+' BNK48',memName+' bnk',
                    memName+' bnk48',memName+' bnk48 live',memName+' bnk live',memName+' bnk48 live '+liveDate,
                    memName+' live '+liveDate,memName+' '+liveDate,'cgm48','cgm','cgm48 live','cgm live','cgm48 official live',liveDate,memName,memName+' cgm',memName+' cgm48',memName+' cgm',
                    memName+' cgm48',memName+' cgm48 live',memName+' cgm live',memName+' cgm48 live '+liveDate,
                    memName+' live '+liveDate,memName+' '+liveDate],
                privacyStatus: 'public',
                categoryId:22
            }
        }
        youtup.upload(settings,onSuccess,onFail,onProgress);

        setTimeout(function () {
            isLive[data.id] = false
        },30000)

    }).on('start', function () {
        console.log('Starting Download..');
    }).on('progress', function (progress) {
        console.log(`Recording: ${data.name} `+progress.timemark)
    }).on('error', function (err) {
        console.log('an error happened: ' + err.message);
        isLive[data.id] = false
    }).save(name)
}

main()

onSuccess = function(success){
    console.log('success',success)
};

onProgress = function(progress){
    console.log('progress',progress)
};

onFail = function(fail){
    console.log('fail',fail)
};

process.stdin.resume();

function exitHandler(options, err) {
    if (options.cleanup) {
        console.log('exit');
        cmd.kill('SIGKILL');
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}


process.on('exit', exitHandler.bind(null, { cleanup: true }));


process.on('SIGINT', exitHandler.bind(null, { exit: true }));


process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
