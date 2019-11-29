//Modules
import _ from "lodash";
import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import Select from "react-select";

//Constants
import selectStyling from "~/constants/selectStyling";

class AdminGamePageNavigation extends Component {
	constructor(props) {
		super(props);

		this.state = {};
	}

	static getDerivedStateFromProps(nextProps) {
		return _.pick(nextProps, ["game"]);
	}

	getOptions() {
		const { status, pregameSquads, playerStats, _competition } = this.state.game;

		//Standard Options, always present on existing games
		const submenuItems = [
			{ label: "Overview", value: "", group: 0 },
			{ label: "Photos", value: "photos", group: 0 }
		];

		//Pregame Squads + Canvas Image
		if (_competition.instance.usesPregameSquads) {
			submenuItems.push({ label: "Pregame Squad", value: "pregame", group: 0 });
			if (pregameSquads.length) {
				submenuItems.push({
					label: "Pregame Squad Image",
					value: "pregame-image",
					group: 0
				});
			}
		}

		//Add Squads once we hit status 1
		if (status >= 1) {
			submenuItems.push({ label: "Squads", value: "squads", group: 1 });
			//Add Squad Canvas once at least one team has squads
			if (_.keys(_.groupBy(playerStats, "_team")).length >= 1) {
				submenuItems.push({ label: "Squad Image", value: "squad-images", group: 1 });
			}
		}

		//Add Scoring and Stat info
		if (status >= 2) {
			submenuItems.push(
				{ label: "Add In-Game Event", value: "event", group: 1 },
				{ label: "Scores", value: "scores", group: 1 }
			);

			//Add a stats page when the competition allows it
			if (!_competition.instance.scoreOnly) {
				submenuItems.push({ label: "Stats", value: "stats", group: 2 });
			}
		}

		return submenuItems;
	}

	render() {
		const { location } = this.props;
		const { game } = this.state;
		const groups = ["Pre-game", "Match Day", "Post-game"];

		//Get all available options
		const submenuItems = this.getOptions();

		//Get the current path - everything after /admin/game/:_id
		const currentPath = location.pathname.split(game._id)[1].replace(/^\//, "");

		//Use this value to find the current option
		const currentOption = submenuItems.find(i => i.value === currentPath);

		//Group the options by status
		const options = _.chain(submenuItems)
			.groupBy(({ group }) => groups[group])
			.map((options, label) => ({
				label,
				options
			}))
			.value();

		return (
			<Select
				styles={selectStyling}
				options={options}
				defaultValue={currentOption}
				isSearchable={false}
				onChange={option => {
					if (option.value != currentOption.value) {
						this.props.history.push(`/admin/game/${game._id}/${option.value}`);
					}
				}}
			/>
		);
	}
}

function mapStateToProps({ config, games, teams }) {
	const { fullGames, gameList } = games;
	const { teamTypes, teamList } = teams;
	const { localTeam } = config;
	return { localTeam, fullGames, teamList, gameList, teamTypes };
}

AdminGamePageNavigation.propTypes = {
	game: PropTypes.object.isRequired
};

export default withRouter(connect(mapStateToProps)(AdminGamePageNavigation));