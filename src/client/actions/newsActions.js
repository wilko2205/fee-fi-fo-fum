import {
	DELETE_POST,
	FETCH_NEWS_POST,
	FETCH_NEWS_POST_LEGACY,
	FETCH_POST_LIST,
	UPDATE_POST
} from "./types";
import { toast } from "react-toastify";

export const fetchNewsPost = id => async (dispatch, getState, api) => {
	let payload;
	const res = await api.get(`/news/post/${id}`).catch(e => {
		switch (e.response.status) {
			case 404:
				payload = false;
				break;
		}
	});

	if (payload === undefined) {
		payload = res.data;
	}

	dispatch({ type: FETCH_NEWS_POST, payload });
};

export const fetchPostList = () => async (dispatch, getState, api) => {
	const res = await api.get(`/news/posts`);
	dispatch({ type: FETCH_POST_LIST, payload: res.data });
};

export const fetchLegacyNewsPost = id => async (dispatch, getState, api) => {
	let payload;
	const res = await api.get(`/news/legacyPost/${id}`).catch(e => {
		switch (e.response.status) {
			case 404:
				payload = false;
		}
	});

	if (payload === undefined) {
		payload = res.data;
	}
	dispatch({ type: FETCH_NEWS_POST_LEGACY, payload, id });
};

export const createNewsPost = values => async (dispatch, getState, api) => {
	const res = await api.post(`/news/post/`, values);
	if (res.data) {
		dispatch({ type: UPDATE_POST, payload: res.data });
		toast.success("Post Created");
		return res.data._id;
	}
};

export const updateNewsPost = (id, values) => async (dispatch, getState, api) => {
	const res = await api.put(`/news/post/${id}`, values);
	if (res.data) {
		dispatch({ type: UPDATE_POST, payload: res.data });
		toast.success("Post updated");
	}
};

export const deleteNewsPost = id => async (dispatch, getState, api) => {
	const res = await api.delete(`/news/post/${id}`);
	if (res.data) {
		await dispatch({ type: DELETE_POST, payload: res.data });
		toast.success("Post deleted");
		return true;
	}
};