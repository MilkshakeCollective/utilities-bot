import { TextChannel, EmbedBuilder } from 'discord.js';
import { MilkshakeClient } from '../../index.js';
import { logger } from '../exports.js';
import axios from 'axios';

let lastReleases: Record<string, string> = {};

export async function checkReleases(client: MilkshakeClient) {
  for (const { repo, channelId } of client.config.repos) {
    try {
      const res = await axios.get(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'MilkshakeCollective-Bot',
        },
      });

      const release = res.data;

      if (!release || !release.tag_name) continue;

      if (!lastReleases[repo] || lastReleases[repo] !== release.tag_name) {
        lastReleases[repo] = release.tag_name;

        const embed = new EmbedBuilder()
          .setTitle(`🆕 New Release: ${release.name}`)
          .setDescription(release.body?.slice(0, 4000) || 'No description provided.')
          .setURL(release.html_url)
          .setColor('Blue')
          .setFooter({ text: `Repository: ${repo}` })
          .setTimestamp();

        const channel = (await client.channels.fetch(channelId)) as TextChannel;
        if (!channel) continue;

        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error(`❌ Failed to check release for ${repo}:`, err);
    }
  }
}
