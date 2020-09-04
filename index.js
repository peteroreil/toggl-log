require('axios-debug-log');
const path = require('path');
process.env.NODE_CONFIG_DIR = path.resolve(__dirname, 'config');
const axios = require('axios');
const moment = require('moment');
const querystring = require('querystring');
const config = require('config');
const winston = require('winston');

const logFile = path.resolve(__dirname, 'toggl.log');
const logger = winston.createLogger({
	transports: [
		new winston.transports.File({ filename: logFile })
	]
});

const getUrlEncodedStartDate = () => {
	const today = moment()
	.local()
	.set('hours', 0)
	.set('minutes', 0)
	.set('seconds', 0)
	.format();
	return querystring
		.encode({ start_date: today });
}


const getTodaysTimes = async () => {
	const queryParams = getUrlEncodedStartDate();
	const { data } = await axios.get(`${config.toggl.getTimes}?${queryParams}`, {
		auth: {
			username: config.toggl.username,
			password: config.toggl.password
		}
	});
	return data;	
}


const createATime = async() => {
	const url = config.toggl.postTimes;
	const reqBody = {
		start: moment().startOf('day').set('hour', 9).toISOString(),
		stop: moment().startOf('day').set('hour', 17).toISOString(),
		pid: parseInt(config.toggl.projectId, 10),
		wid: parseInt(config.toggl.workspaceId, 10),
		duration: config.toggl.defaultDuration,
		description: 'Generic',
		created_with: 'axios'
	}

	return axios.post(url, reqBody, {
		headers: { 'Content-Type': 'application/json' },
		auth: {
			username: config.toggl.username,
			password: config.toggl.password
		}
	});
};

const logTodaysTimes = async () => {
	logger.info('logging times with toggl....');
	const todaysTimes = await getTodaysTimes();
	if(todaysTimes && todaysTimes.length) {
		logger.info('Time have already been logged today....yay');
		return;
	}
	logger.info('logging todays times....');
	const { status, data } = await createATime();
	logger.info(`status: ${status}, response ${JSON.stringify(data)}`);
};

const toggl = async() => {
	const today = moment().day();
	// If Saturday or Sunday
	if(today === 0 || today === 6) {
		logger.info('its the weekend - not logging on toggl today!!....');
		return 
	}
	await logTodaysTimes();
}

toggl();