//Modules
import _ from "lodash";
import React, { Component } from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";

//Components
import LoadingPage from "../LoadingPage";
import TeamImage from "../teams/TeamImage";

//Actions
import { fetchGames } from "~/client/actions/gamesActions";
import { fetchNeutralGames } from "~/client/actions/neutralGamesActions";
import LeagueTable from "../seasons/LeagueTable";

class TeamForm extends Component {
	constructor(props) {
		super(props);
		const { game, gameList, fullGames, fetchGames, neutralGames, fetchNeutralGames } = props;

		//Load Neutral Games
		if (!neutralGames) {
			fetchNeutralGames();
		}

		//Calculate Last Five Local Games
		const lastLocal = _.chain(gameList)
			.filter(g => {
				return g.date < game.date && g._teamType == game._teamType;
			})
			.sortBy("date")
			.reverse()
			.map("_id")
			.chunk(5)
			.value()[0];

		const lastHeadToHead = _.chain(gameList)
			.filter(g => {
				return (
					g.date < game.date &&
					g._teamType == game._teamType &&
					g._opposition == game._opposition._id
				);
			})
			.sortBy("date")
			.reverse()
			.map("_id")
			.chunk(5)
			.value()[0];

		const gamesRequired = _.chain([lastHeadToHead, lastLocal])
			.flatten()
			.uniq()
			.filter(_.identity)
			.value();
		const gamesToLoad = gamesRequired.filter(id => !fullGames[id]);

		if (gamesToLoad.length) {
			fetchGames(gamesToLoad);
		}

		this.state = { lastLocal, lastHeadToHead, gamesRequired };
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		const { game, neutralGames, fullGames } = nextProps;
		const { gamesRequired } = prevState;

		//Wait on all games
		if (!neutralGames || gamesRequired.filter(id => !fullGames[id]).length) {
			return {};
		}
		//Get Games
		const oppositionId = game._opposition._id;
		const lastFiveNeutral =
			_.chain(neutralGames)
				.filter(g => {
					return (
						g.date < game.date &&
						g._teamType == game._teamType &&
						(g._homeTeam == oppositionId || g._awayTeam == oppositionId)
					);
				})
				.sortBy("date")
				.reverse()
				.map(obj => ({ ...obj, isNeutral: true }))
				.chunk(5)
				.value()[0] || [];

		return { lastFiveNeutral };
	}

	renderHeadToHead() {
		const { fullGames, localTeam, fullTeams, game } = this.props;
		const { lastHeadToHead } = this.state;
		if (!lastHeadToHead || !lastHeadToHead.length) {
			return null;
		}

		//Aggregate Stats
		const results = {
			W: 0,
			L: 0,
			D: 0
		};
		const points = {
			[localTeam]: 0,
			[game._opposition._id]: 0
		};

		//Badges
		const badges = {
			[localTeam]: <TeamImage team={fullTeams[localTeam]} />,
			[game._opposition._id]: <TeamImage team={game._opposition} />
		};

		//Theming

		const games = lastHeadToHead.reverse().map(id => {
			const game = fullGames[id];

			//Teams
			let teams = [fullTeams[localTeam], game._opposition];
			if (game.isAway) {
				teams = teams.reverse();
			}

			//Date
			const sameYear = game.date.getFullYear() == new Date().getFullYear();
			const date = game.date.toString(`dS MMM${sameYear ? "" : " yyyy"}`);

			//Get Team Boes
			let dateColours = { main: "#444", text: "#DDD" };
			if (game.score) {
				//Result
				if (game.score[localTeam] > game.score[game._opposition._id]) {
					results["W"]++;
					dateColours = fullTeams[localTeam].colours;
				} else if (game.score[localTeam] < game.score[game._opposition._id]) {
					results["L"]++;
					dateColours = game._opposition.colours;
				} else {
					results["D"]++;
				}

				//Points
				points[localTeam] += game.score[localTeam];
				points[game._opposition._id] += game.score[game._opposition._id];
			}
			//TeamBoxes
			const teamBoxes = teams.map((team, i) => (
				<div
					key={i}
					className="team-boxes"
					style={{ background: team.colours.main, color: team.colours.text }}
				>
					{badges[team._id]}
					{game.score ? game.score[team._id] : null}
				</div>
			));

			return (
				<Link key={game._id} to={`/games/${game.slug}`} className="game">
					{teamBoxes}
					<div
						className="details"
						style={{
							background: dateColours.main,
							color: dateColours.text
						}}
					>
						<div className="date">{date}</div>
						<div className="title">{game.title}</div>
					</div>
				</Link>
			);
		});

		return (
			<div className="head-to-head" key="h2h">
				<h2>Head to Head</h2>
				<div className="games">{games}</div>
				<div className="summary">
					<div>
						{fullTeams[localTeam].name.short} wins: {results.W}
					</div>
					<div>Draws: {results.D}</div>
					<div>
						{game._opposition.name.short} wins: {results.L}
					</div>
				</div>
				<div className="summary">
					<div>
						{fullTeams[localTeam].name.short} points: {points[localTeam]}
					</div>
					<div>
						{game._opposition.name.short} points: {points[game._opposition._id]}
					</div>
				</div>
			</div>
		);
	}

