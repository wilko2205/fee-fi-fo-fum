module.exports = app => {
	require("./city")(app);
	require("./competition")(app);
	require("./country")(app);
	require("./ground")(app);
	require("./team")(app);
};
