//Modules
import _ from "lodash";
import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import * as Yup from "yup";

//Actions
import { fetchCompetitionSegments } from "../../../actions/competitionActions";
import { fetchAllGrounds } from "../../../actions/groundActions";
import { fetchPeopleList } from "../../../actions/peopleActions";
import { createGame, updateGame } from "../../../actions/gamesActions";

//Components
import BasicForm from "../BasicForm";
import LoadingPage from "../../LoadingPage";

//Constants
import * as fieldTypes from "~/constants/formFieldTypes";

//Helpers
import { getDynamicOptions } from "~/helpers/gameHelper";

class AdminGameOverview extends Component {
	constructor(props) {
		super(props);
		const {
			competitionSegmentList,
			fetchCompetitionSegments,
			groundList,
			fetchAllGrounds,
			peopleList,
			fetchPeopleList
		} = props;

		if (!competitionSegmentList) {
			fetchCompetitionSegments();
		}
		if (!groundList) {
			fetchAllGrounds();
		}
		if (!peopleList) {
			fetchPeopleList();
		}
		this.state = {};
	}

	static getDerivedStateFromProps(nextProps) {
		const {
			match,
			teamList,
			teamTypes,
			competitionSegmentList,
			groundList,
			peopleList,
			fullGames,
			localTeam
		} = nextProps;
		const newState = { isLoading: false };
		const { _id } = match.params;

		//Create or edit
		newState.isNew = !_id;

		//Await lists
		if (!teamList || !competitionSegmentList || !groundList || !peopleList) {
			newState.isLoading = true;
			return newState;
		}

		if (!newState.isNew) {
			//Get Game
			newState.game = fullGames[_id];
		}

		//Validation Schema
		const rawValidationSchema = {
			date: Yup.date()
				.required()
				.label("Date"),
			time: Yup.string()
				.required()
				.label("Time"),
			_teamType: Yup.string()
				.required()
				.label("Team Type"),
			_competition: Yup.string()
				.required()
				.label("Competition"),
			_opposition: Yup.string()
				.required()
				.label("Opposition"),
			round: Yup.number()
				.min(1)
				.label("Round"),
			customTitle: Yup.string().label("Title"),
			customHashtags: Yup.string().label("Hashtags"),
			isAway: Yup.string()
				.required()
				.label("Home/Away"),
			_ground: Yup.string()
				.required()
				.label("Ground"),
			tv: Yup.string().label("TV"),
			_referee: Yup.string()
				.label("Referee")
				.nullable(),
			_video_referee: Yup.string()
				.label("Video Referee")
				.nullable()
		};

		if (!newState.isNew) {
			//Add a year limit to the game date
			const year = newState.game.date.getFullYear();
			rawValidationSchema.date = rawValidationSchema.date
				.min(`${year}-01-01`)
				.max(`${year}-12-31`);

			//Add Score Override
			rawValidationSchema.scoreOverride = Yup.object().shape({
				[localTeam]: Yup.string().label(teamList[localTeam].name.short),
				[newState.game._opposition._id]: Yup.string().label(
					newState.game._opposition.name.short
				)
			});
		}

		newState.validationSchema = Yup.object().shape(rawValidationSchema);

		//Create dropdown options
		//Competitions and Teams will be rendered dynamically
		newState.options = {};
		newState.options._teamType = _.chain(teamTypes)
			.sortBy("sortOrder")
			.map(({ _id, name }) => ({ value: _id, label: name }))
			.value();

		const groundOptions = _.chain(groundList)
			.map(({ _id, name, address }) => ({
				value: _id,
				label: `${name}, ${address._city.name}`
			}))
			.sortBy("label")
			.value();
		newState.options._ground = [
			{ value: "auto", label: "Home Team's Ground" },
			...groundOptions
		];

		newState.options._referee = _.chain(peopleList)
			.filter(person => person.isReferee)
			.map(ref => ({
				value: ref._id,
				label: `${ref.name.first} ${ref.name.last}`
			}))
			.sortBy("label")
			.value();

		newState.options.tv = ["Sky", "BBC"].map(label => ({
			label,
			value: label.toLowerCase()
		}));

		newState.options.isAway = [
			{ label: "Home", value: false },
			{ label: "Away", value: true }
		];

		return newState;
	}

	getInitialValues() {
		const { localTeam } = this.props;
		const { game, isNew, options } = this.state;

		const defaultValues = {
			date: "",
			time: "",
			_teamType: "",
			_competition: "",
			_opposition: "",
			round: "",
			customTitle: "",
			customHashtags: [],
			isAway: "",
			_ground: options._ground[0],
			tv: "",
			_referee: "",
			_video_referee: ""
		};

		if (isNew) {
			return defaultValues;
		} else {
			//As the options are created dynamically, we do this in three steps
			//First, create a values object with placeholder dropdown options for
			//the competition and opposition fields
			const values = _.mapValues(defaultValues, (defaultValue, key) => {
				let value;
				switch (key) {
					case "customHashtags":
						value = game[key] ? game[key].map(tag => ({ label: tag, value: tag })) : [];
						break;
					case "date":
						value = game.date.toString("yyyy-MM-dd");
						break;
					case "time":
						value = game.date.toString("HH:mm:ss");
						break;
					case "_teamType":
					case "tv":
						value = options[key].find(({ value }) => value === game[key]);
						break;
					case "_referee":
					case "_ground":
					case "_video_referee": {
						//Video Referee uses options._referee, so we run a quick replace
						//on the key. This shouldn't affect other fields
						const optionList = options[key.replace("_video", "")];
						value = optionList.find(
							({ value }) => value === (game[key] ? game[key]._id : null)
						);
						break;
					}
					case "_competition":
					case "_opposition":
						value = { value: game[key]._id };
						break;
					default:
						value = game[key];
						break;
				}
				return value != null ? value : defaultValue;
			});

			//We use this object to get the options we need
			const dynamicOptions = getDynamicOptions(values, false, this.props);

			//We then convert the select field values to use actual options
			values._competition = dynamicOptions._competition.find(
				option => option.value == values._competition.value
			);
			values._opposition = dynamicOptions.teams.find(
				option => option.value == values._opposition.value
			);

			//And finally add on the score override fields
			values.scoreOverride = {};
			[localTeam, game._opposition._id].forEach(_team => {
				let value = "";
				if (game.scoreOverride && game.scoreOverride[_team] != null) {
					value = game.scoreOverride[_team];
				}
				values.scoreOverride[_team] = value;
			});

			return values;
		}
	}

