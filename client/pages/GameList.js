//Modules
import _ from "lodash";
import React, { Component } from "react";
import { connect } from "react-redux";
import { Redirect } from "react-router-dom";
import { Link } from "react-router-dom";

//Components
import SubMenu from "~/client/components/SubMenu";
import HelmetBuilder from "../components/HelmetBuilder";
import LoadingPage from "../components/LoadingPage";
import GameFilters from "../components/games/GameFilters";
import GameCard from "../components/games/GameCard";
import AdminGameCard from "~/client/components/games/AdminGameCard";
import CalendarDialog from "../components/games/calendar/CalendarDialog";

//Actions
import { fetchGames, fetchGameList } from "../actions/gamesActions";
import { setActiveTeamType } from "../actions/teamsActions";

//Helpers
import { validateGameDate } from "../../helpers/gameHelper";

class GameList extends Component {
	constructor(props) {
		super(props);
		const { gameList, fetchGameList } = props;

		if (!gameList) {
			fetchGameList();
		}

		this.state = {};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		const newState = {};
		const {
			gameList,
			earliestLocalGames,
			fullGames,
			teamTypes,
			match,
			fetchGames,
			activeTeamType,
			setActiveTeamType
		} = nextProps;

		//Determine Admin Status
		newState.isAdmin = Boolean(match.path.match(/^\/admin/));

		//Fixtures or Results
		if (newState.isAdmin) {
			newState.listType =
				!match.params.year || match.params.year === "fixtures" ? "fixtures" : "results";
		} else {
			newState.listType = match.path.split("/")[2];
		}

		//Without the basic game list, continue to load
		if (!gameList) {
			return {};
		}

		//Get Years
		const now = new Date();
		newState.years = _.chain(gameList)
			.reject(game => game.date > now)
			.map(game => game.date.getFullYear())
			//Only show < earliestLocalGames on admin page
			.filter(year => newState.isAdmin || year >= earliestLocalGames)
			.uniq()
			.sort()
			.reverse()
			.value();

		//Get Active Year
		newState.year = match.params.year;

		if (!newState.year) {
			newState.year = newState.listType === "fixtures" ? "fixtures" : newState.years[0];
		}

		//Add fixtures
		newState.years.unshift("fixtures");

		//Get Valid Team Types for this year
		newState.teamTypes = _.chain(gameList)
			.filter(game => validateGameDate(game, newState.listType, newState.year))
			.map("_teamType")
			.uniq()
			.map(id => teamTypes[id])
			.sortBy("sortOrder")
			.value();

		//Get Team Type from URL
		if (match.params.teamType) {
			const filteredTeamType = _.find(
				newState.teamTypes,
				t => t.slug === match.params.teamType
			);
			if (filteredTeamType) {
				newState.teamType = filteredTeamType;
			}
		}

		//If no valid teamTypes are found (i.e. no games), then just pick the first one from the db
		if (!newState.teamTypes.length) {
			newState.teamType = _.sortBy(teamTypes, "sortOrder")[0];
		}

		//If no valid team type is found, we redirect to either the last active one, or just the first in the list
		if (!newState.teamType) {
			const teamTypeRedirect =
				_.find(newState.teamTypes, t => t._id == activeTeamType) || newState.teamTypes[0];

			newState.teamTypeRedirect = teamTypeRedirect.slug;
			newState.teamType = activeTeamType;
		} else {
			//In case we've been redirected, clear out this value
			newState.teamTypeRedirect = undefined;
			if (activeTeamType != newState.teamType._id) {
				setActiveTeamType(newState.teamType._id);
			}
		}

		//Create Root URL
		if (newState.isAdmin) {
			newState.rootUrl = `${newState.isAdmin ? "/admin" : ""}/games/${newState.year}`;
		} else if (newState.listType === "fixtures") {
			newState.rootUrl = `/games/fixtures`;
		} else {
			newState.rootUrl = `/games/results/${newState.year}`;
		}

		//Games
		const gameIds = _.chain(gameList)
			.filter(game => game._teamType == newState.teamType._id)
			.filter(game => validateGameDate(game, newState.listType, newState.year))
			.orderBy(["date"], [newState.listType === "results" ? "desc" : "asc"])
			.map(game => game._id)
			.value();
		const gamesToLoad = _.reject(gameIds, game => fullGames[game]);

		if (!gamesToLoad.length) {
			newState.games = _.map(gameIds, id => fullGames[id]);
			newState.isLoadingGames = false;
		} else if (!prevState.isLoadingGames) {
			fetchGames(gamesToLoad);
			newState.isLoadingGames = true;
			newState.games = undefined;
		}

		return newState;
	}

