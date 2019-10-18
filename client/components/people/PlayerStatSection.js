//Modules
import _ from "lodash";
import React, { Component } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";

//Actions
import { fetchGameList, fetchGames } from "../../actions/gamesActions";

//Helpers
import { validateGameDate } from "../../../helpers/gameHelper";
import PlayerStatsHelper from "../../helperClasses/PlayerStatsHelper";
import playerStatTypes from "../../../constants/playerStatTypes";

//Components
import SingleStatBox from "../stats/SingleStatBox";
import LoadingPage from "../LoadingPage";
import StatsTables from "../games/StatsTables";
import GameFilters from "../games/GameFilters";
import TeamImage from "../teams/TeamImage";

class PlayerStatSection extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		const { playedGames, fullGames, teamTypes, fetchGames, person } = nextProps;
		const newState = { isLoading: false };

		//Get all active years
		let { years } = prevState;
		if (!years) {
			years = _.chain(playedGames)
				.map(g => g.date.getFullYear())
				.uniq()
				.sort()
				.reverse()
				.value();
			newState.years = years;
		}

		//Active year
		newState.year = prevState.year || _.max(years);

		//This year's games
		const playedGamesThisYear = playedGames.filter(game =>
			validateGameDate(game, "results", newState.year)
		);

		//On year change (or on initial load), reset the team types
		let { teamType } = prevState;
		newState.teamTypes = _.chain(playedGamesThisYear)
			.uniqBy(g => g._teamType)
			.map(g => teamTypes[g._teamType])
			.sortBy("sortOrder")
			.value();

		//Check if last active team type is in the new list
		if (!newState.teamTypes.find(t => t._id == teamType)) {
			//If not, just pull the first from the list
			teamType = newState.teamTypes[0]._id;
		}

		//And assign it to state
		newState.teamType = teamType;

		//Get Required Game Ids
		const gameIds = _.chain(playedGamesThisYear)
			.filter(game => {
				return game._teamType == teamType;
			})
			.map(game => game._id)
			.value();

		//Work out games to load
		const gamesToLoad = _.filter(gameIds, id => fullGames[id] === undefined);
		if (!gamesToLoad.length) {
			newState.isLoading = false;
			newState.games = _.chain(gameIds)
				.map(id => fullGames[id])
				.filter({ playerStats: [{ _player: person._id }], squadsAnnounced: true })
				.cloneDeep()
				.map(game => {
					game.playerStats = _.filter(game.playerStats, stats => {
						return stats._player == person._id;
					});
					return game;
				})
				.value();
		} else if (!prevState.isLoading) {
			fetchGames(gamesToLoad);
			newState.isLoading = true;
			newState.games = undefined;
		}

		return newState;
	}

	getHeader() {
		const { years, year, teamTypes, teamType, games } = this.state;

		//Title
		let yearSelector;
		if (years.length === 1) {
			yearSelector = years[0];
		} else {
			yearSelector = (
				<select
					value={year}
					onChange={ev =>
						this.setState({
							year: ev.target.value,
							activeFilters: {},
							teamType: undefined
						})
					}
				>
					{years.map(year => (
						<option key={year}>{year}</option>
					))}
				</select>
			);
		}

		//TeamTypes Menu
		const submenu = _.chain(teamTypes)
			.map(type => {
				const { name, _id } = type;
				return (
					<span
						key={_id}
						className={`pseudo-link ${_id === teamType ? "active" : ""}`}
						onClick={() => this.setState({ teamType: _id })}
					>
						{name}
					</span>
				);
			})
			.value();
		const teamTypeMenu = <div className="sub-menu light">{submenu}</div>;
		return (
			<div className="section-header">
				<div className="container">
					<h1>{yearSelector} Playing Stats</h1>
					{teamTypeMenu}
					<GameFilters
						games={games || []}
						onFilterChange={filteredGames => this.setState({ filteredGames })}
						friendliesByDefault={false}
					/>
				</div>
			</div>
		);
	}

	getStatBoxes() {
		const { filteredGames } = this.state;
		const { localTeam } = this.props;
		const positions = _.chain(filteredGames)
			.map(game => {
				switch (game.playerStats[0].position) {
					case 1:
						return "Fullback";
					case 2:
					case 5:
						return "Wing";
					case 3:
					case 4:
						return "Centre";
					case 6:
						return "Stand Off";
					case 7:
						return "Scrum Half";
					case 8:
					case 10:
						return "Prop";
					case 9:
						return "Hooker";
					case 11:
					case 12:
						return "Second Row";
					case 13:
						return "Loose Forward";
					default:
						return "Interchange";
				}
			})
			.groupBy()
			.map((arr, position) => ({ position, count: arr.length }))
			.sortBy("count")
			.reverse()
			.value();

		const maxPosition = _.map(positions)[0].count;
		const positionCards = _.map(positions, ({ count, position }) => (
			<tr key={position}>
				<th>{position}</th>
				<td>
					<span
						className="position-bar"
						style={{ width: `${(count / maxPosition) * 100}%` }}
					>
						{count}
					</span>
				</td>
			</tr>
		));

		const statBoxStats = {
			Scoring: ["T", "TA", "PT", "G", "KS"],
			Attack: ["M", "C", "AG", "TB", "CB", "E", "DR", "FT", "OF"],
			Defence: ["TK", "MT", "TS", "P"]
		};

		const totalStats = PlayerStatsHelper.sumStats(
			_.map(filteredGames, game => game.playerStats[0].stats)
		);

		const statBoxes = _.map(statBoxStats, (keys, category) => {
			const header = <h2 key={category}>{category}</h2>;
			const boxes = _.chain(keys)
				.filter(key => totalStats[key])
				.filter(key => totalStats[key].gameCount > 0)
				.filter(key => totalStats[key].total > 0 || !playerStatTypes[key].moreIsBetter)
				.map(key => (
					<SingleStatBox
						key={key}
						statKey={key}
						statValues={totalStats[key]}
						includeSummed={filteredGames.length > 1}
					/>
				))
				.value();
			if (boxes.length) {
				return (
					<div key={category}>
						{header}
						<div className="single-stat-boxes">{boxes}</div>
					</div>
				);
			} else {
				return null;
			}
		});

		const gameResults = _.chain(filteredGames)
			.groupBy(g => {
				const { [localTeam]: local, [g._opposition._id]: opposition } = g.score;
				if (local > opposition) {
					return "Win|Wins";
				} else if (opposition > local) {
					return "Loss|Losses";
				} else {
					return "Draw|Draws";
				}
			})
			.map((games, result) => {
				const [singular, plural] = result.split("|");
				return {
					games: games.length,
					result: games.length == 1 ? singular : plural
				};
			})
			.sortBy("games")
			.reverse()
			.map(({ games, result }) => (
				<div key={result} className="extra">
					{games} {result}
				</div>
			))
			.value();

		return (
			<div className="container" key="boxes">
				<div className="single-stat-boxes positions">
					<div className="single-stat-box card">
						<div className="total">{filteredGames.length}</div>
						<div className="name">{filteredGames.length === 1 ? "Game" : "Games"}</div>
						{gameResults}
					</div>
					<div className="single-stat-box card">
						<table>
							<tbody>{positionCards}</tbody>
						</table>
					</div>
				</div>
				{statBoxes}
			</div>
		);
	}

	getStatsTables() {
		const { filteredGames } = this.state;

		const rows = _.map(filteredGames, game => {
			const { slug, _opposition, date, title } = game;
			const stats = _.chain(game.playerStats[0].stats)
				.mapValues((val, key) => {
					if (!playerStatTypes[key]) {
						return null;
					}
					return {
						content: PlayerStatsHelper.toString(key, val),
						sortValue: val,
						title: `${playerStatTypes[key].plural} against ${game._opposition.name.short}`
					};
				})
				.pickBy(_.identity)
				.value();
			const data = {
				first: {
					content: (
						<Link to={`/games/${slug}`} className="fixture-box">
							<TeamImage team={_opposition} variant="dark" />
							<div className="date mobile">{new Date(date).toString("dS MMM")}</div>
							<div className="date desktop">
								{new Date(date).toString("ddd dS MMMM")}
							</div>
							<div className="title">{title}</div>
						</Link>
					),
					sortValue: date.toString("yyyyMMdd"),
					title
				},
				...stats
			};
			return { key: slug, data };
		});

		return (
			<div className="container" key="tables">
				<h2>Games</h2>
				<StatsTables listType="player" rows={rows} firstColumnHeader="Games" />
			</div>
		);
	}

	render() {
		const { years, filteredGames, games } = this.state;
		if (!years) {
			return <LoadingPage />;
		}

		let content;
		if (!games) {
			content = <LoadingPage />;
		} else if (!filteredGames || filteredGames.length === 0) {
			content = (
				<div className="container no-games-found" key="no-games-found">
					No game data available
				</div>
			);
		} else {
			content = [this.getStatBoxes(), this.getStatsTables()];
		}

		return (
			<section className="player-stats">
				{this.getHeader()}
				<div className="section-content">{content}</div>
			</section>
		);
	}
}

function mapStateToProps({ config, games, teams }) {
	const { localTeam } = config;
	const { teamTypes } = teams;
	const { gameList, fullGames } = games;
	return { teamTypes, gameList, fullGames, localTeam };
}

export default connect(
	mapStateToProps,
	{ fetchGames }
)(PlayerStatSection);
