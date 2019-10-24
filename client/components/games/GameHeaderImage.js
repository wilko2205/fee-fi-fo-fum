import React, { Component } from "react";
import { connect } from "react-redux";
import { gameImagePath, groundImagePath } from "../../extPaths";

class GameHeaderImage extends Component {
	render() {
		const { game, className, useWebp } = this.props;
		let image;
		let alt;

		if (game.images.header) {
			image = gameImagePath + "header/" + game.images.header;
			alt = `Huddersfield Giants vs ${game._opposition.name.long} - ${game.date.toString(
				"dd/MM/yyyy"
			)}`;
		} else if (game._ground.image) {
			image = groundImagePath + game._ground.image;
			alt = game._ground.name;
		} else {
			image = groundImagePath + "pitch.jpg";
			alt = "Rugby Pitch";
		}

		const webp = image.substr(0, image.lastIndexOf(".")) + ".webp";

		return (
			<img
				src={useWebp ? webp : image}
				className={`game-header-image ${className || ""}`}
				alt={alt}
			/>
		);
	}
}

function mapStateToProps({ config }) {
	return {
		useWebp: config.webp
	};
}

export default connect(mapStateToProps)(GameHeaderImage);
