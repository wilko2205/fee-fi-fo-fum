//Modules
import _ from "lodash";
import React, { Component } from "react";
import { connect } from "react-redux";
import { NavLink } from "react-router-dom";

//Components
import HelmetBuilder from "../components/HelmetBuilder";
import LoadingPage from "../components/LoadingPage";
import NotFoundPage from "~/client/pages/NotFoundPage";

//Actions
import { fetchGameList, fetchGames } from "~/client/actions/gamesActions";
import SeasonOverview from "~/client/components/seasons/SeasonOverview";

//Constants
import { earliestGiantsData } from "~/config/keys";

class SeasonPage extends Component {
	constructor(props) {
		super(props);
		const { fetchGameList, gameList } = props;

		if (!gameList) {
			fetchGameList();
		}

		this.state = {};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		const newState = { isLoadingGameList: false };
		const { match, teamTypes: teamTypesList, gameList, fullGames, fetchGames } = nextProps;

		//Ensure the game list is loaded
		if (!gameList) {
			return { isLoadingGameList: true };
		}

		//Once we have the game list, render the game list and find the available years
		let { results, years } = prevState;
		if (!results) {
			results = _.filter(
				gameList,
				g => g.date < new Date() && Number(g.date.getFullYear()) >= earliestGiantsData
			);
			newState.results = results;
		}

		if (!years) {
			years = _.chain(results)
				.map(({ date }) => Number(date.getFullYear()))
				.uniq()
				.sort()
				.reverse()
				.value();
			newState.years = years;
		}

		//Get Active Year
		newState.year = years.find(y => y == match.params.year) || years[0];

		//Get TeamTypes
		let { teamTypes } = prevState;
		if (newState.year !== prevState.year) {
			teamTypes = _.chain(results)
				.filter(game => game.date.getFullYear() == newState.year)
				.map(game => teamTypesList[game._teamType])
				.uniqBy("_id")
				.sortBy("sortOrder")
				.value();
			newState.teamTypes = teamTypes;
		}

		//Get Active TeamType
		const filteredTeamType = teamTypes.find(({ slug }) => slug == match.params.teamType);
		newState.teamType = filteredTeamType ? filteredTeamType._id : teamTypes[0]._id;

		//Get Page
		newState.page = match.params.page || "overview";

		//On initial pageload, if something changes, or while games are loading, check for games to load
		if (
			newState.year != prevState.year ||
			newState.teamType != prevState.teamType ||
			prevState.isLoadingGames
		) {
			const gamesRequired = results.filter(
				({ date, _teamType }) =>
					date.getFullYear() == newState.year && _teamType == newState.teamType
			);

			const gamesToLoad = gamesRequired.filter(g => !fullGames[g._id]).map(g => g._id);
			if (gamesToLoad.length && !prevState.isLoadingGames) {
				fetchGames(gamesToLoad);
				newState.isLoadingGames = true;
			} else if (!gamesToLoad.length) {
				newState.games = gamesRequired.map(g => fullGames[g._id]);
				newState.isLoadingGames = false;
			}
		}
		return newState;
	}

	generatePageHeader() {
		const { year, years } = this.state;
		const options = _.map(years, year => {
			return (
				<option key={year} value={year}>
					{year}
				</option>
			);
		});
		return [
			<select
				key="year-selector"
				onChange={ev => this.props.history.push(`/seasons/${ev.target.value}`)}
				value={year}
			>
				{options}
			</select>,
			<span key="results-header"> Season</span>
		];
	}

	generateTeamTypeMenu() {
		const { teamTypes, year } = this.state;
		const coreUrl = `/seasons/${year}`;
		const submenu = _.chain(teamTypes)
			.map(teamType => {
				const { name, slug } = teamType;
				return (
					<NavLink key={slug} to={`${coreUrl}/${slug}`} activeClassName="active">
						{name}
					</NavLink>
				);
			})
			.value();

		const dummyLinkUrls = ["/seasons/", coreUrl];
		const dummyLinks = dummyLinkUrls.map(url => {
			return (
				<NavLink
					key={url}
					className="hidden"
					exact={true}
					to={url}
					activeClassName="active"
				/>
			);
		});

		return (
			<div className="sub-menu">
				{dummyLinks}
				{submenu}
			</div>
		);
	}
	generatePageMenu() {
		const { teamTypes, teamType, year } = this.state;
		console.log(teamTypes);
		const coreUrl = `/seasons/${year}/${teamTypes.find(t => t._id == teamType).slug}`;
		const pages = [
			{ slug: "overview", name: "Overview" },
			{ slug: "player-stats", name: "Player Stats" }
		];
		const submenu = pages.map(teamType => {
			const { name, slug } = teamType;
			return (
				<NavLink key={slug} to={`${coreUrl}/${slug}`} activeClassName="active">
					{name}
				</NavLink>
			);
		});

		const dummyLinkUrls = ["/seasons/", `/seasons/${year}`, coreUrl];
		const dummyLinks = dummyLinkUrls.map(url => {
			return (
				<NavLink
					key={url}
					className="hidden"
					exact={true}
					to={url}
					activeClassName="active"
				/>
			);
		});

		return (
			<div className="sub-menu page-menu">
				{dummyLinks}
				{submenu}
			</div>
		);
	}

	generateHelmet() {
		const { year, teamType, page } = this.state;
		const { teamTypes } = this.props;
		const teamTypeObject = _.find(teamTypes, t => t._id === teamType);
		const specifyTeamTypeInMeta = _.minBy(_.values(teamTypes), "sortOrder")._id !== teamType;

		//Title
		let title = `${year} Huddersfield Giants`;
		if (specifyTeamTypeInMeta) {
			title += ` ${teamTypeObject.name}`;
		}
		title += " Season";

		//Canonical
		let canonical = `/season/${year}/${teamTypeObject.slug}/${page}`;

		//Render
		return <HelmetBuilder title={title} canonical={canonical} />;
	}

	renderContent() {
		const { page, games, year, teamType, isLoadingGames } = this.state;
		if (isLoadingGames) {
			return <LoadingPage />;
		} else {
			const props = {
				games,
				year,
				teamType
			};
			switch (page) {
				case "overview":
					return <SeasonOverview {...props} />;
				default:
					return <NotFoundPage />;
			}
		}
	}

	render() {
		const { isLoadingGameList } = this.state;

		if (isLoadingGameList) {
			return <LoadingPage />;
		}

		return (
			<div className="season-page">
				{this.generateHelmet()}

				<section className="page-header">
					<div className="container">
						<h1>{this.generatePageHeader()}</h1>
						{this.generateTeamTypeMenu()}
						{this.generatePageMenu()}
					</div>
				</section>
				{this.renderContent()}
			</div>
		);
	}
}

async function loadData(store) {
	await store.dispatch(fetchGameList());
}

function mapStateToProps({ config, games, teams }) {
	const { localTeam } = config;
	const { gameList, fullGames } = games;
	const { fullTeams, teamTypes } = teams;
	return { localTeam, gameList, fullGames, fullTeams, teamTypes };
}

export default {
	component: connect(
		mapStateToProps,
		{ fetchGameList, fetchGames }
	)(SeasonPage),
	loadData
};
