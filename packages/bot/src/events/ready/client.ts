import { MilkshakeClient } from '../../index.js';
import { EventInterface } from '../../types.js';
import { checkReleases, logger } from '../../components/exports.js';
import { Events } from 'discord.js';

const event: EventInterface = {
	name: Events.ClientReady,
	options: { once: true, rest: false },
	execute: async (client: MilkshakeClient) => {
		let logOutput = '\n';

		// 🔔 Release notifier
		if (process.env.RELEASES_ENABLED === 'true') {
			logOutput += `Release notifier enabled, checking every 3 minutes.\n`;
			setInterval(() => checkReleases(client), 3 * 60 * 1000);
			await checkReleases(client);
		} else {
			logOutput += `Release notifier is disabled in .env.\n`;
		}

		// Append Client Ready at the end
		logOutput += `Client Ready as ${client.user?.tag}.\n`;

		// Final consolidated log
		logger.info(logOutput);
	},
};

export default event;