	renderForm() {
		const { game, fullGames, fullTeams, localTeam, teamList } = this.props;
		const { gamesRequired, lastFiveNeutral } = this.state;
		//Format local games the same as neutral
		const allGames = gamesRequired.map(_id => {
			const { date, isAway, score, _opposition, slug } = fullGames[_id];

			//Set Teams & Score
			let points = [
				{ team: localTeam, points: score ? score[localTeam] : null },
				{ team: _opposition._id, points: score ? score[_opposition._id] : null }
			];
			if (isAway) {
				points = points.reverse();
			}
			const _homeTeam = points[0].team;
			const homePoints = points[0].points;
			const _awayTeam = points[1].team;
			const awayPoints = points[1].points;

			return {
				_id,
				date,
				_homeTeam,
				homePoints,
				_awayTeam,
				awayPoints,
				slug
			};
		});

		const headToHead = allGames.filter(
			g => g._homeTeam == game._opposition._id || g._awayTeam == game._opposition._id
		);

		const oppositionGames = _.chain([...headToHead, ...lastFiveNeutral])
			.sortBy("date")
			.reverse()
			.chunk(5)
			.value()[0];

		const localGames = _.chain(allGames)
			.sortBy("date")
			.reverse()
			.chunk(5)
			.value()[0];

		let gamesToRender = [
			{ games: localGames, team: fullTeams[localTeam] },
			{ games: oppositionGames, team: game._opposition }
		];
		if (game.isAway) {
			gamesToRender = gamesToRender.reverse();
		}

		const content = gamesToRender.map(({ team, games }) => {
			if (!games || !games.length) {
				return null;
			}

			const renderedGames = games.reverse().map(game => {
				const { _homeTeam, _awayTeam, homePoints, awayPoints, slug, date } = game;
				const isAway = _awayTeam == team._id;
				const oppositionId = isAway ? _homeTeam : _awayTeam;
				const [localScore, oppositionScore] = isAway
					? [awayPoints, homePoints]
					: [homePoints, awayPoints];
				let result;
				if (localScore > oppositionScore) {
					result = "W";
				} else if (localScore < oppositionScore) {
					result = "L";
				} else {
					result = "D";
				}

				const innerContent = [
					<div className="badge" key="badge">
						<TeamImage team={teamList[oppositionId]} />
					</div>,
					<div className="date" key="date">
						{date.toString("dd/MM/yyyy")}
					</div>,
					<div className={`score ${result}`} key="score">
						{homePoints}-{awayPoints}
					</div>
				];
				if (slug) {
					return (
						<Link className="game" key={game._id} to={`/games/${slug}`}>
							{innerContent}
						</Link>
					);
				} else {
					return (
						<div className="game" key={game._id}>
							{innerContent}
						</div>
					);
				}
			});

			return (
				<div className="team" key={team._id}>
					<div style={{ background: team.colours.main }}>
						<TeamImage team={team} />
					</div>
					<div className="games">{renderedGames}</div>
				</div>
			);
		});

		let table;
		if (game._competition.type == "League") {
			table = (
				<LeagueTable
					competition={game._competition._id}
					year={game.date.getFullYear()}
					highlightTeams={[localTeam, game._opposition._id]}
				/>
			);
		}

		return (
			<div className={`team-form-wrapper`} key="form">
				<div className={table ? "with-table" : ""}>
					<div className="teams">
						<h2>Form</h2>
						{content}
					</div>
					{table}
				</div>
			</div>
		);
	}

	render() {
		const { gamesRequired, lastFiveNeutral } = this.state;
		let content;
		if (!gamesRequired) {
			content = null;
		} else if (!lastFiveNeutral) {
			content = <LoadingPage key="lp" />;
		} else {
			content = [this.renderHeadToHead(), this.renderForm()];
		}

		if (content) {
			return (
				<section className="form">
					<div className="container">{content}</div>
				</section>
			);
		} else {
			return null;
		}
	}
}

function mapStateToProps({ config, games, teams }) {
	const { localTeam } = config;
	const { gameList, fullGames, neutralGames } = games;
	const { teamList, fullTeams } = teams;
	return { localTeam, gameList, fullGames, neutralGames, fullTeams, teamList };
}

export default connect(
	mapStateToProps,
	{ fetchGames, fetchNeutralGames }
)(TeamForm);
