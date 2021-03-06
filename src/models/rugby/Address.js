const mongoose = require("mongoose");
const { Schema } = mongoose;
const { mongooseDebug } = require("~/middlewares/mongooseDebug");

const addressSchema = new Schema({
	street: { type: String, required: true },
	street2: { type: String, default: null },
	_city: { type: Schema.Types.ObjectId, ref: "cities", required: true },
	postcode: { type: String, required: true },
	googlePlaceId: { type: String, required: true }
});

mongooseDebug(addressSchema);

module.exports = addressSchema;
