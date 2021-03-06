//Modules
import _ from "lodash";
import mongoose from "mongoose";
const Settings = mongoose.model("settings");

//Canvas
import Canvas from "./Canvas";

//Helpers
import { processLeagueTableData } from "~/controllers/rugby/competitionController";

export default class MinMax extends Canvas {
	constructor(_segment, year, teamsToHighlight) {
		//This doesn't really matter as we'll be
		//resizing once we have teams
		const cWidth = 800;
		const cHeight = 800;

		//Load In Fonts
		const fonts = [
			{ file: "TitilliumWeb-SemiBold.ttf", family: "Titillium" },
			{ file: "TitilliumWeb-Bold.ttf", family: "Titillium Bold" },
			{ file: "Montserrat-Bold.ttf", family: "Montserrat" }
		];

		//Create Canvas
		super(cWidth, cHeight, { fonts });

		//Positions
		this.positions = {
			columnWidth: cWidth * 0.07,
			columnPadding: cWidth * 0.01,
			rowHeight: cHeight * 0.04,
			headerHeight: cHeight * 0.1,
			headerImageWidth: cWidth * 0.15
		};

		this.positions.labelWidth = this.positions.columnWidth * 3;

		//Variables
		this._segment = _segment;
		this.year = year;
		this.teamsToHighlight = teamsToHighlight;

		//Constants
		const textStyles = {
			points: {
				size: this.positions.rowHeight * 0.5,
				family: "Titillium"
			},
			header: {
				size: this.positions.headerHeight * 0.4,
				family: "Montserrat"
			},
			subheader: {
				size: this.positions.headerHeight * 0.2,
				family: "Titillium"
			}
		};
		this.setTextStyles(textStyles);
		this.colours.lightClaret = "#a53552";
		this.columns = ["position", "team", "Pld", "W", "D", "L", "F", "A", "Diff", "Pts"];
	}

	async getTeamImages() {
		const { tableData } = this;

		for (const row of tableData.rowData) {
			row.team.image = await this.googleToCanvas(`/images/teams/${row.team.images.main}`);
		}
	}

	calculateThresholds() {
		const { tableData, positions } = this;

		//First, loop through each team and work out their minimum + maximum points
		for (const row of tableData.rowData) {
			row.gamesToPlay = tableData.settings.totalRounds - row.Pld;
			row.maxPts = row.Pts + row.gamesToPlay * 2;
		}

		//Then we work out the maximum and minimum possible scores
		this.thresholds = {
			minPts: _.minBy(tableData.rowData, "Pts").Pts,
			maxPts: _.maxBy(tableData.rowData, "maxPts").maxPts
		};

		//Get the league boundaries
		this.leagueBoundaries = {};
		tableData.settings.leagueTableColours.forEach(c => {
			let value;
			if (c.className === "bottom") {
				value = Math.min(...c.position);
			} else {
				value = Math.max(...c.position);
			}

			this.leagueBoundaries[c.className] = value;
		});

		this.positions.topOfRows = positions.headerHeight + positions.rowHeight * 0.55;
		//Work out how many points to no longer be eligible for top
		const lowestRankedTopTeam = tableData.rowData[this.leagueBoundaries.top - 1];
		if (lowestRankedTopTeam) {
			this.thresholds.minimumPointsForTop = lowestRankedTopTeam.Pts;
			const rowsToSkip = this.thresholds.maxPts - this.thresholds.minimumPointsForTop;
			this.positions.minimumPointsForTopY = this.positions.topOfRows + (rowsToSkip + 1) * positions.rowHeight;
		}

		//Work out how many points to be guaranteed top
		const highestRankedNotTopTeam = tableData.rowData[this.leagueBoundaries.top];
		if (highestRankedNotTopTeam) {
			this.thresholds.pointsForGuaranteedTop = highestRankedNotTopTeam.maxPts + 1;
			const rowsToFill = this.thresholds.maxPts - this.thresholds.pointsForGuaranteedTop + 1;
			this.positions.pointsForGuaranteedTopH = this.positions.topOfRows + rowsToFill * positions.rowHeight - 2;
		}
	}

