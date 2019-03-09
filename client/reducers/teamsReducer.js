import {
	FETCH_ALL_TEAM_TYPES,
	FETCH_SQUAD,
	FETCH_YEARS_WITH_SQUADS,
	FETCH_ALL_TEAMS,
	UPDATE_TEAM
} from "../actions/types";
import _ from "lodash";

export default function(state = { squads: {} }, action) {
	switch (action.type) {
		case UPDATE_TEAM:
			return {
				...state,
				teamList: {
					...state.teamList,
					[action.payload.slug]: action.payload
				}
			};
		case FETCH_SQUAD:
			return {
				...state,
				squads: {
					...state.squads,
					[action.team]: {
						...state.squads[action.team],
						[action.year]: {
							...state.squads[action.team][action.year],
							[action.teamType]: action.payload
						}
					}
				}
			};
		case FETCH_YEARS_WITH_SQUADS:
			return {
				...state,
				squads: {
					...state.squads,
					[action.team]: _.chain(action.payload)
						.mapValues(teamTypes => {
							return _.chain(teamTypes)
								.map(teamType => [teamType, null])
								.fromPairs()
								.value();
						})
						.value()
				}
			};

		case FETCH_ALL_TEAMS:
			return {
				...state,
				teamList: action.payload
			};

		case FETCH_ALL_TEAM_TYPES:
			return {
				...state,
				teamTypes: action.payload
			};
		default:
			return state;
	}
}
