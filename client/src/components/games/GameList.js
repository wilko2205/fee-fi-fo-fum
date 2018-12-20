import React, { Component } from "react";
import LoadingPage from "../LoadingPage";
import _ from "lodash";

class GameList extends Component {
	constructor(props) {
		super(props);

		const state = {
			filters: {}
		};

		this.state = state;
	}

	async componentDidMount() {
		await this.fetchFilters();
		this.fetchGameList();
	}

	populateGameList() {
		const games = this.props.games || null;

		if (games === null) {
			return <LoadingPage />;
		} else if (games.length === 0) {
			return "No games found";
		} else {
			const renderedGames = games.map(game => {
				return (
					<p key={game._id}>
						{game._opposition.name.short} {game.date} {game.isAway ? "away" : "home"}
					</p>
				);
			});
			return <div>{renderedGames}</div>;
		}
	}

	async updateFilters(filterName, ev) {
		const { value } = ev.target || null;

		if (value) {
			await this.setState(prevState => ({
				filters: { ...prevState.filters, [filterName]: value }
			}));
		} else {
			//Field has been cleared, remove from list
			const { filters } = this.state;
			delete filters[filterName];
			await this.setState(filters);
		}

		this.fetchGameList();
	}

	generateFilters() {
		if (this.props.filters) {
			return _.map(this.props.filters, (list, filterName) => {
				const options = _.map(list, (name, value) => {
					return (
						<option key={value} value={value}>
							{name}
						</option>
					);
				});
				return (
					<div key={filterName} className="list-filter">
						<h4>{filterName.toUpperCase()}</h4>
						<select onChange={ev => this.updateFilters(filterName, ev)}>
							<option value="">All</option>
							{options}
						</select>
					</div>
				);
			});
		}
	}

	render() {
		return (
			<div>
				<div className="page-header">
					<div className="container">
						<h1>{this.generatePageHeader()}</h1>
						<div className="list-filters">{this.generateFilters()}</div>
					</div>
				</div>
				<div className="container">{this.populateGameList()}</div>
			</div>
		);
	}
}

export default GameList;