import _ from "lodash";
import { parse } from "node-html-parser";
import axios from "axios";
import PlayerStatsHelper from "~/client/helperClasses/PlayerStatsHelper";
import { iftttKey } from "~/config/keys";
const playerStatTypes = require("~/constants/playerStatTypes");

export function validateGameDate(game, listType, year = null) {
	const now = new Date();

	if (listType === "results") {
		return game.date <= now && game.date.getFullYear() == year;
	} else {
		return game.date > now;
	}
}

export function fixDates(games) {
	return _.mapValues(games, game => {
		if (game) {
			game.date = new Date(game.date);
		}
		return game;
	});
}

export async function postToIfttt(text, image) {
	let event = "facebook";
	const data = {
		value1: text
	};

	if (image) {
		event += "_with_photo";
		data.value2 = image;
	}
	const res = await axios.post(
		`https://maker.ifttt.com/trigger/${event}/with/key/${iftttKey}`,
		data
	);
	return res;
}

function getAdjacentGame(id, gameList, next) {
	const { _teamType, date } = gameList[id];
	const list = _.chain(gameList)
		.filter(g => g._teamType == _teamType)
		.filter(g => (next ? g.date > date : g.date < date))
		.orderBy(["date"], [next ? "asc" : "desc"])
		.map(g => g._id)
		.value();
	return list.length ? list[0] : false;
}

export function getLastGame(id, gameList) {
	return getAdjacentGame(id, gameList, false);
}

export function getNextGame(id, gameList) {
	return getAdjacentGame(id, gameList, true);
}

export function getGameStarStats(game, _player, overwriteThreshold = {}) {
	const statTypes = _.chain(playerStatTypes)
		.cloneDeep()
		.map((obj, key) => {
			if (overwriteThreshold[key] !== undefined) {
				obj.requiredForGameStar = overwriteThreshold[key];
			}

			return {
				key,
				...obj
			};
		})
		.filter(s => s.requiredForGameStar !== null)
		.value();

	const processedStats = PlayerStatsHelper.processStats(
		game.playerStats.find(p => p._player == _player).stats
	);
	const values = _.chain(statTypes)
		.map(({ key, moreIsBetter, requiredForGameStar }) => {
			let isValid;

			const value = processedStats[key];

			//Check basic threshold
			if (value) {
				isValid = moreIsBetter
					? value >= requiredForGameStar
					: value <= requiredForGameStar;
			}

			//Check for exceptions
			if ((key == "TS" && processedStats.TK < 25) || (key == "KS" && processedStats.G < 4)) {
				isValid = false;
			}

			if (isValid) {
				let starPoints;
				if (moreIsBetter) {
					//Here we assume requiredForGameStar will never be 0
					starPoints = value / requiredForGameStar;
				} else if (value) {
					//If value is not 0, then a simple divide
					starPoints = requiredForGameStar / value;
				} else {
					starPoints = requiredForGameStar + 1;
				}
				return { key, value, starPoints };
			}
		})
		.filter(_.identity)
		.value();

	if (_player == game._motm) {
		values.push({ key: "MOTM", starPoints: 3, value: null });
	}
	if (_player == game._fan_motm) {
		values.push({ key: "FAN_MOTM", starPoints: 3, value: null });
	}

	return values.map(({ key, value, starPoints }) => {
		let isBest = false;
		let valueString;
		let label;

		if (key == "MOTM") {
			valueString = "Man";
			label = "of the Match";
		} else if (key == "FAN_MOTM") {
			valueString = "Fans'";
			label = "Man of the Match";
		} else {
			//Get Value String
			switch (key) {
				case "TS":
					if (!values.find(v => v.key == "TK")) {
						const { TK, MI } = game.playerStats.find(p => p._player == _player).stats;
						//Show Tackles
						valueString =
							PlayerStatsHelper.toString(key, value) + ` (${TK}/${TK + MI})`;

						//Factor Total tackles into starPoints
						starPoints = value / 100 + TK / 25;
					}
					break;
				case "M":
					valueString = value;
					break;
			}
			if (!valueString) {
				valueString = PlayerStatsHelper.toString(key, value);
			}

			//Label
			switch (key) {
				case "TS":
					label = "Tackling";
					break;
				case "KS":
					label = "Kicking";
					break;
				case "AG":
					label = "Avg Gain";
					break;
				default:
					label = playerStatTypes[key][value === 1 ? "singular" : "plural"];
					break;
			}

			//Check for 'best'
			const { moreIsBetter } = playerStatTypes[key];
			const allValues = game.playerStats.map(p => p.stats[key]);
			const bestValue = moreIsBetter ? _.max(allValues) : _.min(allValues);
			isBest = value === bestValue;
		}

		return { key, value: valueString, label, isBest, starPoints };
	});
}

