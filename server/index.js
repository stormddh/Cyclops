const express = require('express');
const app = express();
app.use(express.json());

let admin = require('firebase-admin');

var serviceAccount = require('/home/cs459-ins-7/Cyclops/server/firebase_key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

let devices = {
    'qwerasdf': {
        memberId:'qwer',
        bike: {
            locations: [{lat:36.3649, long:127.3519}],
            phothPath: 'path',
            state: 0, // 0:NOT | 1: RIDE
        }
    },
    'asdfqwer': {},
    'qawsedrf': {},
    'aqswdefr': {},
    'qwaserdf': {},
    'asqwdfer': {},
    'rewqfdsa': {},
    'fdsarewq': {},
};

let members = {
    'qwer': {
        address: 'Live here',
        passwd: 'qwer',
        name: 'qwer',
        key: ['qwerasdf'],
        token: "",
    }
};

app.get('/', (req, res) => {
	res.send('Hello cyclops!');
});

app.get('/bike/location', (req, res) => {
    let params= req.query;
    if (!params["key"]) {
        res.status(400).send('invalid parameters');
        return;
    }

    let result = {};
    let device = findDevice(params["key"]);
    if (!hasBike(device)) {
        res.status(400).send('Cannot find entity');
        return;
    }

    result["location"] = device.bike.locations;//.slice(-1)[0];
    res.status(200).json(result);
    return;
});

app.post('/bike/location', (req, res) => {
    console.log('location', req.body)
    let params = req.body;
    if (!params["key"] || !params["location"]) {
        res.status(400).send('invalid format');
        return;
    }

    let result = {};
    let device = findDevice(params["key"]);
    if (!hasBike(device)) {
        res.status(400).send('Cannot find entity');
        return;
    }

    let lastLocation = device.bike.locations.slice(-1)[0];
    device.bike.locations.push(params["location"]);
    if (!lastLocation) {
        result.alram = 0;
    }
    else if ( ((lastLocation.lat - params["location"].lat) != 0 ||
               (lastLocation.long- params["location"].long)!= 0) &&
                device.bike.state == 0) {
        let token = members[device["memberId"]].token;
        if (token) {
            console.log(token);
        let message = {
            notification: {
                title: 'WANRING!',
                body: 'Your device is being stolen!'},
            token: token,
        };

        admin.messaging().send(message)
            .then((response) => {
                    console.log('Successfully sent message:', response);
                    })
        .catch((error) => {
                console.log('Error sending message:', error);
                console.log('Value', members[device['memberId']]);
                });
        }
        result.alarm = 1;
    }
    else {
        result.alarm = 0;
    }
    result.state = device.bike.state;
    console.log(result);

    res.status(200).json(result);
});

app.get('/bike/photo', (req, res) => {

        });

app.put('/bike/state', (req, res) => {
        console.log("state", req.body);
        let params = req.body;
        if (!params["key"] || params["state"] == null) {
        res.status(400).send('invalid format');
        return;
        }

        let device = findDevice(params["key"]);
        if (!hasBike) {
        res.status(400).send('Cannot find entity');
        return;
        }

        device.bike.state = params["state"];
        console.log(device.bike);
        res.status(200).end();
        });

app.get('/login', (req, res) => {
        let params = req.query;
        if (!params["member-id"] || !params["password"]) {
        res.status(400).send('invalid parameter');
        return;
        }

        let member = checkLogin(params["member-id"], params["password"]);
        if (!member) {
        res.status(400).send('Cannot find entity');
        return;
        }

        res.status(200).json(member);
        });

app.post('/member/register', (req, res) => {
        let params = req.body;
        if (!params["member-id"] || !params["password"] || !params["address"] || !params["name"]) {
        res.status(400).send('invalid format');
        return;
        }

        if (params["member-id"] in members) {
        res.status(400).send('invalid format');
        return;
        }


        let member = {};
        member.address = params["address"];
        member.passwd = params["password"];
        member.key = [];
        member.name = params["name"];
        members[params["member-id"]] = member;

        res.status(200).end();
});

app.post('/bike/register', (req, res) => {
        let params = req.body;
        if (!params["member-id"] || !params["key"]) {
        res.status(400).send('invalid format');
        return;
        }

        if (!(params["member-id"] in members) ||
                !(params["key"] in devices)) {
        res.status(400).send('Cannot find entity');
        return;
        }

        let device = findDevice(params["key"]);
        let member = findMember(params["member-id"]);
        if (hasBike(device)) {
        res.status(400).send('invalid request');
        return;
        }

        device.memberId = params["member-id"];
        device.bike = {
locations: [],
           photoPath: '',
           state: 0
        }

        member.key.push(params["key"]);

        res.status(200).end();
});

app.post('/auth/sendToken', (req, res) => {
        console.log("sendToken", req.body);
        let params = req.body;
        if (!params["token"] || !params["member-id"]) {
        res.status(400).send('invalid format');
        return;
        }

        if (!(params["member-id"] in members)) {
        res.status(400).send('Cannot find entity');
        return;
        }

        let member = findMember(params["member-id"]);
        member["token"] = params["token"];

        res.status(200).end();
        });

app.listen(80, () => {
        console.log('App running on port 80');
        });

function findDevice(key) {
    return devices[key];
}

function hasBike(device) {
    return !(!device || !device.bike);
}

function findMember(memberId) {
    return members[memberId];
}

function checkLogin(memberId, passwd) {
    let member = findMember(memberId);
    if (!member || member.passwd !== passwd) return null;

    return member;
}