	drawBackground() {
		const { ctx, cWidth, cHeight, leagueBoundaries, positions, textStyles } = this;

		//Draw Main Background
		ctx.fillStyle = "#e4e4e4";
		ctx.fillRect(0, 0, cWidth, cHeight);
		ctx.lineWidth = 2;

		//Handle text variables
		ctx.font = textStyles.points.string;
		const textOptions = {
			maxWidth: positions.labelWidth,
			lineHeight: 2
		};
		const textX = cWidth - (positions.labelWidth + positions.columnPadding) / 2;

		//Minimum For Top
		if (positions.minimumPointsForTopY) {
			const y = positions.minimumPointsForTopY;
			//Background
			ctx.fillStyle = "#FFAAAA";
			ctx.fillRect(0, y, cWidth, cHeight - y);

			//Line
			ctx.strokeStyle = "#C00";
			this.drawLine(0, y, cWidth, y);

			//Text
			ctx.fillStyle = "#000000";
			this.textBuilder(
				[[{ text: `CAN NO LONGER` }], [{ text: `MAKE THE TOP ${leagueBoundaries.top}` }]],
				textX,
				y + positions.rowHeight,
				textOptions
			);
		}

		//Guaranteed Top
		if (positions.pointsForGuaranteedTopH) {
			//Background
			ctx.fillStyle = "#62ae67";
			ctx.fillRect(0, 0, cWidth, positions.pointsForGuaranteedTopH);

			//Line
			ctx.strokeStyle = "#090";
			this.drawLine(0, positions.pointsForGuaranteedTopH, cWidth, positions.pointsForGuaranteedTopH);

			//Text
			ctx.fillStyle = "#000000";

			this.textBuilder(
				[[{ text: "GUARANTEED" }], [{ text: `TOP ${leagueBoundaries.top} FINISH` }]],
				textX,
				positions.pointsForGuaranteedTopH - positions.rowHeight,
				textOptions
			);
		}
	}

	async drawHeader() {
		const { colours, ctx, cWidth, positions, tableData, textStyles } = this;
		const { customStyling, image, title } = tableData.settings;

		//Draw background
		ctx.fillStyle = customStyling ? customStyling.backgroundColor : colours.claret;
		ctx.fillRect(0, 0, cWidth, positions.headerHeight);

		//Draw Headers
		ctx.fillStyle = customStyling ? customStyling.color : "white";
		ctx.textAlign = "center";
		const maxWidth = cWidth - positions.headerImageWidth * 2;
		this.textBuilder(
			[
				[
					{
						text: title.toUpperCase(),
						font: textStyles.header.string,
						maxWidth
					}
				],
				[
					{
						text: `Minimum/Maximum Points By Team (as of ${new Date().toString("dS MMMM")})`,
						font: textStyles.subheader.string,
						maxWidth
					}
				]
			],
			cWidth / 2,
			positions.headerHeight / 2,
			{ lineHeight: 1.5 }
		);

		//Draw Competition Image
		const imagePadding = positions.headerImageWidth * 0.15;
		if (image) {
			const instanceImage = await this.googleToCanvas(`images/competitions/${image}`);
			this.contain(
				instanceImage,
				imagePadding,
				imagePadding,
				positions.headerImageWidth - imagePadding * 2,
				positions.headerHeight - imagePadding * 2,
				{ xAlign: "left" }
			);
		}

		//Draw Site Logo
		const siteLogo = await Settings.findOne({
			name: "site_logo"
		}).lean();
		const siteImage = await this.googleToCanvas(`images/layout/branding/${siteLogo.value}`);
		this.contain(
			siteImage,
			cWidth - positions.headerImageWidth + imagePadding,
			imagePadding,
			positions.headerImageWidth - imagePadding * 2,
			positions.headerHeight - imagePadding * 2,
			{ xAlign: "right" }
		);
	}

