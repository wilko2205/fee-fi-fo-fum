//Modules
import _ from "lodash";
import mongoose from "mongoose";
const Team = mongoose.model("teams");

//Canvas
import Canvas from "./Canvas";

//Helpers
import { processLeagueTableData } from "~/controllers/rugby/competitionController";

export default class LeagueTable extends Canvas {
	constructor(_segment, year, teamsToHighlight, options = {}) {
		//Set Dimensions
		const cWidth = 1000;

		//This doesn't really matter as we'll be
		//resizing once we have teams
		const cHeight = cWidth;

		//Load In Fonts
		const fonts = [
			{ file: "TitilliumWeb-Regular.ttf", family: "Titillium" },
			{ file: "TitilliumWeb-SemiBold.ttf", family: "Titillium Semi" },
			{ file: "TitilliumWeb-Bold.ttf", family: "Titillium Bold" }
		];

		//Create Canvas
		super(cWidth, cHeight, { fonts });

		//Positions
		this.positions = {
			imagePadding: cWidth * 0.015,
			rowHeight: cWidth * 0.08,
			standardColumnWidth: cWidth * 0.07
		};

		//Variables
		this._segment = _segment;
		this.year = year;
		this.teamsToHighlight = teamsToHighlight;
		this.options = options;

		//Constants
		const textSize = this.positions.rowHeight * 0.35;
		const textStyles = {
			regular: {
				size: textSize,
				family: "Titillium"
			},
			semi: {
				size: textSize,
				family: "Titillium Semi"
			},
			bold: {
				size: textSize,
				family: "Titillium Bold"
			}
		};
		this.setTextStyles(textStyles);
		this.colours.lightClaret = "#a53552";
		this.columns = ["position", "_team", "Pld", "W", "D", "L", "F", "A", "Diff", "Pts"];
	}

	async getTeams() {
		const { tableData } = this;

		//Get Teams
		const teams = await Team.find(
			{ _id: { $in: tableData.rowData.map(r => r._team) } },
			"images name"
		).lean();

		//Create Image Object
		this.teams = {};

		//Add Images
		for (const team of teams) {
			this.teams[team._id] = { name: team.name.short };
			this.teams[team._id].image = await this.googleToCanvas(
				`images/teams/${team.images.dark || team.images.main}`
			);
		}
	}

	async drawHeader() {
		const { columns, ctx, cWidth, positions, tableData, textStyles } = this;
		const { customStyling, image } = tableData.settings;

		//Draw Background
		ctx.fillStyle = customStyling.backgroundColor || "#111";
		ctx.fillRect(0, 0, cWidth, positions.rowHeight * 1.5);

		//Add Logo
		if (image) {
			const logo = await this.googleToCanvas(`/images/competitions/${image}`);
			this.contain(
				logo,
				positions.imagePadding,
				positions.imagePadding,
				cWidth * 0.5,
				positions.rowHeight * 1.5 - positions.imagePadding * 2,
				{
					xAlign: "left"
				}
			);
		}

		//Add Column Headers
		//Do it in reverse, so we can simply break out once we reach _team
		ctx.textAlign = "center";
		ctx.fillStyle = customStyling.color;
		ctx.font = textStyles.bold.string;
		let textX = cWidth - positions.standardColumnWidth * 0.65;
		const textY = positions.rowHeight;
		const reversedColumns = [...columns].reverse();
		for (const column of reversedColumns) {
			//Stop once we get to team
			if (column === "_team") {
				break;
			}

			//Right padding for Win %
			if (column === "Win %") {
				textX -= positions.standardColumnWidth / 4;
			}

			//Draw Text
			ctx.fillText(column, textX, textY);

			//Update textX
			textX -= positions.standardColumnWidth;

			//Left padding for Win %
			if (column === "Win %") {
				textX -= positions.standardColumnWidth / 4;
			}
		}
	}

	drawRows() {
		const { columns, ctx, cWidth, positions, tableData, teams, textStyles } = this;

		//Convert row classes to simple object
		const rowClasses = _.chain(tableData.settings.leagueTableColours)
			.map(({ position, className }) => position.map(p => ({ position: p, className })))
			.flatten()
			.keyBy("position")
			.mapValues("className")
			.value();

		for (const row of tableData.rowData) {
			let background, colour;
			switch (rowClasses[row.position]) {
				case "champions":
					background = "#518c56";
					colour = "#FFF";
					break;
				case "top":
					background = "#77b66b";
					colour = "#FFF";
					break;
				case "bottom":
					background = "#b63c3d";
					colour = "#FFF";
					break;
				default:
					background = "#F4F4F4";
					colour = "#000";
					break;
			}

			//Draw Background
			ctx.fillStyle = background;
			const rowBackgroundParams = [
				0,
				positions.rowHeight * (row.position + 0.5),
				cWidth,
				positions.rowHeight
			];
			ctx.fillRect(...rowBackgroundParams);

			//Add semitransparent overlay to even rows
			if (row.position % 2 === 0) {
				ctx.fillStyle = "#2222220B";
				ctx.fillRect(...rowBackgroundParams);
			}

			//Add Columns
			let textX = 0;
			const textY = positions.rowHeight * (row.position + 1.15);
			ctx.fillStyle = colour;
			columns.forEach(column => {
				if (column === "_team") {
					//Set Alignment
					ctx.textAlign = "left";

					//Set Font
					ctx.font = textStyles.semi.string;

					//Get Team
					const team = teams[row["_team"]];

					//Add Badge
					const imageSize = positions.rowHeight - positions.imagePadding * 2;
					this.contain(
						team.image,
						textX + positions.imagePadding,
						positions.rowHeight * (row.position + 0.5) + positions.imagePadding,
						imageSize
					);

					//Add Text
					ctx.fillText(
						team.name,
						textX + imageSize + positions.standardColumnWidth * 0.5,
						textY
					);

					//Update textX
					let otherColumns = columns.length - 1;

					//Add extra space for Win %
					if (columns.includes("Win %")) {
						otherColumns += 0.5;
					}

					textX +=
						cWidth -
						otherColumns * positions.standardColumnWidth -
						positions.standardColumnWidth * 0.15;
				} else {
					//Set Alignment
					ctx.textAlign = "center";

					//Set Font
					const useBold = ["position", "Pts"].indexOf(column) > -1;
					ctx.font = textStyles[useBold ? "bold" : "regular"].string;

					//Get Value
					let value;
					if (column === "Win %") {
						value = Number(row.WinPc.toFixed(2)) + "%";
						textX += positions.standardColumnWidth / 4;
					} else {
						value = row[column];
					}

					//Add Text
					ctx.fillText(value, textX + positions.standardColumnWidth * 0.5, textY);

					//Update textX
					textX += positions.standardColumnWidth;
				}
			});
		}
	}

	async render(forTwitter = false) {
		const { positions, _segment, options, year } = this;

		//Get Table
		this.tableData = await processLeagueTableData(_segment, year, options);

		//Get Teams
		await this.getTeams();

		//Resize
		let w = this.cWidth;
		if (this.tableData.settings.usesWinPc) {
			w += positions.standardColumnWidth * 1.5;
			this.columns.push("Win %");
		}
		this.resizeCanvas(w, positions.rowHeight * (this.tableData.rowData.length + 1.5));

		//Draw Header
		await this.drawHeader();

		//Draw Row Backgrounds
		this.drawRows();

		return this.outputFile(forTwitter ? "twitter" : "base64");
	}
}
