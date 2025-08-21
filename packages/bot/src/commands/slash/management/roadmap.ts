import { MilkshakeClient } from '../../../index.js';
import { CommandInterface } from '../../../types';
import {
	ChatInputCommandInteraction,
	PermissionFlagsBits,
	SlashCommandBuilder,
	EmbedBuilder,
	TextChannel,
} from 'discord.js';
import { customAlphabet, nanoid } from 'nanoid';

async function buildRoadmapEmbed(client: MilkshakeClient) {
	const items = await client.prisma.roadmapItem.findMany({
		orderBy: { id: 'asc' },
	});

	const embed = new EmbedBuilder()
		.setTitle('🥤 Project Roadmap')
		.setColor('#FFC6E0') // soft pink milkshake vibe
		.setDescription('Here’s a sweet look at where everything’s at 🍓')
		.setTimestamp();

	if (items.length === 0) {
		embed.setDescription('No roadmap items yet. Use `/roadmap add` to create one.');
		return embed;
	}

	// Group by status
	const groups: Record<string, typeof items> = {};
	for (const item of items) {
		const status = item.status ?? '⏳ Not started';
		if (!groups[status]) groups[status] = [];
		groups[status].push(item);
	}

	// Define pretty status labels (soft look)
	const statusLabels: Record<string, string> = {
		'⏳ Not started': '⏳ Not started',
		'🚧 In progress': '🚧 In progress',
		'✅ Completed': '✅ Completed',
	};

	// Add each group as a field
	for (const [status, groupItems] of Object.entries(groups)) {
		embed.addFields({
			name: statusLabels[status] ?? status,
			value: groupItems
				.map((item) => `• **#${item.id} — ${item.title}**${item.link ? ` → [link](${item.link})` : ''}`)
				.join('\n'),
			inline: false,
		});
	}

	return embed;
}

const command: CommandInterface = {
	cooldown: 3,
	isDeveloperOnly: false,
	data: new SlashCommandBuilder()
		.setName('roadmap')
		.setDescription('Manage the roadmap')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addSubcommand((sub) => sub.setName('post').setDescription('Post the roadmap embed in this channel'))
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add a roadmap item')
				.addStringOption((opt) => opt.setName('title').setDescription('Title of the item').setRequired(true))
				.addStringOption((opt) =>
					opt.setName('link').setDescription('Optional link (GitHub, Trello, etc.)').setRequired(false),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove a roadmap item')
				.addStringOption((opt) => opt.setName('id').setDescription('ID of the item').setRequired(true)),
		)
		.addSubcommand((sub) =>
			sub
				.setName('update')
				.setDescription('Update the status of a roadmap item')
				.addStringOption((opt) => opt.setName('id').setDescription('ID of the item').setRequired(true))
				.addStringOption((opt) =>
					opt
						.setName('status')
						.setDescription('New status')
						.setRequired(true)
						.addChoices(
							{ name: 'Not started', value: '🍼 Not started' },
							{ name: 'In progress', value: '🍦 In progress' },
							{ name: 'Done', value: '🍓 Done' },
						),
				),
		)
		.addSubcommand((sub) =>
			sub
				.setName('link')
				.setDescription('Update or add a link for a roadmap item')
				.addStringOption((opt) => opt.setName('id').setDescription('ID of the item').setRequired(true))
				.addStringOption((opt) =>
					opt.setName('link').setDescription('The link (GitHub, Trello, etc.)').setRequired(true),
				),
		),

	execute: async (interaction: ChatInputCommandInteraction, client: MilkshakeClient) => {
		await interaction.deferReply({ flags: ['Ephemeral'] });

		const sub = interaction.options.getSubcommand();
		const guildId = interaction.guildId!;
		const guildSettings = await client.prisma.guildSettings.upsert({
			where: { guildId },
			update: {},
			create: { guildId },
		});

		const updateEmbedIfExists = async () => {
			if (guildSettings.roadmapMessageId) {
				const channel = interaction.channel as TextChannel;
				const msg = await channel?.messages.fetch(guildSettings.roadmapMessageId).catch(() => null);
				if (msg) await msg.edit({ embeds: [await buildRoadmapEmbed(client)] });
			}
		};

		if (sub === 'post') {
			const embed = await buildRoadmapEmbed(client);
			const channel: TextChannel = interaction.channel as TextChannel;
			const msg = await channel.send({ embeds: [embed] });

			await client.prisma.guildSettings.update({
				where: { guildId },
				data: { roadmapMessageId: msg.id },
			});

			return interaction.editReply({ content: 'Roadmap has been posted ✅' });
		}

		if (sub === 'add') {
			const id = nanoid(3)
			const title = interaction.options.getString('title', true);
			const link = interaction.options.getString('link', false) ?? null;

			await client.prisma.roadmapItem.create({
				data: {id, title, link },
			});

			await updateEmbedIfExists();
			return interaction.editReply({ content: `Added item **${title}** to roadmap ✅` });
		}

		if (sub === 'remove') {
			const id = interaction.options.getString('id', true);
			await client.prisma.roadmapItem.delete({ where: { id } }).catch(() => null);

			await updateEmbedIfExists();
			return interaction.editReply({ content: `Removed item with ID **${id}** from roadmap ❌` });
		}

		if (sub === 'update') {
			const id = interaction.options.getString('id', true);
			const status = interaction.options.getString('status', true);

			const item = await client.prisma.roadmapItem
				.update({
					where: { id },
					data: { status },
				})
				.catch(() => null);

			if (!item) return interaction.editReply({ content: 'Could not find that roadmap item ❌' });

			await updateEmbedIfExists();
			return interaction.editReply({
				content: `Updated status for **${item.title}** to **${status}** ✅`,
			});
		}

		if (sub === 'link') {
			const id = interaction.options.getString('id', true);
			const link = interaction.options.getString('link', true);

			const item = await client.prisma.roadmapItem
				.update({
					where: { id },
					data: { link },
				})
				.catch(() => null);

			if (!item) return interaction.editReply({ content: 'Could not find that roadmap item ❌' });

			await updateEmbedIfExists();
			return interaction.editReply({
				content: `Updated link for **${item.title}** to ${link} 🔗`,
			});
		}
	},
};

export default command;