	generatePageHeader() {
		const { years, teamType, isAdmin } = this.state;

		//Otherwise we dynamically render a select
		const options = _.map(years, year => {
			return (
				<option key={year} value={year}>
					{year === "fixtures" ? "All Fixtures" : `${year} Results`}
				</option>
			);
		});

		//Create Select
		let rootUrl;
		if (isAdmin) {
			rootUrl = `/admin/games`;
		} else {
			rootUrl = `/games`;
		}
		const content = [
			<select
				key="year-selector"
				onChange={ev => {
					//Start with the root url
					let url = rootUrl;

					//Add either fixtures or results year
					const { value } = ev.target;
					if (isAdmin || value === "fixtures") {
						url += `/${value}`;
					} else {
						url += `/results/${value}`;
					}

					//Add teamtype
					url += `/${teamType.slug}`;

					//Push new url
					this.props.history.push(url);
				}}
				value={this.state.year}
			>
				{options}
			</select>
		];

		return content;
	}

	generateTeamTypeMenu() {
		const { teamTypes, rootUrl } = this.state;

		const list = teamTypes.map(({ name, slug }) => ({ slug, label: name }));

		return <SubMenu items={list} rootUrl={rootUrl} />;
	}

	populateGameList() {
		const { games, filteredGames, isAdmin } = this.state;
		if (!games || !filteredGames) {
			return <LoadingPage />;
		} else {
			const renderedGames = filteredGames.map((game, i) => {
				if (isAdmin) {
					return <AdminGameCard key={game._id} game={game} />;
				} else {
					const isLarge = i === 0 || (i === filteredGames.length - 1 && i % 2);
					return (
						<GameCard
							key={game._id}
							game={game}
							includeCountdown={i === 0}
							isLarge={Boolean(isLarge)}
						/>
					);
				}
			});

			const result = renderedGames.length ? renderedGames : <h3>No games found</h3>;
			return <div className={`container ${isAdmin ? "admin-" : ""}game-list`}>{result}</div>;
		}
	}

	renderCalendarDialog() {
		const { showCalendarDialog } = this.state;

		if (showCalendarDialog) {
			return (
				<CalendarDialog onDestroy={() => this.setState({ showCalendarDialog: false })} />
			);
		}
	}

	render() {
		const { bucketPaths, gameList, teamList, localTeam } = this.props;
		const { listType, games, year, teamType, teamTypeRedirect, rootUrl, isAdmin } = this.state;

		if (teamTypeRedirect) {
			return <Redirect to={`${rootUrl}/${teamTypeRedirect}`} />;
		}

		if (!teamType || !gameList) {
			return <LoadingPage />;
		}

		//Render Page Title
		const titleArray = [teamList[localTeam].name.long];
		if (teamType.sortOrder > 1) {
			titleArray.push(teamType.name);
		}
		if (listType === "fixtures") {
			titleArray.push("Fixtures");
		} else {
			titleArray.push(`${year} Results`);
		}
		const pageTitle = titleArray.join(" ");

		//New Game Link
		let adminLinks;
		if (isAdmin) {
			adminLinks = [
				<Link to="/admin/game/new" className="card nav-card" key="Add-New">
					Add New Game
				</Link>,
				<Link
					to="/admin/games/fixture-list-image"
					className="card nav-card"
					key="fixture-list-image"
				>
					Create Fixture Image
				</Link>
			];
		}

		//Add calendar link
		let calendarLink;
		if (!isAdmin && listType === "fixtures" && games && games.length) {
			calendarLink = (
				<div className="extra-buttons">
					<button
						type="button"
						onClick={() => this.setState({ showCalendarDialog: true })}
					>
						<img src={`${bucketPaths.images.layout}icons/calendar.png`} alt="" />
						Add fixtures to calendar
					</button>
				</div>
			);
		}

		return (
			<div className="game-list-page">
				<HelmetBuilder title={pageTitle} canonical={`${rootUrl}/${teamType.slug}`} />
				<section className="page-header no-margin">
					<div className="container">
						<h1>{this.generatePageHeader()}</h1>
						{this.generateTeamTypeMenu()}
						{adminLinks}
						{calendarLink}
					</div>
				</section>
				<section className="game-filters">
					<div className="container">
						<GameFilters
							games={games || []}
							onFilterChange={filteredGames => this.setState({ filteredGames })}
						/>
					</div>
				</section>
				{this.renderCalendarDialog()}
				{this.populateGameList()}
			</div>
		);
	}
}

function mapStateToProps({ games, teams, config }) {
	const { bucketPaths, earliestLocalGames, localTeam } = config;
	const { gameList, fullGames } = games;
	const { teamList, teamTypes, activeTeamType } = teams;
	return {
		bucketPaths,
		earliestLocalGames,
		localTeam,
		gameList,
		fullGames,
		teamList,
		teamTypes,
		activeTeamType
	};
}

export async function loadData(store, path) {
	if (!path.match(/^\/admin/)) {
		//Get Game List
		return store.dispatch(fetchGameList());
	}
}

export default {
	component: connect(mapStateToProps, {
		fetchGames,
		fetchGameList,
		setActiveTeamType
	})(GameList),
	loadData
};
