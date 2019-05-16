import _ from "lodash";
import { createCanvas, loadImage, registerFont } from "canvas";
const googleBucket = require("~/constants/googleBucket");

export default class Canvas {
	constructor(w, h, options) {
		if (options.fonts) {
			this.registerFonts(options.fonts);
		}

		//Constants
		this.colours = {
			claret: "#751432",
			gold: "#FFCC00"
		};

		this.canvas = createCanvas(w, h);
		this.ctx = this.canvas.getContext("2d");
		this.cWidth = w;
		this.cHeight = h;
	}
	registerFonts(fontList) {
		fontList.map(font => {
			const { file, family, ...data } = font;
			if (!file || !family) {
				console.error("Invalid Font Data", font);
			} else {
				registerFont(`./assets/fonts/${file}`, { family, ...data });
			}
		});
	}

	setTextStyles(styles) {
		this.textStyles = _.mapValues(styles, style => {
			style.size = Math.round(style.size);
			style.string = `${style.size}px ${style.family}`;
			return style;
		});
	}

	async googleToCanvas(file) {
		const [buffer] = await googleBucket.file(file).download();
		const image = await loadImage(buffer);
		return image;
	}

	fit(contains) {
		return (
			parentWidth,
			parentHeight,
			childWidth,
			childHeight,
			scale = 1,
			offsetX = 0.5,
			offsetY = 0.5
		) => {
			const childRatio = childWidth / childHeight;
			const parentRatio = parentWidth / parentHeight;
			let width = parentWidth * scale;
			let height = parentHeight * scale;

			if (contains ? childRatio > parentRatio : childRatio < parentRatio) {
				height = width / childRatio;
			} else {
				width = height * childRatio;
			}

			return {
				width,
				height,
				offsetX: (parentWidth - width) * offsetX,
				offsetY: (parentHeight - height) * offsetY
			};
		};
	}

	contain() {
		return this.fit(true)(...arguments);
	}

	cover() {
		return this.fit(false)(...arguments);
	}

	textBuilder(rows, x, y, options = {}) {
		let { xAlign, yAlign, lineHeight } = options;

		//Set xAlign
		if (xAlign !== "left" && xAlign !== "right") {
			xAlign = "center";
		}

		//Set yAlign
		if (yAlign !== "top" && yAlign !== "bottom") {
			yAlign = "center";
		}

		console.log(xAlign);

		//Set lineHeight
		if (!lineHeight || isNaN(lineHeight)) {
			lineHeight = 1.2;
		}

		//Set total width and height
		let totalWidth = 0;
		let totalHeight = 0;
		const processedRows = rows.map((row, i) => {
			let rowWidth = 0;
			let rowHeight = 0;
			row.map(({ text, font }) => {
				if (font) {
					this.ctx.fontStyle = font;
				}
				const dimensions = this.ctx.measureText(text);
				rowWidth += dimensions.width;
				rowHeight = Math.max(rowHeight, dimensions.actualBoundingBoxAscent);
			});

			//Update Totals
			totalWidth = Math.max(totalWidth, rowWidth);
			if (i > 0) {
				totalHeight += Math.round(rowHeight * lineHeight);
			} else {
				totalHeight += rowHeight;
			}

			return { row, rowWidth, rowHeight };
		});

		//Create Temporary Canvas
		const canvas = createCanvas(totalWidth, totalHeight);
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = this.ctx.fillStyle;
		ctx.font = this.ctx.font;

		let rowY = 0;

		//Draw Text
		ctx.textAlign = "left";
		processedRows.map(({ row, rowWidth, rowHeight }, i) => {
			//Set X Value
			let rowX;
			switch (xAlign) {
				case "left":
					rowX = 0;
					break;
				case "center":
					rowX = (totalWidth - rowWidth) / 2;
					break;
				case "right":
					rowX = totalWidth - rowWidth;
					break;
			}

			//Set Y Value
			if (i > 0) {
				rowY += Math.round(rowHeight * lineHeight);
			} else {
				rowY += rowHeight;
			}

			//Print Text
			row.map(({ text, font, colour }) => {
				if (font) {
					ctx.font = font;
				}
				if (colour) {
					ctx.fillStyle = colour;
				}
				const { width } = ctx.measureText(text);
				ctx.fillText(text, rowX, rowY);

				//Update x
				rowX += width;
			});
		});

		//Calculate destination x
		switch (xAlign) {
			//case "left": use initial x value
			case "center":
				x = x - totalWidth / 2;
				break;
			case "right":
				x = x - totalWidth;
				break;
		}

		//Calculate destination y
		switch (yAlign) {
			//case "top": use initial y value
			case "center":
				y = y - totalHeight / 2;
				break;
			case "bottom":
				y = y - totalHeight;
				break;
		}

		//Add to main canvas
		this.ctx.drawImage(canvas, x, y);

		//Return Key Positioning Values
		return { totalHeight, totalWidth, x, y };
	}

	outputFile(type = "base64") {
		const { canvas } = this;
		switch (type) {
			case "base64":
				return canvas.toDataURL();
			case "twitter":
				return canvas.toDataURL().split("base64,")[1];
			default:
				console.error(`Invalid render type: '${type}'`);
				return null;
		}
	}
}