	drawPointsColumn() {
		const { ctx, positions, textStyles, thresholds } = this;

		ctx.fillStyle = "black";
		ctx.font = textStyles.points.string;

		let textY = positions.rowHeight * 1.25 + positions.headerHeight;
		for (let i = thresholds.maxPts; i >= thresholds.minPts; i--) {
			ctx.fillText(i, positions.columnWidth * 0.4, textY);
			textY += positions.rowHeight;
		}
	}

	drawTeamColumns() {
		const { ctx, positions, tableData, thresholds } = this;

		let x = positions.columnWidth + positions.columnPadding / 2;
		let baseY = positions.rowHeight * 0.5 + positions.headerHeight;

		ctx.fillStyle = "black";
		for (const column of tableData.rowData) {
			//Get upper y value
			const rowsFromTop = thresholds.maxPts - column.maxPts;
			const y = baseY + rowsFromTop * positions.rowHeight;

			//Get height
			const h = positions.rowHeight * (column.maxPts - column.Pts + 1);

			//Get Team
			const { team } = column;

			//Draw main bar
			ctx.fillStyle = team.colours.main;
			ctx.fillRect(x, y, positions.columnWidth, h);

			//Add Image
			let imageH = h;
			let imageY = y;
			if (column.Pts < column.maxPts) {
				imageH -= positions.rowHeight * 2;
				imageY += positions.rowHeight;
			}
			let maxHeightRelativeToColumn = 6;
			if (h > positions.columnWidth * maxHeightRelativeToColumn) {
				const initialImageH = imageH;
				imageH = positions.columnWidth * maxHeightRelativeToColumn;
				imageY += (initialImageH - imageH) / 2;
			}
			ctx.globalAlpha = 0.2;
			this.cover(team.image, x, imageY, positions.columnWidth, imageH);
			ctx.globalAlpha = 1;

			if (column.Pts < column.maxPts) {
				//Add min points
				ctx.fillStyle = team.colours.trim1;
				ctx.fillRect(x, y + h - positions.rowHeight, positions.columnWidth, positions.rowHeight);
				ctx.fillStyle = team.colours.main;
				ctx.fillText(column.Pts, x + positions.columnWidth / 2, y + h - positions.rowHeight * 0.25);

				//Add max points
				ctx.fillStyle = team.colours.trim1;
				ctx.fillRect(x, y, positions.columnWidth, positions.rowHeight);
				ctx.fillStyle = team.colours.main;
				ctx.fillText(column.maxPts, x + positions.columnWidth / 2, y + positions.rowHeight * 0.75);
			}

			//Add outline
			ctx.strokeStyle = team.colours.trim1;
			ctx.lineWidth = 3;
			ctx.strokeRect(x, y, positions.columnWidth, h);

			//Increase x var
			x += positions.columnWidth + positions.columnPadding;
		}
	}

	async render(forTwitter = false) {
		const { positions, _segment, year } = this;

		//Get Table
		this.tableData = await processLeagueTableData(_segment, year, {}, true);

		//Get Teams
		await this.getTeamImages();

		//Work out thresholds
		this.calculateThresholds();

		//Set Canvas Width
		this.canvas.width = this.cWidth =
			(positions.columnWidth + positions.columnPadding) * (this.tableData.rowData.length + 1) +
			positions.labelWidth;
		//Set Canvas Height
		this.canvas.height = this.cHeight =
			positions.rowHeight * (this.thresholds.maxPts - this.thresholds.minPts + 2) + positions.headerHeight;

		this.drawBackground();
		await this.drawHeader();
		this.drawPointsColumn();
		this.drawTeamColumns();

		return this.outputFile(forTwitter ? "twitter" : "base64");
	}
}