export function convertTeamToSelect(
	game,
	teamList,
	singleTeam = false,
	includeNone = false,
	fromPregame = false
) {
	function listToOptions(_player, team) {
		const p = _.find(game.eligiblePlayers[team], p => _player == p._player._id);
		const numberStr = p.number ? `${p.number}. ` : "";
		const label = numberStr + p._player.name.full;
		return { label, value: _player };
	}

	function pregameSort(p, team) {
		const player = _.find(game.eligiblePlayers[team], eP => eP._player._id == p);
		return player ? player.number : 999;
	}

	let options;
	if (fromPregame) {
		if (singleTeam) {
			options = _.chain(game.pregameSquads)
				.find(p => p._team == singleTeam)
				.sortBy(p => pregameSort(p, singleTeam))
				.map(p => listToOptions(p, singleTeam))
				.value();
		} else {
			options = _.chain(game.pregameSquads)
				.groupBy("_team")
				.mapValues(s => s[0].squad)
				.map((squad, team) => {
					const options = _.chain(squad)
						.sortBy(p => pregameSort(p, team))
						.map(p => listToOptions(p, team))
						.value();
					return { label: teamList[team].name.short, options };
				})
				.value();
		}
	} else {
		if (singleTeam) {
			options = _.chain(game.playerStats)
				.filter(p => p._team == singleTeam)
				.sortBy("position")
				.map(p => listToOptions(p._player, singleTeam))
				.value();
		} else {
			options = _.chain(game.playerStats)
				.groupBy("_team")
				.map((squad, team) => {
					const options = _.chain(squad)
						.sortBy("position")
						.map(p => listToOptions(p._player, team))
						.value();
					return { label: teamList[team].name.short, options };
				})
				.value();
		}
	}
	if (includeNone) {
		return [{ label: "None", value: "" }, ...options];
	} else {
		return options;
	}
}

