//Modules
import _ from "lodash";

//Mongoose
import mongoose from "mongoose";
const Competition = mongoose.model("competitions");
const CompetitionSegment = mongoose.model("competitionSegments");

//Helpers
async function validateCompetition(_id, res) {
	if (!_id) {
		res.status(400).send(`No id provided`);
	}

	const competition = await Competition.findById(_id);
	if (competition) {
		return competition;
	} else {
		res.status(404).send(`No competition found with id ${_id}`);
		return false;
	}
}

export async function getCompetitions(req, res) {
	const competitions = await Competition.find({}).lean();
	res.send(_.keyBy(competitions, "_id"));
}

export async function getSegments(req, res) {
	const segments = await CompetitionSegment.find({}).populate("_parentCompetition");
	res.send(_.keyBy(segments, "_id"));
}
export async function createCompetition(req, res) {
	const competition = new Competition(req.body);
	await competition.save();
	const savedCompetition = await Competition.findById(competition._id).lean();
	res.send(savedCompetition);
}

export async function updateCompetition(req, res) {
	const { _id } = req.params;
	const competition = await validateCompetition(_id, res);
	if (competition) {
		await competition.updateOne(req.body);
		const updatedCompetition = await Competition.findById(_id);
		res.send(updatedCompetition);
	}
}

export async function deleteCompetition(req, res) {
	const { _id } = req.params;
	const competition = await validateCompetition(_id, res);
	if (competition) {
		const segments = await CompetitionSegment.find({ _parentCompetition: _id }, "name");

		if (segments.length) {
			res.status(409).send({
				error: `Competition cannot be deleted as ${segments.length} Competition ${
					segments.length == 1 ? "segment depends" : "segments depend"
				} on it`,
				toLog: { segments }
			});
		} else {
			await competition.remove();
			res.send({});
		}
	}
}
