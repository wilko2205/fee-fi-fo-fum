import React from "react";
import App from "./App";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import GameList from "./pages/GameList";
import PersonPage from "./pages/PersonPage";
import SquadListPage from "./pages/SquadListPage";
import NewsListPage from "./pages/NewsListPage";
import NewsPostPage from "./pages/NewsPostPage";
import NotFoundPage from "./pages/NotFoundPage";
import { Redirect } from "react-router-dom";

const TestComponent = ({ staticContext }) => {
	return <Redirect />;
};

const gameRoutes = [
	{
		...GameList,
		path: "/games/results/:year/:teamType"
	},
	{
		...GameList,
		path: "/games/results/:year"
	},
	{
		...GameList,
		path: "/games/results"
	},
	{
		...GameList,
		path: "/games/fixtures/:teamType"
	},
	{
		...GameList,
		path: "/games/fixtures"
	},
	{
		...GamePage,
		path: "/games/:slug"
	},
	{
		component: () => <Redirect to="/games/fixtures" />,
		path: "/games",
		exact: true
	}
];

const personRoutes = [
	{
		...PersonPage,
		path: "/players/:slug"
	},
	{
		...PersonPage,
		path: "/coaches/:slug"
	}
];

const squadRoutes = [
	{
		...SquadListPage,
		path: "/squads"
	}
];

const newsRoutes = [
	{
		...NewsPostPage,
		path: "/news/post/:slug"
	},
	{
		...NewsListPage,
		path: "/news/:category/:page"
	},
	{
		...NewsListPage,
		path: "/news/:category"
	},
	{
		component: () => <Redirect to="/news/all" />,
		path: "/news",
		exact: true
	}
];

export default [
	{
		...App,
		routes: [
			...gameRoutes,
			...personRoutes,
			...squadRoutes,
			...newsRoutes,
			{
				component: TestComponent,
				path: "/abc",
				exact: true
			},
			{
				...HomePage,
				path: "/",
				exact: true
			},
			{
				...NotFoundPage,
				path: "/"
			}
		]
	}
];
