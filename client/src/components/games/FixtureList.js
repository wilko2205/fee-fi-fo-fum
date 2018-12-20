import { connect } from "react-redux";
import { fetchFixtures, updateFilters } from "../../actions/games";
import GameList from "./GameList";

class FixtureList extends GameList {
	fetchGameList() {
		this.props.fetchFixtures(this.state.filters);
	}

	fetchFilters() {
		this.props.updateFilters("fixtures");
	}

	generatePageHeader() {
		return "Fixtures";
	}
}

function mapStateToProps({ games }) {
	return { games: games.fixtures || null, filters: games.filters };
}

export default connect(
	mapStateToProps,
	{ fetchFixtures, updateFilters }
)(FixtureList);
