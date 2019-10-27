//Mongoose
import mongoose from "mongoose";
const NeutralGame = mongoose.model("neutralGames");
const Team = mongoose.model("teams");

//Modules
import _ from "lodash";

//Constants
const { localTeam } = require("../../config/keys");

//Helpers
import { parseExternalGame } from "~/helpers/gameHelper";
import { crawlFixtures } from "./gamesController";

function queryGenerator(year) {
	return {
		date: { $gte: `${year}-01-01`, $lte: `${Number(year) + 1}-01-01` }
	};
}

//Getters
export async function getList(req, res) {
	const { year } = req.params;
	const games = await NeutralGame.find(queryGenerator(year));
	res.send(_.keyBy(games, "_id"));
}

export async function getListFromId(req, res) {
	const { _id } = req.params;
	const game = await NeutralGame.findById(_id);
	if (game) {
		const year = new Date(game.date).getFullYear();
		const games = await NeutralGame.find(queryGenerator(year));
		res.send({ year, games: _.keyBy(games, "_id") });
	} else {
		res.status(404).send(`Game with id '${_id}' not found`);
	}
}

export async function getYears(req, res) {
	const aggregatedYears = await NeutralGame.aggregate([
		{ $project: { _id: 0, year: { $year: "$date" } } },
		{ $group: { _id: "$year" } }
	]);
	const years = aggregatedYears
		.map(({ _id }) => _id)
		.sort()
		.reverse();
	res.send(years);
}

async function getUpdatedNeutralGames(ids, res) {
	//To be called after post/put methods
	const games = await NeutralGame.find({ _id: { $in: ids } }).lean();
	res.send(_.keyBy(games, "_id"));
}

//Setters
export async function createNeutralGames(req, res) {
	const bulkOperation = _.map(req.body, (document, id) => {
		return {
			insertOne: { document }
		};
	});
	const newGames = await NeutralGame.bulkWrite(bulkOperation);
	await getUpdatedNeutralGames(_.values(newGames.insertedIds), res);
}

export async function updateGames(req, res) {
	const bulkOperation = _.map(req.body, (data, id) => {
		return {
			updateOne: {
				filter: { _id: id },
				update: data
			}
		};
	});
	if (bulkOperation.length > 0) {
		await NeutralGame.bulkWrite(bulkOperation);
		await getUpdatedNeutralGames(Object.keys(req.body), res);
	} else {
		res.send({});
	}
}

export async function deleteGame(req, res) {
	const { _id } = req.params;
	await NeutralGame.deleteOne({ _id: req.params });
	res.send(_id);
}

//External Getters
export async function crawl(req, res) {
	const games = await crawlFixtures();
	const localTeamObject = await Team.findById(localTeam, "name.short");
	const filteredGames = _.chain(games)
		.reject(g => [g.home, g.away].indexOf(localTeamObject.name.short) > -1)
		.map(g => ({ ...g, externalSite: "SL", tv: undefined, round: undefined }))
		.value();
	res.send(filteredGames);
}

export async function crawlAndUpdate(req, res) {
	const games = await NeutralGame.find(
		{
			externalSync: true,
			externalId: { $ne: null },
			date: {
				$gt: new Date().addDays(-30),
				$lte: new Date().addHours(-2)
			},
			$or: [{ homePoints: null }, { awayPoints: null }]
		},
		"_id externalId _competition"
	).populate({
		path: "_competition",
		select: "_parentCompetition externalCompId externalDivId externalReportPage",
		populate: {
			path: "_parentCompetition",
			select: "webcrawlFormat webcrawlUrl"
		}
	});

	const values = {};

	for (const game of games) {
		const results = await parseExternalGame(game, true);
		if (results) {
			values[game._id] = results;
		}
	}
	await updateGames({ body: values }, res);
}
