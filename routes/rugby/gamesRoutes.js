const mongoose = require("mongoose");
const collectionName = "games";

//Models
const Game = mongoose.model(collectionName);
const Team = mongoose.model("teams");

//Controllers
const GameController = require("../../controllers/rugby/gamesController");

//Middleware
const requireAdmin = require("../../middlewares/requireAdmin");

module.exports = app => {
	//Getters
	app.get("/api/games/:ids", GameController.getGames);
	app.get("/api/games", GameController.getList);

	//Putters
	app.put("/api/games/:_id/basics", requireAdmin, GameController.updateGameBasics);
	app.put("/api/games/:_id/pregame", requireAdmin, GameController.setPregameSquads);

	//Post
	app.post("/api/games", requireAdmin, async (req, res) => {
		const { data } = req.body;

		//Add ground
		if (!data._ground) {
			const opposition = await Team.findById(data._opposition);
			data._ground = opposition._ground;
		}

		const game = await new Game({
			...data,

			//Create Slug
			slug: Game.generateSlug(data._opposition, data.date),

			//Convert DOB to date format
			date: new Date(data.date)
		});

		await game.save();

		res.send(game);
	});
};