	getFieldGroups(values) {
		const { localTeam } = this.props;
		const { game, isNew, options } = this.state;
		const dynamicOptions = getDynamicOptions(values, false, this.props);

		const fieldGroups = [
			{
				fields: [
					{ name: "date", type: fieldTypes.date },
					{ name: "time", type: fieldTypes.time },
					{
						name: "_teamType",
						type: fieldTypes.select,
						options: options._teamType,
						isDisabled: !isNew
					},
					{
						name: "_competition",
						type: fieldTypes.select,
						options: dynamicOptions._competition,
						isDisabled: !isNew || !values.date || !values._teamType
					},
					{
						name: "_opposition",
						type: fieldTypes.select,
						options: dynamicOptions.teams,
						isDisabled: !values._competition || (!isNew && game.status > 0)
					},
					{
						name: "round",
						type: fieldTypes.number
					}
				]
			},
			{
				label: "Venue",
				fields: [
					{ name: "isAway", type: fieldTypes.radio, options: options.isAway },
					{ name: "_ground", type: fieldTypes.select, options: options._ground }
				]
			},
			{
				label: "Media",
				fields: [
					{
						name: "customTitle",
						type: fieldTypes.text,
						placeholder: "Auto-generated if left blank"
					},
					{
						name: "customHashtags",
						type: fieldTypes.creatableSelect,
						isMulti: true,
						placeholder: "Auto-generated if left blank"
					},
					{
						name: "tv",
						type: fieldTypes.select,
						options: options.tv,
						isClearable: true,
						isSearchable: false
					}
				]
			},
			{
				label: "Referees",
				fields: [
					{
						name: "_referee",
						type: fieldTypes.select,
						options: options._referee,
						isClearable: true
					},
					{
						name: "_video_referee",
						type: fieldTypes.select,
						options: options._referee,
						isClearable: true
					}
				]
			}
		];

		if (!isNew) {
			const scoreOverrideFields = [
				{
					name: `scoreOverride.${localTeam}`,
					type: fieldTypes.number
				},
				{
					name: `scoreOverride.${game._opposition._id}`,
					type: fieldTypes.number
				}
			];

			if (game.isAway) {
				scoreOverrideFields.reverse();
			}

			fieldGroups.push({
				label: "Score Override",
				fields: scoreOverrideFields
			});
		}

		return fieldGroups;
	}

	alterValuesBeforeSubmit(values) {
		//Fix date/time
		values.date = `${values.date} ${values.time}`;
		delete values.time;

		//Filter score override
		if (values.scoreOverride) {
			values.scoreOverride = _.map(values.scoreOverride, (points, _team) => ({
				points,
				_team
			})).filter(({ points }) => points !== null);
		}
	}

	render() {
		const { game, isNew, isLoading, validationSchema } = this.state;
		const { createGame, updateGame } = this.props;

		if (isLoading) {
			return <LoadingPage />;
		}

		//Handle props specifically for create/update
		let formProps;
		if (isNew) {
			formProps = {
				onSubmit: values => createGame(values),
				redirectOnSubmit: id => `/admin/game/${id}`
			};
		} else {
			formProps = {
				onSubmit: values => updateGame(game._id, values)
			};
		}

		return (
			<BasicForm
				alterValuesBeforeSubmit={this.alterValuesBeforeSubmit}
				fastFieldByDefault={false}
				fieldGroups={values => this.getFieldGroups(values)}
				initialValues={this.getInitialValues()}
				isNew={isNew}
				itemType="Game"
				validationSchema={validationSchema}
				{...formProps}
			/>
		);
	}
}

//Add Redux Support
function mapStateToProps({ teams, competitions, games, grounds, people, config }) {
	const { teamTypes, teamList } = teams;
	const { competitionSegmentList } = competitions;
	const { fullGames } = games;
	const { groundList } = grounds;
	const { peopleList } = people;
	const { localTeam } = config;

	return {
		teamTypes,
		teamList,
		fullGames,
		competitionSegmentList,
		groundList,
		peopleList,
		localTeam
	};
}
// export default form;
export default withRouter(
	connect(mapStateToProps, {
		fetchCompetitionSegments,
		fetchAllGrounds,
		fetchPeopleList,
		createGame,
		updateGame
	})(AdminGameOverview)
);
