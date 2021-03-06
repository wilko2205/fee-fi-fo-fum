import { DELETE_PERSON, FETCH_PEOPLE_LIST, FETCH_PERSON, FETCH_PEOPLE, ADD_PERSON_SLUG } from "./types";
import { toast } from "react-toastify";
import _ from "lodash";

export const fetchPeopleList = () => async (dispatch, getState, api) => {
	const res = await api.get(`/people`);
	dispatch({ type: FETCH_PEOPLE_LIST, payload: res.data });
};

export const createPerson = data => async (dispatch, getState, api) => {
	const res = await api.post(`/people/`, data);
	dispatch({ type: FETCH_PERSON, payload: res.data });
	toast.success("Person created");
	return res.data._id;
};

export const updatePerson = (id, data) => async (dispatch, getState, api) => {
	const res = await api.put(`/people/${id}`, data);
	dispatch({ type: FETCH_PERSON, payload: res.data });
	toast.success("Person Updated");
};

export const updatePeople = data => async (dispatch, getState, api) => {
	const res = await api.put(`/people/`, data);
	if (res.data) {
		toast.success(`${Object.keys(data).length} People Updated`);
		dispatch({ type: FETCH_PEOPLE, payload: res.data });
		return true;
	}

	return false;
};

export const deletePerson = id => async (dispatch, getState, api) => {
	const res = await api.delete(`/people/${id}`);
	if (res.data) {
		dispatch({ type: DELETE_PERSON, payload: id });
		toast.success(`Person deleted`);
		return true;
	}
};

export const mergePerson = (source, destination) => async (dispatch, getState, api) => {
	const res = await api.post(`/people/${source}/merge/${destination}`);
	if (res.data) {
		dispatch({ type: DELETE_PERSON, payload: source });
		dispatch({ type: FETCH_PERSON, payload: res.data });
		toast.success("Merge Successful");
		return true;
	}
};

export const fetchPerson = id => async (dispatch, getState, api) => {
	const res = await api.get(`/people/${id}`);
	dispatch({ type: FETCH_PERSON, payload: res.data });
};

export const fetchPersonFromSlug = slug => async (dispatch, getState, api) => {
	let errorFound = false;
	const res = await api.get(`/people/slug/${slug}`).catch(e => {
		errorFound = true;
		switch (e.response.status) {
			case 404:
				dispatch({ type: ADD_PERSON_SLUG, payload: { [slug]: false } });
				break;
		}
	});

	//Handle retrieved player
	if (!errorFound) {
		//Add person before adding slug, to prevent errors
		dispatch({ type: FETCH_PERSON, payload: res.data });
		dispatch({ type: ADD_PERSON_SLUG, payload: { [slug]: res.data._id } });
	}
};

export const fetchPeople = ids => async (dispatch, getState, api) => {
	//Enforce limit
	const { fetchPeopleLimit } = getState().config;
	const queries = _.chain(ids)
		.uniq()
		.chunk(fetchPeopleLimit || 99999999999)
		.map(chunkedIds => api.get(`/people/multi/${chunkedIds.join(",")}`))
		.value();

	const results = await Promise.all(queries);
	const payload = _.merge(...results.map(({ data }) => data));

	dispatch({ type: FETCH_PEOPLE, payload });
};

export const setExternalNames = values => async (dispatch, getState, api) => {
	await api.put(`/people/setExternalNames`, values);
	toast.success(`External names for ${values.length} people updated`);
	return true;
};

export const parsePlayerList = data => async (dispatch, getState, api) => {
	const res = await api.post(`/people/parsePlayerList`, data);
	return res.data;
};

export const fetchPersonImageCard = (person, data) => async (dispatch, getState, api) => {
	const res = await api.post(`/people/${person}/getImageCard`, data);
	return res.data;
};
export const postPersonImageCard = (person, data) => async (dispatch, getState, api) => {
	const res = await api.post(`/people/${person}/postImageCard`, data);
	if (res.data) {
		toast.success("Image Posted");
	}
	return res.data;
};
