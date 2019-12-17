import _ from "lodash";
import { FETCH_ERRORS, SEND_ERROR } from "../actions/types";

export default function(state = { sentErrors: [] }, action) {
	switch (action.type) {
		case FETCH_ERRORS:
			return {
				...state,
				errorList: action.payload
			};

		case SEND_ERROR:
			return {
				...state,
				//List of paths, to prevent multiple reports on navigation
				sentErrors: [...state.sentErrors, action.payload]
			};

		default:
			return state;
	}
}
