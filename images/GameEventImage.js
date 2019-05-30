import Canvas from "./Canvas";
import mongoose from "mongoose";
import _ from "lodash";
import { localTeam } from "~/config/keys";
const Person = mongoose.model("people");
const Team = mongoose.model("teams");

export default class GameEventImage extends Canvas {
	constructor(game, event) {
		//Set Dimensions
		const cWidth = 1400;
		const cHeight = cWidth / 2;

		//Load In Fonts
		const fonts = [
			{ file: "Montserrat-Bold.ttf", family: "Montserrat" },
			{ file: "Monstro.ttf", family: "Monstro" }
		];

		//Create Canvas
		super(cWidth, cHeight, { fonts });

		//Constants
		const textStyles = {
			event: {
				size: Math.round(cHeight * 0.2),
				family: "Monstro"
			},
			score: {
				size: Math.round(cHeight * 0.15),
				family: "Montserrat"
			}
		};
		this.setTextStyles(textStyles);
		this.colours.lightClaret = "#a53552";

		this.positions = {};

		//Variables
		this.game = game;
		this.event = event;
	}

	async drawBackground() {
		const { ctx, cWidth, cHeight } = this;
		const backgroundImage = await this.googleToCanvas(
			"images/layout/canvas/blank-claret-banner.jpg"
		);
		ctx.drawImage(backgroundImage, 0, 0, cWidth, cHeight);
	}

	async getTeamInfo() {
		const { game } = this;
		const teams = await Team.find(
			{ _id: { $in: [localTeam, this.game._opposition._id] } },
			"image colours"
		);
		for (const team of teams) {
			team.badge = await this.googleToCanvas(`images/teams/${team.image}`);
		}
		const awayTeam = game.isAway ? localTeam : game._opposition._id;
		this.teams = _.sortBy(teams, t => t._id == awayTeam);
	}

	async drawTeamBanners() {
		const { ctx, game, teams, cHeight, cWidth, textStyles } = this;
		const bannerHeight = Math.round(cHeight * 0.25);
		const bannerTop = Math.round((cHeight - bannerHeight) / 2);
		const scoreOffset = Math.round(cHeight * 0.05);
		const badgeOffset = Math.round(cWidth * 0.15);
		const badgeWidth = Math.round(cWidth * 0.3);
		const badgeHeight = Math.round(cHeight * 0.35);

		//Draw Shadow Banner
		ctx.shadowColor = "black";
		ctx.shadowBlur = cHeight * 0.03;
		ctx.fillRect(0, bannerTop, cWidth, bannerHeight);
		this.resetShadow();

		teams.map((team, i) => {
			//Draw Banner
			ctx.fillStyle = team.colours.main;
			ctx.fillRect(i === 0 ? 0 : cWidth * 0.5, bannerTop, cWidth * 0.5, bannerHeight);

			//Add Score
			ctx.textAlign = i === 0 ? "right" : "left";
			ctx.fillStyle = team.colours.text;
			ctx.font = textStyles.score.string;
			ctx.fillText(
				game.score[team._id],
				cWidth * 0.5 + (i === 0 ? 0 - scoreOffset : scoreOffset),
				cHeight * 0.5 + textStyles.score.size * 0.35
			);

			//Add Badges
			this.contain(
				team.badge,
				cWidth * 0.5 + (i === 0 ? 0 - badgeOffset - badgeWidth : badgeOffset),
				bannerTop + bannerHeight / 2 - badgeHeight / 2,
				badgeWidth,
				badgeHeight
			);
		});
	}

	async drawGameInfo() {
		const { ctx, game, cWidth, cHeight, event, textStyles, colours } = this;

		//Add Event
		let text;
		switch (event) {
			case "kickOff":
				text = ["KICK", " OFF"];
				break;
			case "halfTime":
				text = ["HALF", " TIME"];
				break;
			case "fullTime":
				text = ["FULL", " TIME"];
				break;
		}
		ctx.font = textStyles.event.string;
		ctx.shadowOffsetX = ctx.shadowOffsetY = Math.round(cHeight * 0.005);
		ctx.shadowColor = "black";
		this.textBuilder(
			[[{ text: text[0], colour: colours.gold }, { text: text[1], colour: "#FFF" }]],
			cWidth / 2,
			cHeight / 5
		);
		this.resetShadow();

		//Add Game Logo
		const logoWidth = Math.round(cWidth / 4);
		const gameLogoUrl =
			game.images.logo || `images/layout/branding/square-logo-with-shadow.png`;
		const gameLogo = await this.googleToCanvas(gameLogoUrl);
		this.contain(
			gameLogo,
			(cWidth - logoWidth) / 2,
			Math.round(cHeight * 0.67),
			logoWidth,
			Math.round(cHeight * 0.24)
		);
	}

	async render(forTwitter = false) {
		await this.getTeamInfo();
		await this.drawBackground();
		await this.drawTeamBanners();
		await this.drawGameInfo();

		return this.outputFile(forTwitter ? "twitter" : "base64");
	}
}