export async function parseExternalGame(game, justGetScores = false, includeScoringStats = true) {
	//JSON-ify the game object
	game = JSON.parse(JSON.stringify(game));

	//Get Data
	const id = game.externalId;
	const { externalReportPage, instance, _parentCompetition } = game._competition;
	const { webcrawlFormat, webcrawlUrl } = _parentCompetition;
	const nameRegex = new RegExp(/[^A-Za-z\s]/, "gi");

	//Build URL
	const url = `${webcrawlUrl}${externalReportPage}/${id}`;

	//Load HTML
	const { data } = await axios.get(url);
	const html = parse(data);

	//Get Teams
	const teams = _.chain(game.playerStats)
		.map("_team")
		.uniq()
		.map(team => {
			let isHome = team != game._opposition;
			if (game.isAway) {
				isHome = !isHome;
			}
			return [isHome ? "home" : "away", team];
		})
		.fromPairs()
		.value();

	if (justGetScores) {
		let results;
		if (webcrawlFormat == "SL") {
			results = html
				.querySelectorAll(".matchreportheader .col-2 h2")
				.map(e => Number(e.text));
		} else if (webcrawlFormat == "RFL") {
			results = html
				.querySelector(".overview h3")
				.text.match(/\d+/g)
				.map(Number);
		}

		return {
			homePoints: results[0],
			awayPoints: results[1]
		};
	} else {
		//Get Stat Types
		const statTypeIndexes = _.chain(playerStatTypes)
			.map((stat, key) => ({ key, ...stat }))
			//Remove aggregate stats
			.filter("storedInDatabase")
			//If includeScoringStats is false, only include non-scoring stats
			.filter(s => includeScoringStats || !s.scoreOnly || s.key == "MG")
			//If the competition instance is defined as score only, only include scoring-stats
			.filter(s => !instance.scoreOnly || s.scoreOnly)
			//Return the keys, swap PK and CN for G
			.map(({ key }) => (["PK", "CN"].indexOf(key) > -1 ? "G" : key))
			//Remove duplicate Gs
			.uniq()
			//Convert back to object
			.map(key => [key, null])
			.fromPairs()
			.value();

		//Convert to object
		const results = {};
		switch (webcrawlFormat) {
			case "SL":
				for (const ha in teams) {
					const team = teams[ha];

					//Create nested object
					results[team] = {};

					//Get Table Element
					const table = html.querySelector(`table.${ha}-team`);

					//Get column index. We go nth from the right due to inconsistent colspan
					const tableHeaderCells = table.querySelectorAll("thead th");
					const tableHeaderCellCount = tableHeaderCells.length;
					for (const stat in statTypeIndexes) {
						for (let i = 1; i <= tableHeaderCellCount; i++) {
							if (
								tableHeaderCells[tableHeaderCellCount - i].innerHTML.trim() == stat
							) {
								statTypeIndexes[stat] = i;
								break;
							}
						}
					}

					//Loop Players
					const playerRows = table.querySelectorAll("tbody tr");
					for (const row of playerRows) {
						const rowCells = row.querySelectorAll("td");
						const rowCellCount = rowCells.length;

						if (!rowCellCount) {
							continue;
						}

						const name = rowCells[1].innerHTML.trim();
						results[team][name] = {
							stats: {}
						};
						for (const stat in statTypeIndexes) {
							const index = statTypeIndexes[stat];
							const value = rowCells[rowCellCount - index].innerHTML.replace(
								/\D+/gi,
								""
							);
							results[team][name].stats[stat] = Number(value || 0);
						}
					}
				}
				break;
			case "RFL":
				//This currently just loads scores, as there are no opta stats on the rfl site
				for (const ha in teams) {
					const team = teams[ha];

					//Create nested object
					results[team] = {};

					//Get Rows
					const lists = html.querySelectorAll(".tryScorersRow ul");
					const rows = lists[ha == "home" ? 0 : 1].querySelectorAll("li");
					for (const row of rows) {
						const title = row.querySelector("h4 span");
						if (title) {
							let stat;
							//Get Key From Text
							switch (title.rawText.trim()) {
								case "Tries":
									stat = "T";
									break;
								case "Goals":
									stat = "G";
									break;
								case "Drop Goals":
									stat = "DG";
									break;
							}
							const statList = row.text
								.replace(new RegExp(`^${title.rawText.trim()}`, "gi"), "")
								.trim();
							if (stat && statList.length) {
								statList.split(",").forEach(s => {
									let [name, count] = s.split(/(?=\(\d)/);

									//Get Name
									name = name.trim();
									if (!name) {
										return true;
									}

									//Get Total
									let total;
									if (count) {
										total = Number(count.replace(/\D/gi, ""));
									} else {
										total = 1;
									}

									if (!results[team][name]) {
										results[team][name] = { stats: {} };
									}
									results[team][name].stats[stat] = total;
								});
							}
						}
					}
				}
				break;
			default:
				return false;
		}

		//Process Names
		_.each(results, teamList => {
			return _.each(teamList, (obj, name) => {
				obj.name = name.toUpperCase().replace(nameRegex, "");
			});
		});
		const playersToName = game.playerStats.map(({ _player, _team }) => ({
			_id: _player._id,
			name: (_player.externalName || _player.name.full).toUpperCase().replace(nameRegex, ""),
			_team,
			matched: false
		}));

		//Direct Matches
		_.each(results, (players, _team) => {
			_.each(players, player => {
				const result = _.chain(playersToName)
					.filter(p => p._team == _team)
					.reject("matched")
					.find(p => p.name == player.name)
					.value();

				if (result) {
					result.matched = true;
					player._player = result._id;
					player.match = "exact";
				}
			});
		});

		//Close Matches
		const noDirectMatches = _.reject(playersToName, "matched");
		if (noDirectMatches.length) {
			_.each(results, (players, _team) => {
				_.chain(players)
					.each(player => {
						if (player._player) {
							return true;
						}
						const name = player.name.split(" ").pop();
						const result = _.chain(playersToName)
							.filter(p => p._team == _team)
							.reject("matched")
							.filter(p => p.name.split(" ").pop() == name)
							.value();

						if (result.length === 1) {
							result[0].matched = true;
							player._player = result[0]._id;
							player.match = "partial";
						}
					})
					.value();
			});
		}

		return { results, playersToName, url };
	}
}
