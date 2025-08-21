import { ObjectNameIDArray } from './types.js';
import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config();

export type webhookArray = Array<{ name: string; id: string; token: string }>;

export interface RepoConfig {
	repo: string;
	channelId: string;
}

export interface ConfigInterface {
	client: { token: string; id: string; secret: string };
	guilds: ObjectNameIDArray;
	webhooks: webhookArray;
	repos: RepoConfig[];
}

export const config: ConfigInterface = {
	client: {
		token: process.env.CLIENT_TOKEN as string,
		id: process.env.CLIENT_ID as string,
		secret: process.env.CLIENT_SECRET as string,
	},
	guilds: [],
	webhooks: [],
	repos: [
		{
			repo: 'MilkshakeCollective/bot-template',
			channelId: process.env.RELEASE_CHANNEL_ID as string,
		},
		{
			repo: 'MilkshakeCollective/utilities-bot',
			channelId: process.env.RELEASE_CHANNEL_ID as string,
		},
	],
};
